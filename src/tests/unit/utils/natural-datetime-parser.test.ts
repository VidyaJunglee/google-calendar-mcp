import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseNaturalDateTime } from '../../../utils/natural-datetime-parser.js';

describe('Natural DateTime Parser', () => {
  beforeEach(() => {
    // Mock current date to a known value for consistent tests
    const mockDate = new Date('2024-01-15T10:00:00Z'); // Monday, Jan 15, 2024
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Today expressions', () => {
    it('should parse "today 8pm" correctly', () => {
      const result = parseNaturalDateTime('today 8pm', 'UTC');
      expect(result.datetime).toBe('2024-01-15T20:00:00');
      expect(result.isAllDay).toBe(false);
    });

    it('should parse "today 2:30pm" correctly', () => {
      const result = parseNaturalDateTime('today 2:30pm', 'UTC');
      expect(result.datetime).toBe('2024-01-15T14:30:00');
      expect(result.isAllDay).toBe(false);
    });

    it('should parse "today 9am" correctly', () => {
      const result = parseNaturalDateTime('today 9am', 'UTC');
      expect(result.datetime).toBe('2024-01-15T09:00:00');
      expect(result.isAllDay).toBe(false);
    });

    it('should parse "today" without time as all-day', () => {
      const result = parseNaturalDateTime('today', 'UTC');
      expect(result.datetime).toBe('2024-01-15');
      expect(result.isAllDay).toBe(true);
    });
  });

  describe('Tomorrow expressions', () => {
    it('should parse "tomorrow 3pm" correctly', () => {
      const result = parseNaturalDateTime('tomorrow 3pm', 'UTC');
      expect(result.datetime).toBe('2024-01-16T15:00:00');
      expect(result.isAllDay).toBe(false);
    });

    it('should parse "tomorrow" without time as all-day', () => {
      const result = parseNaturalDateTime('tomorrow', 'UTC');
      expect(result.datetime).toBe('2024-01-16');
      expect(result.isAllDay).toBe(true);
    });
  });

  describe('Day name expressions', () => {
    it('should parse "Friday 5pm" correctly', () => {
      // Next Friday from Monday Jan 15 would be Jan 19
      const result = parseNaturalDateTime('Friday 5pm', 'UTC');
      expect(result.datetime).toBe('2024-01-19T17:00:00');
      expect(result.isAllDay).toBe(false);
    });

    it('should parse "Wednesday" without time as all-day', () => {
      // Next Wednesday from Monday Jan 15 would be Jan 17
      const result = parseNaturalDateTime('Wednesday', 'UTC');
      expect(result.datetime).toBe('2024-01-17');
      expect(result.isAllDay).toBe(true);
    });
  });

  describe('Relative day expressions', () => {
    it('should parse "in 3 days 4pm" correctly', () => {
      const result = parseNaturalDateTime('in 3 days 4pm', 'UTC');
      expect(result.datetime).toBe('2024-01-18T16:00:00');
      expect(result.isAllDay).toBe(false);
    });

    it('should parse "in 5 days" without time as all-day', () => {
      const result = parseNaturalDateTime('in 5 days', 'UTC');
      expect(result.datetime).toBe('2024-01-20');
      expect(result.isAllDay).toBe(true);
    });
  });

  describe('12-hour format handling', () => {
    it('should handle 12pm correctly', () => {
      const result = parseNaturalDateTime('today 12pm', 'UTC');
      expect(result.datetime).toBe('2024-01-15T12:00:00');
    });

    it('should handle 12am correctly', () => {
      const result = parseNaturalDateTime('today 12am', 'UTC');
      expect(result.datetime).toBe('2024-01-15T00:00:00');
    });

    it('should handle times without AM/PM (24-hour format)', () => {
      const result = parseNaturalDateTime('today 14:30', 'UTC');
      expect(result.datetime).toBe('2024-01-15T14:30:00');
    });
  });

  describe('Timezone handling', () => {
    it('should respect timezone context', () => {
      // In PST timezone (UTC-8), "today 8pm" should be different from UTC
      const result = parseNaturalDateTime('today 8pm', 'America/Los_Angeles');
      // This will be relative to PST time
      expect(result.datetime).toMatch(/2024-01-15T20:00:00/);
      expect(result.isAllDay).toBe(false);
    });
  });

  describe('ISO format passthrough', () => {
    it('should pass through valid ISO 8601 dates unchanged', () => {
      const isoDate = '2024-01-20T15:30:00';
      const result = parseNaturalDateTime(isoDate, 'UTC');
      expect(result.datetime).toBe(isoDate);
      expect(result.isAllDay).toBe(false);
    });

    it('should pass through date-only format unchanged', () => {
      const dateOnly = '2024-01-20';
      const result = parseNaturalDateTime(dateOnly, 'UTC');
      expect(result.datetime).toBe(dateOnly);
      expect(result.isAllDay).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle case-insensitive input', () => {
      const result = parseNaturalDateTime('TODAY 8PM', 'UTC');
      expect(result.datetime).toBe('2024-01-15T20:00:00');
    });

    it('should handle extra whitespace', () => {
      const result = parseNaturalDateTime('  today   8pm  ', 'UTC');
      expect(result.datetime).toBe('2024-01-15T20:00:00');
    });

    it('should handle mixed case day names', () => {
      const result = parseNaturalDateTime('Friday 5PM', 'UTC');
      expect(result.datetime).toBe('2024-01-19T17:00:00');
    });
  });
});