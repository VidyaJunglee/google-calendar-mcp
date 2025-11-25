import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { OAuth2Client } from "google-auth-library";
import { CreateEventInput } from "../../tools/registry.js";
import { BaseToolHandler } from "./BaseToolHandler.js";
import { calendar_v3 } from 'googleapis';
import { createTimeObject } from "../utils/datetime.js";
import { validateEventId } from "../../utils/event-id-validator.js";
import { ConflictDetectionService } from "../../services/conflict-detection/index.js";
import { CONFLICT_DETECTION_CONFIG } from "../../services/conflict-detection/config.js";
import { createStructuredResponse, convertConflictsToStructured, createWarningsArray } from "../../utils/response-builder.js";
import { CreateEventResponse, convertGoogleEventToStructured, DuplicateInfo } from "../../types/structured-responses.js";

type EventSchema = calendar_v3.Schema$Event;
type Attendee = calendar_v3.Schema$EventAttendee;

export class CreateEventHandler extends BaseToolHandler {
    private conflictDetectionService: ConflictDetectionService;
    
    constructor() {
        super();
        this.conflictDetectionService = new ConflictDetectionService();
    }
    
    async runTool(args: any, oauth2Client: OAuth2Client): Promise<CallToolResult> {
        const validArgs = args as CreateEventInput;   
        const timezone = args.timeZone || await this.getCalendarTimezone(oauth2Client, validArgs.calendarId);
        const eventToCheck: EventSchema = {
            summary: args.summary,
            description: args.description,
            start: createTimeObject(args.start, timezone),
            end: createTimeObject(args.end, timezone),
            attendees: args.attendees,
            location: args.location,
        };
        
        // Check for conflicts and duplicates
        const conflicts = await this.conflictDetectionService.checkConflicts(
            oauth2Client,
            eventToCheck,
            validArgs.calendarId,
            {
                checkDuplicates: true,
                checkConflicts: true,
                calendarsToCheck: validArgs.calendarsToCheck || [validArgs.calendarId],
                duplicateSimilarityThreshold: validArgs.duplicateSimilarityThreshold || CONFLICT_DETECTION_CONFIG.DEFAULT_DUPLICATE_THRESHOLD
            }
        );
        
        // Block creation if exact or near-exact duplicate found
        const exactDuplicate = conflicts.duplicates.find(
            dup => dup.event.similarity >= CONFLICT_DETECTION_CONFIG.DUPLICATE_THRESHOLDS.BLOCKING
        );
        
        if (exactDuplicate && validArgs.allowDuplicates !== true) {
            const duplicateInfo: DuplicateInfo = {
                event: {
                    id: exactDuplicate.event.id || '',
                    title: exactDuplicate.event.title,
                    start: exactDuplicate.event.start || '',
                    end: exactDuplicate.event.end || '',
                    url: exactDuplicate.event.url,
                    similarity: exactDuplicate.event.similarity
                },
                calendarId: exactDuplicate.calendarId || '',
                suggestion: exactDuplicate.suggestion
            };
            
            // Throw an error that will be handled by MCP SDK
            throw new Error(
                `Duplicate event detected (${Math.round(exactDuplicate.event.similarity * 100)}% similar). ` +
                `Event "${exactDuplicate.event.title}" already exists. ` +
                `To create anyway, set allowDuplicates to true.`
            );
        }
        
        // Create the event
        const event = await this.createEvent(oauth2Client, validArgs);
        
        // Generate structured response with conflict warnings
        const structuredConflicts = convertConflictsToStructured(conflicts);
        const response: CreateEventResponse = {
            event: convertGoogleEventToStructured(event, validArgs.calendarId),
            conflicts: structuredConflicts.conflicts,
            duplicates: structuredConflicts.duplicates,
            warnings: createWarningsArray(conflicts)
        };
        
        return createStructuredResponse(response);
    }

    private async createEvent(
        client: OAuth2Client,
        args: CreateEventInput
    ): Promise<EventSchema> {
        try {
            // getCalendar is inherited from BaseToolHandler
            const calendar = this.getCalendar(client);
            
            // Validate custom event ID if provided
            if (args.eventId) {
                validateEventId(args.eventId);
            }
            
            // Use provided timezone or calendar's default timezone
            const timezone = args.timeZone || await this.getCalendarTimezone(client, args.calendarId);

            // --- 1. Ensure Primary User is an Attendee ---
            // Fetch the primary user's email from the OAuth client credentials
            const primaryEmail = (await client.getTokenInfo(client.credentials.access_token as string)).email; 
            const primaryAttendee: Attendee = { email: primaryEmail, self: true };
            
            // Initialize attendees list, ensuring the primary user is always present
            const attendees: Attendee[] = args.attendees || [];
            if (!attendees.some(a => a.email === primaryEmail)) {
                attendees.push(primaryAttendee);
            }
            
            // --- 2. Ensure Meet Link Creation (conferenceData) ---
            const meetCreationRequest: calendar_v3.Schema$ConferenceData = {
                createRequest: {
                    requestId: args.eventId || Date.now().toString(),
                    conferenceSolutionKey: { type: 'hangoutsMeet' }, // Request a Google Meet link
                }
            };
            
            // Determine conferenceData: Use user-provided data with a conferenceId (existing link),
            // otherwise use the request to create a new Meet link.
            let conferenceData: EventSchema['conferenceData'];

            if (args.conferenceData && (args.conferenceData as any).conferenceId) {
                // If user provided existing conference data, use it.
                conferenceData = args.conferenceData;
            } else {
                // Default: Force creation of a new Meet link.
                conferenceData = meetCreationRequest;
            }

            const requestBody: EventSchema = {
                summary: args.summary,
                description: args.description,
                start: createTimeObject(args.start, timezone),
                end: createTimeObject(args.end, timezone),
                attendees: attendees,
                location: args.location,
                colorId: args.colorId,
                reminders: args.reminders,
                recurrence: args.recurrence,
                transparency: args.transparency,
                visibility: args.visibility,
                guestsCanInviteOthers: args.guestsCanInviteOthers,
                guestsCanModify: args.guestsCanModify,
                guestsCanSeeOtherGuests: args.guestsCanSeeOtherGuests,
                anyoneCanAddSelf: args.anyoneCanAddSelf,
                conferenceData: conferenceData, // Use the robust conference data
                extendedProperties: args.extendedProperties,
                attachments: args.attachments,
                source: args.source,
                ...(args.eventId && { id: args.eventId })
            };
            
            const supportsAttachments = args.attachments ? true : undefined;
            
            // --- 3. CRITICAL: Set conferenceDataVersion to 1 in the options ---
            const response = await calendar.events.insert({
                calendarId: args.calendarId,
                requestBody: requestBody,
                sendUpdates: args.sendUpdates,
                conferenceDataVersion: 1, // MUST be 1 to process the createRequest
                ...(supportsAttachments && { supportsAttachments })
            });
            
            if (!response.data) throw new Error('Failed to create event, no data returned');
            return response.data;
        } catch (error: any) {
            // Handle ID conflict errors specifically
            if (error?.code === 409 || error?.response?.status === 409) {
                throw new Error(`Event ID '${args.eventId}' already exists. Please use a different ID.`);
            }
            throw this.handleGoogleApiError(error);
        }
    }
}
