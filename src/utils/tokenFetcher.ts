import { OAuth2Client } from "google-auth-library";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { getOAuthTokens } from 'auth_handler';

/**
 * Get an authenticated OAuth2Client using tokens from auth_handler
 */
export async function getAuthenticatedClient(
  user_id: string, 
  provider: 'google' | 'microsoft'
): Promise<OAuth2Client> {
  // Validate inputs
  if (!user_id || !provider) {
    throw new McpError(
      ErrorCode.InvalidParams,
      '[AUTH_ERROR] user_id and provider are required parameters'
    );
  }

  try {
    // Get tokens from auth_handler
    const tokenResponse = await getOAuthTokens(user_id, provider);
    
    if (!tokenResponse.success) {
      // Check if authentication is required
      if (tokenResponse.requires_auth) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          tokenResponse.message || `Authentication required: Please connect your ${provider} account.`
        );
      } else {
        throw new McpError(
          ErrorCode.InternalError,
          tokenResponse.error || 'Failed to retrieve OAuth tokens'
        );
      }
    }

    // Extract tokens for the provider
    const tokens = tokenResponse.tokens?.[provider];
    if (!tokens || !tokens.access_token) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `[AUTH_ERROR] No access token found for provider ${provider}`
      );
    }

    // Create OAuth2Client with minimal credentials (no client secrets needed for token usage)
    const oauth2Client = new OAuth2Client();
    
    // Set the credentials
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expires_at ? tokens.expires_at * 1000 : undefined, // Convert to milliseconds
      token_type: tokens.token_type
    });

    return oauth2Client;
  } catch (error) {
    // Re-throw McpError as-is
    if (error instanceof McpError) {
      throw error;
    }

    // Wrap other errors
    throw new McpError(
      ErrorCode.InternalError,
      `[AUTH_ERROR] Failed to authenticate: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}