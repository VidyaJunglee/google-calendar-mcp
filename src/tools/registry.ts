import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { BaseToolHandler } from "../handlers/core/BaseToolHandler.js";
import { ALLOWED_EVENT_FIELDS } from "../utils/field-mask-builder.js";
import { parseNaturalDateTime } from "../utils/natural-datetime-parser.js";

// Import all handlers
import { ListCalendarsHandler } from "../handlers/core/ListCalendarsHandler.js";
import { ListEventsHandler } from "../handlers/core/ListEventsHandler.js";
import { SearchEventsHandler } from "../handlers/core/SearchEventsHandler.js";
import { GetEventHandler } from "../handlers/core/GetEventHandler.js";
import { ListColorsHandler } from "../handlers/core/ListColorsHandler.js";
import { CreateEventHandler } from "../handlers/core/CreateEventHandler.js";
import { UpdateEventHandler } from "../handlers/core/UpdateEventHandler.js";
import { DeleteEventHandler } from "../handlers/core/DeleteEventHandler.js";
import { FreeBusyEventHandler } from "../handlers/core/FreeBusyEventHandler.js";
import { GetCurrentTimeHandler } from "../handlers/core/GetCurrentTimeHandler.js";

// Define shared schema fields for reuse
// Note: Event datetime fields (start/end) are NOT shared to avoid $ref generation
// Each tool defines its own inline schemas for these fields

// Auth parameter schemas - required for all tools to fetch tokens from auth_handler
const authParameterSchemas = {
  user_id: z.string().describe("User ID to identify which user's OAuth tokens to fetch"),
  provider: z.enum(['google', 'microsoft']).describe("OAuth provider name (e.g., 'google', 'microsoft')")
};

// Create flexible datetime schema that supports both ISO 8601 and natural language
const createFlexibleDateTimeSchema = (description: string, timezone?: string) => {
  return z.string()
    .transform((val) => {
      // Check if it's already ISO 8601 format
      const isoPattern = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})?)?$/;
      if (isoPattern.test(val)) {
        return val; // Already in correct format
      }
      
      // Parse natural language (use UTC as default if no timezone provided)
      const parsed = parseNaturalDateTime(val, timezone || 'UTC');
      return parsed.datetime;
    })
    .refine((val) => {
      const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(val);
      const withTimezone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/.test(val);
      const withoutTimezone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(val);
      return dateOnly || withTimezone || withoutTimezone;
    }, "Must be ISO 8601 format or natural language like 'today 8pm', 'tomorrow 2:30pm'")
    .describe(description);
};

const timeMinSchema = createFlexibleDateTimeSchema(
  "Start time boundary. Accepts ISO 8601 ('2024-01-01T00:00:00') or natural language ('today 8pm', 'tomorrow 2:30pm'). Uses timeZone parameter or calendar timezone for context."
).optional();

const timeMaxSchema = createFlexibleDateTimeSchema(
  "End time boundary. Accepts ISO 8601 ('2024-01-01T23:59:59') or natural language ('today 11pm', 'tomorrow 5pm'). Uses timeZone parameter or calendar timezone for context."
).optional();

const timeZoneSchema = z.string().optional().describe(
  "Timezone as IANA Time Zone Database name (e.g., America/Los_Angeles). Takes priority over calendar's default timezone. Only used for timezone-naive datetime strings."
);

const fieldsSchema = z.array(z.enum(ALLOWED_EVENT_FIELDS)).optional().describe(
  "Optional array of additional event fields to retrieve. Available fields are strictly validated. Default fields (id, summary, start, end, status, htmlLink, location, attendees) are always included."
);

const privateExtendedPropertySchema = z
  .array(z.string().regex(/^[^=]+=[^=]+$/, "Must be in key=value format"))
  .optional()
  .describe(
    "Filter by private extended properties (key=value). Matches events that have all specified properties."
  );

const sharedExtendedPropertySchema = z
  .array(z.string().regex(/^[^=]+=[^=]+$/, "Must be in key=value format"))
  .optional()
  .describe(
    "Filter by shared extended properties (key=value). Matches events that have all specified properties."
  );

