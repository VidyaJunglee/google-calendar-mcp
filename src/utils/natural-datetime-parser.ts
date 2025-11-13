/**
 * Natural language datetime parser for Google Calendar MCP Server
 * Converts phrases like "today 8pm", "tomorrow 2:30pm" to ISO 8601 format
 */

import { GetCurrentTimeInput } from '../tools/registry.js';

interface ParsedDateTime {
  datetime: string;
  isAllDay: boolean;
}

/**
 * Parses natural language datetime expressions into ISO 8601 format
 * @param input Natural language datetime string (e.g., "today 8pm", "tomorrow 2:30pm")
 * @param timezone IANA timezone for context (e.g., "America/Los_Angeles")
 * @returns ISO 8601 formatted datetime string
 */
export function parseNaturalDateTime(input: string, timezone: string = 'UTC'): ParsedDateTime {
  const normalizedInput = input.toLowerCase().trim();
  
  // Get current date in specified timezone
  const now = new Date();
  const currentInTimezone = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  
  // Handle "today" expressions
  if (normalizedInput.includes('today')) {
    return parseTimeForDate(normalizedInput, currentInTimezone, timezone);
  }
  
  // Handle "tomorrow" expressions
  if (normalizedInput.includes('tomorrow')) {
    const tomorrow = new Date(currentInTimezone);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return parseTimeForDate(normalizedInput, tomorrow, timezone);
  }
  
  // Handle "yesterday" expressions
  if (normalizedInput.includes('yesterday')) {
    const yesterday = new Date(currentInTimezone);
    yesterday.setDate(yesterday.getDate() - 1);
    return parseTimeForDate(normalizedInput, yesterday, timezone);
  }
  
  // Handle relative days (in X days, next Monday, etc.)
  const relativeDayMatch = normalizedInput.match(/(?:in\s+)?(\d+)\s+days?/);
  if (relativeDayMatch) {
    const daysToAdd = parseInt(relativeDayMatch[1]);
    const targetDate = new Date(currentInTimezone);
    targetDate.setDate(targetDate.getDate() + daysToAdd);
    return parseTimeForDate(normalizedInput, targetDate, timezone);
  }
  
  // Handle day names (Monday, Tuesday, etc.)
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayMatch = normalizedInput.match(new RegExp(`\\b(${dayNames.join('|')})\\b`));
  if (dayMatch) {
    const targetDayName = dayMatch[1];
    const targetDate = getNextWeekdayDate(currentInTimezone, dayNames.indexOf(targetDayName));
    return parseTimeForDate(normalizedInput, targetDate, timezone);
  }
  
  // If no natural language patterns found, assume it's already ISO format
  // This maintains backward compatibility
  return {
    datetime: input,
    isAllDay: !input.includes('T')
  };
}

/**
 * Parses time from a natural language string for a specific date
 */
function parseTimeForDate(input: string, date: Date, timezone: string): ParsedDateTime {
  const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i;
  const timeMatch = input.match(timePattern);
  
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const ampm = timeMatch[3]?.toLowerCase();
    
    // Handle AM/PM conversion
    if (ampm && (ampm.includes('pm') || ampm.includes('p.m.'))) {
      if (hours !== 12) hours += 12;
    } else if (ampm && (ampm.includes('am') || ampm.includes('a.m.')) && hours === 12) {
      hours = 0;
    }
    
    // Create the datetime
    const targetDate = new Date(date);
    targetDate.setHours(hours, minutes, 0, 0);
    
    // Format as ISO 8601 without timezone (will be handled by existing logic)
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const hour = String(targetDate.getHours()).padStart(2, '0');
    const minute = String(targetDate.getMinutes()).padStart(2, '0');
    
    return {
      datetime: `${year}-${month}-${day}T${hour}:${minute}:00`,
      isAllDay: false
    };
  }
  
  // No time specified, assume all-day event
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return {
    datetime: `${year}-${month}-${day}`,
    isAllDay: true
  };
}

/**
 * Gets the next occurrence of a specific weekday
 */
function getNextWeekdayDate(currentDate: Date, targetDay: number): Date {
  const currentDay = currentDate.getDay();
  const daysUntilTarget = (targetDay - currentDay + 7) % 7;
  const targetDate = new Date(currentDate);
  
  // If today is the target day and no time has passed, use today
  // Otherwise use next week's occurrence
  if (daysUntilTarget === 0) {
    targetDate.setDate(targetDate.getDate() + 7);
  } else {
    targetDate.setDate(targetDate.getDate() + daysUntilTarget);
  }
  
  return targetDate;
}

/**
 * Enhanced schema transformer that supports both ISO 8601 and natural language
 */
export function createFlexibleDateTimeSchema() {
  return {
    preprocess: (val: unknown, timezone: string = 'UTC') => {
      if (typeof val !== 'string') return val;
      
      // Check if it's already ISO 8601 format
      const isoPattern = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})?)?$/;
      if (isoPattern.test(val)) {
        return val; // Already in correct format
      }
      
      // Parse natural language
      const parsed = parseNaturalDateTime(val, timezone);
      return parsed.datetime;
    }
  };
}