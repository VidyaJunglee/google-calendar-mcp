import { getOAuthTokens, OAuthProvider } from 'auth_handler';
import { OAuth2Client } from 'google-auth-library';
import { initializeOAuth2Client } from './client.js';
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

/**
 * Fetch OAuth tokens for a user and provider, then create an authenticated OAuth2Client
 * @param userId - User ID to fetch tokens for
 * @param provider - OAuth provider (e.g., 'google', 'microsoft')
 * @returns Authenticated OAuth2Client
 * @throws McpError if authentication fails
 */
export async function getAuthenticatedClient(userId: string, provider: OAuthProvider): Promise<OAuth2Client> {
    // Validate inputs
    if (!userId || !provider) {
        throw new McpError(
            ErrorCode.InvalidRequest,
            '[AUTH_ERROR] user_id and provider are required parameters'
        );
    }

    // Fetch tokens from auth_handler
    const authResult = await getOAuthTokens(userId, provider);

    // Check if authentication was successful
    if (!authResult.success) {
        const errorResult = authResult as { success: false; error: string; requires_auth?: boolean; message?: string };
        
        if (errorResult.requires_auth) {
            throw new McpError(
                ErrorCode.InvalidRequest,
                errorResult.message || errorResult.error || 'Authentication required'
            );
        }
        
        throw new McpError(
            ErrorCode.InternalError,
            errorResult.error || 'Failed to retrieve OAuth tokens'
        );
    }

    // Extract tokens for the provider
    const successResult = authResult as { success: true; tokens: Record<string, any> };
    const tokens = successResult.tokens[provider];
    
    if (!tokens || !tokens.access_token) {
        throw new McpError(
            ErrorCode.InternalError,
            `[AUTH_ERROR] No access token found for provider ${provider}`
        );
    }

    // Initialize OAuth2Client with credentials
    const oauth2Client = await initializeOAuth2Client();
    oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expires_at ? tokens.expires_at * 1000 : undefined, // Convert to milliseconds
        token_type: tokens.token_type || 'Bearer'
    });

    return oauth2Client;
}