// Define all tool schemas with TypeScript inference
export const ToolSchemas = {
  'list-google-calendar-calendars': z.object({
    ...authParameterSchemas
  }),

  'list-google-calendar-events': z.object({
    ...authParameterSchemas,
    calendarId: z.union([
      z.string().describe(
        "Calendar identifier(s) to query. Accepts calendar IDs (e.g., 'primary', 'user@gmail.com') OR calendar names (e.g., 'Work', 'Personal'). Single calendar: 'primary'. Multiple calendars: array ['Work', 'Personal'] or JSON string '[\"Work\", \"Personal\"]'"
      ),
      z.array(z.string().min(1))
        .min(1, "At least one calendar ID is required")
        .max(50, "Maximum 50 calendars allowed per request")
        .refine(
          (arr) => new Set(arr).size === arr.length,
          "Duplicate calendar IDs are not allowed"
        )
        .describe("Array of calendar IDs to query events from (max 50, no duplicates)")
    ]),
    timeMin: timeMinSchema,
    timeMax: timeMaxSchema,
    timeZone: timeZoneSchema,
    fields: fieldsSchema,
    privateExtendedProperty: privateExtendedPropertySchema,
    sharedExtendedProperty: sharedExtendedPropertySchema
  }),
  
  'search-google-calendar-events': z.object({
    ...authParameterSchemas,
    calendarId: z.string().describe("ID of the calendar (use 'primary' for the main calendar)"),
    query: z.string().describe(
      "Free text search query (searches summary, description, location, attendees, etc.)"
    ),
    timeMin: createFlexibleDateTimeSchema(
      "Start time boundary. Accepts ISO 8601 ('2024-01-01T00:00:00') or natural language ('today 8pm', 'tomorrow 2:30pm'). Uses timeZone parameter or calendar timezone for context."
    ),
    timeMax: createFlexibleDateTimeSchema(
      "End time boundary. Accepts ISO 8601 ('2024-01-01T23:59:59') or natural language ('today 11pm', 'tomorrow 5pm'). Uses timeZone parameter or calendar timezone for context."
    ),
    timeZone: timeZoneSchema,
    fields: fieldsSchema,
    privateExtendedProperty: privateExtendedPropertySchema,
    sharedExtendedProperty: sharedExtendedPropertySchema
  }),
  
  'get-google-calendar-event': z.object({
    ...authParameterSchemas,
    calendarId: z.string().describe("ID of the calendar (use 'primary' for the main calendar)"),
    eventId: z.string().describe("ID of the event to retrieve"),
    fields: z.array(z.enum(ALLOWED_EVENT_FIELDS)).optional().describe(
      "Optional array of additional event fields to retrieve. Available fields are strictly validated. Default fields (id, summary, start, end, status, htmlLink, location, attendees) are always included."
    )
  }),

  'list-google-calendar-colors': z.object({
    ...authParameterSchemas
  }),
  
  'create-google-calendar-event': z.object({
    ...authParameterSchemas,
    calendarId: z.string().describe("ID of the calendar (use 'primary' for the main calendar)"),
    eventId: z.string().optional().describe("Optional custom event ID (5-1024 characters, base32hex encoding: lowercase letters a-v and digits 0-9 only). If not provided, Google Calendar will generate one."),
    summary: z.string().describe("Title of the event"),
    description: z.string().optional().describe("Description/notes for the event"),
    start: createFlexibleDateTimeSchema(
      "Event start time. Accepts ISO 8601 ('2025-01-01T10:00:00') or natural language ('today 10am', 'tomorrow 2pm'). For all-day events use date only ('2025-01-01' or 'today')."
    ),
    end: createFlexibleDateTimeSchema(
      "Event end time. Accepts ISO 8601 ('2025-01-01T11:00:00') or natural language ('today 11am', 'tomorrow 3pm'). For all-day events use next day ('2025-01-02' or 'tomorrow')."
    ),
    timeZone: z.string().optional().describe(
      "Timezone as IANA Time Zone Database name (e.g., America/Los_Angeles). Takes priority over calendar's default timezone. Only used for timezone-naive datetime strings."
    ),
    location: z.string().optional().describe("Location of the event"),
    attendees: z.array(z.object({
      email: z.string().email().describe("Email address of the attendee"),
      displayName: z.string().optional().describe("Display name of the attendee"),
      optional: z.boolean().optional().describe("Whether this is an optional attendee"),
      responseStatus: z.enum(["needsAction", "declined", "tentative", "accepted"]).optional().describe("Attendee's response status"),
      comment: z.string().optional().describe("Attendee's response comment"),
      additionalGuests: z.number().int().min(0).optional().describe("Number of additional guests the attendee is bringing")
    })).optional().describe("List of event attendees with their details"),
    colorId: z.string().optional().describe(
      "Color ID for the event (use list-colors to see available IDs)"
    ),
    reminders: z.object({
      useDefault: z.boolean().describe("Whether to use the default reminders"),
      overrides: z.array(z.object({
        method: z.enum(["email", "popup"]).default("popup").describe("Reminder method"),
        minutes: z.number().describe("Minutes before the event to trigger the reminder")
      }).partial({ method: true })).optional().describe("Custom reminders")
    }).describe("Reminder settings for the event").optional(),
    recurrence: z.array(z.string()).optional().describe(
      "Recurrence rules in RFC5545 format (e.g., [\"RRULE:FREQ=WEEKLY;COUNT=5\"])"
    ),
    transparency: z.enum(["opaque", "transparent"]).optional().describe(
      "Whether the event blocks time on the calendar. 'opaque' means busy, 'transparent' means free."
    ),
    visibility: z.enum(["default", "public", "private", "confidential"]).optional().describe(
      "Visibility of the event. Use 'public' for public events, 'private' for private events visible to attendees."
    ),
    guestsCanInviteOthers: z.boolean().optional().describe(
      "Whether attendees can invite others to the event. Default is true."
    ),
    guestsCanModify: z.boolean().optional().describe(
      "Whether attendees can modify the event. Default is false."
    ),
    guestsCanSeeOtherGuests: z.boolean().optional().describe(
      "Whether attendees can see the list of other attendees. Default is true."
    ),
    anyoneCanAddSelf: z.boolean().optional().describe(
      "Whether anyone can add themselves to the event. Default is false."
    ),
    sendUpdates: z.enum(["all", "externalOnly", "none"]).optional().describe(
      "Whether to send notifications about the event creation. 'all' sends to all guests, 'externalOnly' to non-Google Calendar users only, 'none' sends no notifications."
    ),
    conferenceData: z.object({
      createRequest: z.object({
        requestId: z.string().describe("Client-generated unique ID for this request to ensure idempotency"),
        conferenceSolutionKey: z.object({
          type: z.enum(["hangoutsMeet", "eventHangout", "eventNamedHangout", "addOn"]).describe("Conference solution type")
        }).describe("Conference solution to create")
      }).describe("Request to generate a new conference")
    }).optional().describe(
      "Conference properties for the event. Use createRequest to add a new conference."
    ),
    extendedProperties: z.object({
      private: z.record(z.string()).optional().describe(
        "Properties private to the application. Keys can have max 44 chars, values max 1024 chars."
      ),
      shared: z.record(z.string()).optional().describe(
        "Properties visible to all attendees. Keys can have max 44 chars, values max 1024 chars."
      )
    }).optional().describe(
      "Extended properties for storing application-specific data. Max 300 properties totaling 32KB."
    ),
    attachments: z.array(z.object({
      fileUrl: z.string().describe("URL of the attached file"),
      title: z.string().optional().describe("Title of the attachment"),
      mimeType: z.string().optional().describe("MIME type of the attachment"),
      iconLink: z.string().optional().describe("URL of the icon for the attachment"),
      fileId: z.string().optional().describe("ID of the attached file in Google Drive")
    })).optional().describe(
      "File attachments for the event. Requires calendar to support attachments."
    ),
    source: z.object({
      url: z.string().describe("URL of the source"),
      title: z.string().describe("Title of the source")
    }).optional().describe(
      "Source of the event, such as a web page or email message."
    ),
    calendarsToCheck: z.array(z.string()).optional().describe(
      "List of calendar IDs to check for conflicts (defaults to just the target calendar)"
    ),
    duplicateSimilarityThreshold: z.number().min(0).max(1).optional().describe(
      "Threshold for duplicate detection (0-1, default: 0.7). Events with similarity above this are flagged as potential duplicates"
    ),
    allowDuplicates: z.boolean().optional().describe(
      "If true, allows creation even when exact duplicates are detected (similarity >= 0.95). Default is false which blocks duplicate creation"
    )
  }),
  
  'update-google-calendar-event': z.object({
    ...authParameterSchemas,
    calendarId: z.string().describe("ID of the calendar (use 'primary' for the main calendar)"),
    eventId: z.string().describe("ID of the event to update"),
    summary: z.string().optional().describe("Updated title of the event"),
    description: z.string().optional().describe("Updated description/notes"),
    start: createFlexibleDateTimeSchema(
      "Updated start time. Accepts ISO 8601 ('2025-01-01T10:00:00') or natural language ('today 10am', 'tomorrow 2pm'). For all-day events use date only ('2025-01-01' or 'today')."
    ).optional(),
    end: createFlexibleDateTimeSchema(
      "Updated end time. Accepts ISO 8601 ('2025-01-01T11:00:00') or natural language ('today 11am', 'tomorrow 3pm'). For all-day events use next day ('2025-01-02' or 'tomorrow')."
    ).optional(),
    timeZone: z.string().optional().describe("Updated timezone as IANA Time Zone Database name. If not provided, uses the calendar's default timezone."),
    location: z.string().optional().describe("Updated location"),
    attendees: z.array(z.object({
      email: z.string().email().describe("Email address of the attendee")
    })).optional().describe("Updated attendee list"),
    colorId: z.string().optional().describe("Updated color ID"),
    reminders: z.object({
      useDefault: z.boolean().describe("Whether to use the default reminders"),
      overrides: z.array(z.object({
        method: z.enum(["email", "popup"]).default("popup").describe("Reminder method"),
        minutes: z.number().describe("Minutes before the event to trigger the reminder")
      }).partial({ method: true })).optional().describe("Custom reminders")
    }).describe("Reminder settings for the event").optional(),
    recurrence: z.array(z.string()).optional().describe("Updated recurrence rules"),
    sendUpdates: z.enum(["all", "externalOnly", "none"]).default("all").describe(
      "Whether to send update notifications"
    ),
    modificationScope: z.enum(["thisAndFollowing", "all", "thisEventOnly"]).optional().describe(
      "Scope for recurring event modifications"
    ),
    originalStartTime: createFlexibleDateTimeSchema(
      "Original start time. Accepts ISO 8601 ('2024-01-01T10:00:00') or natural language ('today 10am', 'tomorrow 2pm'). Required when modificationScope is 'thisEventOnly'."
    ).optional(),
    futureStartDate: createFlexibleDateTimeSchema(
      "Start date for future instances. Accepts ISO 8601 ('2024-01-01T10:00:00') or natural language ('today 10am', 'tomorrow 2pm'). Required when modificationScope is 'thisAndFollowing'."
    ).optional(),
    checkConflicts: z.boolean().optional().describe(
      "Whether to check for conflicts when updating (default: true when changing time)"
    ),
    calendarsToCheck: z.array(z.string()).optional().describe(
      "List of calendar IDs to check for conflicts (defaults to just the target calendar)"
    ),
    conferenceData: z.object({
      createRequest: z.object({
        requestId: z.string().describe("Client-generated unique ID for this request to ensure idempotency"),
        conferenceSolutionKey: z.object({
          type: z.enum(["hangoutsMeet", "eventHangout", "eventNamedHangout", "addOn"]).describe("Conference solution type")
        }).describe("Conference solution to create")
      }).describe("Request to generate a new conference for this event")
    }).optional().describe("Conference properties for the event. Used to add or update Google Meet links."),
    transparency: z.enum(["opaque", "transparent"]).optional().describe(
      "Whether the event blocks time on the calendar. 'opaque' means busy, 'transparent' means available"
    ),
    visibility: z.enum(["default", "public", "private", "confidential"]).optional().describe(
      "Visibility of the event"
    ),
    guestsCanInviteOthers: z.boolean().optional().describe(
      "Whether attendees other than the organizer can invite others"
    ),
    guestsCanModify: z.boolean().optional().describe(
      "Whether attendees other than the organizer can modify the event"
    ),
    guestsCanSeeOtherGuests: z.boolean().optional().describe(
      "Whether attendees other than the organizer can see who the event's attendees are"
    ),
    anyoneCanAddSelf: z.boolean().optional().describe(
      "Whether anyone can add themselves to the event"
    ),
    extendedProperties: z.object({
      private: z.record(z.string()).optional().describe("Properties that are private to the creator's app"),
      shared: z.record(z.string()).optional().describe("Properties that are shared between all apps")
    }).partial().optional().describe("Extended properties for the event"),
    attachments: z.array(z.object({
      fileUrl: z.string().url().describe("URL link to the attachment"),
      title: z.string().describe("Title of the attachment"),
      mimeType: z.string().optional().describe("MIME type of the attachment"),
      iconLink: z.string().optional().describe("URL link to the attachment's icon"),
      fileId: z.string().optional().describe("ID of the attached Google Drive file")
    })).optional().describe("File attachments for the event")
  }).refine(
    (data) => {
      // Require originalStartTime when modificationScope is 'thisEventOnly'
      if (data.modificationScope === 'thisEventOnly' && !data.originalStartTime) {
        return false;
      }
      return true;
    },
    {
      message: "originalStartTime is required when modificationScope is 'thisEventOnly'",
      path: ["originalStartTime"]
    }
  ).refine(
    (data) => {
      // Require futureStartDate when modificationScope is 'thisAndFollowing'
      if (data.modificationScope === 'thisAndFollowing' && !data.futureStartDate) {
        return false;
      }
      return true;
    },
    {
      message: "futureStartDate is required when modificationScope is 'thisAndFollowing'",
      path: ["futureStartDate"]
    }
  ).refine(
    (data) => {
      // Ensure futureStartDate is in the future when provided
      if (data.futureStartDate) {
        const futureDate = new Date(data.futureStartDate);
        const now = new Date();
        return futureDate > now;
      }
      return true;
    },
    {
      message: "futureStartDate must be in the future",
      path: ["futureStartDate"]
    }
  ),
  
  'delete-google-calendar-event': z.object({
    ...authParameterSchemas,
    calendarId: z.string().describe("ID of the calendar (use 'primary' for the main calendar)"),
    eventId: z.string().describe("ID of the event to delete"),
    sendUpdates: z.enum(["all", "externalOnly", "none"]).default("all").describe(
      "Whether to send cancellation notifications"
    )
  }),
  
  'get-google-calendar-freebusy': z.object({
    ...authParameterSchemas,
    calendars: z.array(z.object({
      id: z.string().describe("ID of the calendar (use 'primary' for the main calendar)")
    })).describe(
      "List of calendars and/or groups to query for free/busy information"
    ),
    timeMin: createFlexibleDateTimeSchema(
      "Start time boundary. Accepts ISO 8601 ('2024-01-01T00:00:00') or natural language ('today 8pm', 'tomorrow 2:30pm'). Uses timeZone parameter or calendar timezone for context."
    ),
    timeMax: createFlexibleDateTimeSchema(
      "End time boundary. Accepts ISO 8601 ('2024-01-01T23:59:59') or natural language ('today 11pm', 'tomorrow 5pm'). Uses timeZone parameter or calendar timezone for context."
    ),
    timeZone: timeZoneSchema,
    groupExpansionMax: z.number().int().max(100).optional().describe(
      "Maximum number of calendars to expand per group (max 100)"
    ),
    calendarExpansionMax: z.number().int().max(50).optional().describe(
      "Maximum number of calendars to expand (max 50)"
    )
  }),
  
  'get-google-calendar-current-time': z.object({
    ...authParameterSchemas,
    timeZone: z.string().optional().describe(
      "Optional IANA timezone (e.g., 'America/Los_Angeles', 'Europe/London', 'UTC'). If not provided, uses the primary Google Calendar's default timezone."
    )
  })
} as const;

