import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAuthenticatedClient } from '../../../auth/tokenFetcher.js';
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

// Mock the auth_handler package
vi.mock('auth_handler', () => ({
  getOAuthTokens: vi.fn(),
  OAuthProvider: {}
}));

// Mock the OAuth2Client initialization
vi.mock('../../../auth/client.js', () => ({
  initializeOAuth2Client: vi.fn()
}));

import { getOAuthTokens } from 'auth_handler';
import { initializeOAuth2Client } from '../../../auth/client.js';

describe('Token Fetcher with auth_handler', () => {
  const mockUserId = 'user123';
  const mockProvider = 'google';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAuthenticatedClient', () => {
    it('should successfully fetch tokens and create OAuth2Client', async () => {
      // Mock successful token retrieval
      const mockTokenResponse = {
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

      vi.mocked(getOAuthTokens).mockResolvedValue(mockTokenResponse as any);

      const mockOAuth2Client = {
        setCredentials: vi.fn()
      };
      vi.mocked(initializeOAuth2Client).mockResolvedValue(mockOAuth2Client as any);

      // Call the function
      const client = await getAuthenticatedClient(mockUserId, mockProvider as any);

      // Verify getOAuthTokens was called correctly
      expect(getOAuthTokens).toHaveBeenCalledWith(mockUserId, mockProvider);

      // Verify OAuth2Client was initialized
      expect(initializeOAuth2Client).toHaveBeenCalled();

      // Verify credentials were set
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        access_token: 'ya29.test_access_token',
        refresh_token: '1//test_refresh_token',
        expiry_date: 1763010691000, // Converted to milliseconds
        token_type: 'Bearer'
      });

      expect(client).toBe(mockOAuth2Client);
    });

    it('should throw McpError when user_id is missing', async () => {
      await expect(
        getAuthenticatedClient('', mockProvider as any)
      ).rejects.toThrow(McpError);

      await expect(
        getAuthenticatedClient('', mockProvider as any)
      ).rejects.toThrow('[AUTH_ERROR] user_id and provider are required parameters');
    });

    it('should throw McpError when provider is missing', async () => {
      await expect(
        getAuthenticatedClient(mockUserId, '' as any)
      ).rejects.toThrow(McpError);
    });

    it('should throw McpError when authentication fails with requires_auth', async () => {
      const mockErrorResponse = {
        success: false,
        error: '[GOOGLE_AUTH_ERROR] No OAuth tokens found. Please authenticate with google.',
        provider: 'google',
        requires_auth: true,
        message: 'Authentication required: Please connect your Google account.'
      };

      vi.mocked(getOAuthTokens).mockResolvedValue(mockErrorResponse as any);

      await expect(
        getAuthenticatedClient(mockUserId, mockProvider as any)
      ).rejects.toThrow(McpError);

      await expect(
        getAuthenticatedClient(mockUserId, mockProvider as any)
      ).rejects.toThrow('Authentication required: Please connect your Google account.');
    });

    it('should throw McpError when token retrieval fails without requires_auth', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Internal error occurred',
        provider: 'google',
        requires_auth: false
      };

      vi.mocked(getOAuthTokens).mockResolvedValue(mockErrorResponse as any);

      await expect(
        getAuthenticatedClient(mockUserId, mockProvider as any)
      ).rejects.toThrow(McpError);

      await expect(
        getAuthenticatedClient(mockUserId, mockProvider as any)
      ).rejects.toThrow('Internal error occurred');
    });

    it('should throw McpError when tokens are missing from response', async () => {
      const mockTokenResponse = {
        success: true,
        provider: 'google',
        tokens: {
          google: {
            // Missing access_token
            refresh_token: '1//test_refresh_token',
            token_type: 'Bearer',
            expires_at: 1763010691
          }
        },
        message: 'Retrieved google OAuth tokens successfully'
      };

      vi.mocked(getOAuthTokens).mockResolvedValue(mockTokenResponse as any);

      const mockOAuth2Client = {
        setCredentials: vi.fn()
      };
      vi.mocked(initializeOAuth2Client).mockResolvedValue(mockOAuth2Client as any);

      await expect(
        getAuthenticatedClient(mockUserId, mockProvider as any)
      ).rejects.toThrow('[AUTH_ERROR] No access token found for provider google');
    });

    it('should handle expires_at being undefined', async () => {
      const mockTokenResponse = {
        success: true,
        provider: 'google',
        tokens: {
          google: {
            access_token: 'ya29.test_access_token',
            refresh_token: '1//test_refresh_token',
            token_type: 'Bearer'
            // expires_at is undefined
          }
        },
        message: 'Retrieved google OAuth tokens successfully'
      };

      vi.mocked(getOAuthTokens).mockResolvedValue(mockTokenResponse as any);

      const mockOAuth2Client = {
        setCredentials: vi.fn()
      };
      vi.mocked(initializeOAuth2Client).mockResolvedValue(mockOAuth2Client as any);

      await getAuthenticatedClient(mockUserId, mockProvider as any);

      // Verify credentials were set with undefined expiry_date
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        access_token: 'ya29.test_access_token',
        refresh_token: '1//test_refresh_token',
        expiry_date: undefined,
        token_type: 'Bearer'
      });
    });

    it('should support microsoft provider', async () => {
      const mockTokenResponse = {
        success: true,
        provider: 'microsoft',
        tokens: {
          microsoft: {
            access_token: 'ms_test_access_token',
            refresh_token: 'ms_test_refresh_token',
            token_type: 'Bearer',
            expires_at: 1763010691
          }
        },
        message: 'Retrieved microsoft OAuth tokens successfully'
      };

      vi.mocked(getOAuthTokens).mockResolvedValue(mockTokenResponse as any);

      const mockOAuth2Client = {
        setCredentials: vi.fn()
      };
      vi.mocked(initializeOAuth2Client).mockResolvedValue(mockOAuth2Client as any);

      await getAuthenticatedClient(mockUserId, 'microsoft' as any);

      expect(getOAuthTokens).toHaveBeenCalledWith(mockUserId, 'microsoft');
    });
  });
});
