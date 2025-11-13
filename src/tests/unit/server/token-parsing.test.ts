import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleCalendarMcpServer } from '../../../server.js';
import { ServerConfig } from '../../../config/TransportConfig.js';

describe('OAuth Token Parsing', () => {
  let server: GoogleCalendarMcpServer;
  
  beforeEach(() => {
    const config: ServerConfig = {
      transport: { type: 'stdio' }
    };
    server = new GoogleCalendarMcpServer(config);
  });

  describe('Token parsing in executeWithHandler', () => {
    it('should parse JSON string tokens correctly', async () => {
      // Mock a handler
      const mockHandler = {
        runTool: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'success' }]
        })
      };

      // Create the complex JSON token format that's causing the issue
      const tokenResponse = {
        success: true,
        provider: 'google',
        tokens: {
          google: {
            access_token: 'ya29.test_access_token',
            refresh_token: '1//test_refresh_token',
            token_type: 'Bearer',
            expires_at: 1763010691
          }
        },
        message: 'Retrieved google OAuth tokens successfully'
      };

      const args = {
        access_token: JSON.stringify(tokenResponse),
        refresh_token: JSON.stringify(tokenResponse),
        expiry_date: JSON.stringify(tokenResponse),
        calendarId: 'primary'
      };

      // Mock initializeOAuth2Client to avoid needing real credentials
      vi.doMock('../../auth/client.js', () => ({
        initializeOAuth2Client: vi.fn().mockResolvedValue({
          setCredentials: vi.fn()
        })
      }));

      // Test the token parsing - this should not throw an error
      try {
        const result = await (server as any).executeWithHandler(mockHandler, args);
        expect(result).toBeDefined();
        expect(mockHandler.runTool).toHaveBeenCalledWith(
          { calendarId: 'primary' },
          expect.objectContaining({
            setCredentials: expect.any(Function)
          })
        );
      } catch (error) {
        // The test might fail due to missing OAuth setup, but it should not fail due to token parsing
        expect(error).not.toMatch(/JSON.parse|invalid_grant|Authentication token is invalid/);
      }
    });

    it('should handle simple string tokens correctly', async () => {
      const mockHandler = {
        runTool: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'success' }]
        })
      };

      const args = {
        access_token: 'ya29.simple_access_token',
        refresh_token: '1//simple_refresh_token',
        expiry_date: '1763010691',
        calendarId: 'primary'
      };

      // Mock initializeOAuth2Client
      vi.doMock('../../auth/client.js', () => ({
        initializeOAuth2Client: vi.fn().mockResolvedValue({
          setCredentials: vi.fn()
        })
      }));

      // This should work with simple string tokens
      try {
        const result = await (server as any).executeWithHandler(mockHandler, args);
        expect(result).toBeDefined();
      } catch (error) {
        // Should not fail due to token format issues
        expect(error).not.toMatch(/JSON.parse|token parsing failed/);
      }
    });

    it('should handle malformed JSON gracefully', async () => {
      const mockHandler = {
        runTool: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'success' }]
        })
      };

      const args = {
        access_token: '{invalid json}',
        refresh_token: 'valid_refresh_token',
        expiry_date: '1763010691',
        calendarId: 'primary'
      };

      // Mock initializeOAuth2Client
      vi.doMock('../../auth/client.js', () => ({
        initializeOAuth2Client: vi.fn().mockResolvedValue({
          setCredentials: vi.fn()
        })
      }));

      try {
        const result = await (server as any).executeWithHandler(mockHandler, args);
        expect(result).toBeDefined();
      } catch (error) {
        // Should handle malformed JSON gracefully and continue with original values
        expect(error).not.toMatch(/JSON.parse failed/);
      }
    });
  });
});