// Generate TypeScript types from schemas
export type ToolInputs = {
  [K in keyof typeof ToolSchemas]: z.infer<typeof ToolSchemas[K]>
};

// Export individual types for convenience
export type ListCalendarsInput = ToolInputs['list-google-calendar-calendars'];
export type ListEventsInput = ToolInputs['list-google-calendar-events'];
export type SearchEventsInput = ToolInputs['search-google-calendar-events'];
export type GetEventInput = ToolInputs['get-google-calendar-event'];
export type ListColorsInput = ToolInputs['list-google-calendar-colors'];
export type CreateEventInput = ToolInputs['create-google-calendar-event'];
export type UpdateEventInput = ToolInputs['update-google-calendar-event'];
export type DeleteEventInput = ToolInputs['delete-google-calendar-event'];
export type GetFreeBusyInput = ToolInputs['get-google-calendar-freebusy'];
export type GetCurrentTimeInput = ToolInputs['get-google-calendar-current-time'];

interface ToolDefinition {
  name: keyof typeof ToolSchemas;
  description: string;
  schema: z.ZodType<any>;
  handler: new () => BaseToolHandler;
  handlerFunction?: (args: any) => Promise<any>;
  customInputSchema?: any; // Custom schema shape for MCP registration (overrides extractSchemaShape)
}


export class ToolRegistry {
  private static extractSchemaShape(schema: z.ZodType<any>): any {
    const schemaAny = schema as any;
    
    // Handle ZodEffects (schemas with .refine())
    if (schemaAny._def && schemaAny._def.typeName === 'ZodEffects') {
      return this.extractSchemaShape(schemaAny._def.schema);
    }
    
    // Handle regular ZodObject
    if ('shape' in schemaAny) {
      return schemaAny.shape;
    }
    
    // Handle other nested structures
    if (schemaAny._def && schemaAny._def.schema) {
      return this.extractSchemaShape(schemaAny._def.schema);
    }
    
    // Fallback to the original approach
    return schemaAny._def?.schema?.shape || schemaAny.shape;
  }

  private static tools: ToolDefinition[] = [
    {
      name: "list-google-calendar-calendars",
      description: "List all available calendars",
      schema: ToolSchemas['list-google-calendar-calendars'],
      handler: ListCalendarsHandler
    },
    {
      name: "list-google-calendar-events",
      description: "List events from one or more calendars. Supports both calendar IDs and calendar names.",
      schema: ToolSchemas['list-google-calendar-events'],
      handler: ListEventsHandler,
      handlerFunction: async (args: ListEventsInput & { calendarId: string | string[] }) => {
        let processedCalendarId: string | string[] = args.calendarId;

        // If it's already an array (native array format), keep as-is (already validated by schema)
        if (Array.isArray(args.calendarId)) {
          processedCalendarId = args.calendarId;
        }
        // Handle JSON string format (double or single-quoted)
        else if (typeof args.calendarId === 'string' && args.calendarId.trim().startsWith('[') && args.calendarId.trim().endsWith(']')) {
          try {
            let jsonString = args.calendarId.trim();

            // Normalize single-quoted JSON-like strings to valid JSON (Python/shell style)
            // Only replace single quotes that are string delimiters (after '[', ',', or before ']', ',')
            // This avoids breaking calendar IDs with apostrophes like "John's Calendar"
            if (jsonString.includes("'")) {
              jsonString = jsonString
                .replace(/\[\s*'/g, '["')           // [' -> ["
                .replace(/'\s*,\s*'/g, '", "')      // ', ' -> ", "
                .replace(/'\s*\]/g, '"]');          // '] -> "]
            }

            const parsed = JSON.parse(jsonString);

            // Validate parsed result
            if (!Array.isArray(parsed)) {
              throw new Error('JSON string must contain an array');
            }
            if (!parsed.every(id => typeof id === 'string' && id.length > 0)) {
              throw new Error('Array must contain only non-empty strings');
            }
            if (parsed.length === 0) {
              throw new Error("At least one calendar ID is required");
            }
            if (parsed.length > 50) {
              throw new Error("Maximum 50 calendars allowed");
            }
            if (new Set(parsed).size !== parsed.length) {
              throw new Error("Duplicate calendar IDs are not allowed");
            }

            processedCalendarId = parsed;
          } catch (error) {
            throw new Error(
              `Invalid JSON format for calendarId: ${error instanceof Error ? error.message : 'Unknown parsing error'}`
            );
          }
        }
        // Otherwise it's a single string calendar ID - keep as-is

        return {
          ...args,
          calendarId: processedCalendarId
        };
      }
    },
    {
      name: "search-google-calendar-events",
      description: "Search for events in a calendar by text query.",
      schema: ToolSchemas['search-google-calendar-events'],
      handler: SearchEventsHandler
    },
    {
      name: "get-google-calendar-event",
      description: "Get details of a specific event by ID.",
      schema: ToolSchemas['get-google-calendar-event'],
      handler: GetEventHandler
    },
    {
      name: "list-google-calendar-colors",
      description: "List available color IDs and their meanings for calendar events",
      schema: ToolSchemas['list-google-calendar-colors'],
      handler: ListColorsHandler
    },
    {
      name: "create-google-calendar-event",
      description: "Create a new calendar event.",
      schema: ToolSchemas['create-google-calendar-event'],
      handler: CreateEventHandler
    },
    {
      name: "update-google-calendar-event",
      description: "Update an existing calendar event with recurring event modification scope support.",
      schema: ToolSchemas['update-google-calendar-event'],
      handler: UpdateEventHandler
    },
    {
      name: "delete-google-calendar-event",
      description: "Delete a calendar event.",
      schema: ToolSchemas['delete-google-calendar-event'],
      handler: DeleteEventHandler
    },
    {
      name: "get-google-calendar-freebusy",
      description: "Query free/busy information for calendars. Note: Time range is limited to a maximum of 3 months between timeMin and timeMax.",
      schema: ToolSchemas['get-google-calendar-freebusy'],
      handler: FreeBusyEventHandler
    },
    {
      name: "get-google-calendar-current-time",
      description: "Get current time in the primary Google Calendar's timezone (or a requested timezone).",
      schema: ToolSchemas['get-google-calendar-current-time'],
      handler: GetCurrentTimeHandler
    }
  ];

  static getToolsWithSchemas() {
    return this.tools.map(tool => {
      const jsonSchema = tool.customInputSchema
        ? zodToJsonSchema(z.object(tool.customInputSchema))
        : zodToJsonSchema(tool.schema);
      return {
        name: tool.name,
        description: tool.description,
        inputSchema: jsonSchema
      };
    });
  }

  /**
   * Normalizes datetime fields from object format to string format
   * Converts { date: "2025-01-01" } or { dateTime: "...", timeZone: "..." } to simple strings
   * This allows accepting both Google Calendar API format and our simplified format
   */
  private static normalizeDateTimeFields(toolName: string, args: any): any {
    // Only normalize for tools that have datetime fields
    const toolsWithDateTime = ['create-google-calendar-event', 'update-google-calendar-event', 'search-google-calendar-events', 'get-google-calendar-freebusy'];
    if (!toolsWithDateTime.includes(toolName)) {
      return args;
    }

    const normalized = { ...args };
    const dateTimeFields = ['start', 'end', 'originalStartTime', 'futureStartDate', 'timeMin', 'timeMax'];

    for (const field of dateTimeFields) {
      if (normalized[field] && typeof normalized[field] === 'object') {
        const obj = normalized[field];
        // Convert object format to string format
        if (obj.date) {
          normalized[field] = obj.date;
        } else if (obj.dateTime) {
          normalized[field] = obj.dateTime;
        }
      }
    }

    return normalized;
  }

  static async registerAll(
    server: McpServer,
    executeWithHandler: (
      handler: any,
      args: any
    ) => Promise<{ content: Array<{ type: "text"; text: string }> }>
  ) {
    for (const tool of this.tools) {
      // Use the existing registerTool method which handles schema conversion properly
      server.registerTool(
        tool.name,
        {
          description: tool.description,
          inputSchema: tool.customInputSchema || this.extractSchemaShape(tool.schema)
        },
        async (args: any) => {
          // Preprocess: Normalize datetime fields (convert object format to string format)
          // This allows accepting both formats while keeping schemas simple
          const normalizedArgs = this.normalizeDateTimeFields(tool.name, args);

          // Validate input using our Zod schema (includes user_id and provider)
          const validatedArgs = tool.schema.parse(normalizedArgs);

          // Apply any custom handler function preprocessing
          const processedArgs = tool.handlerFunction ? await tool.handlerFunction(validatedArgs) : validatedArgs;

          // Create handler instance and execute
          const handler = new tool.handler();
          return executeWithHandler(handler, processedArgs);
        }
      );
    }
  }
}
