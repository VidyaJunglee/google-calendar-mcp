import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { OAuth2Client } from "google-auth-library";

// Import authentication components
import { initializeOAuth2Client } from './auth/client.js';

// Import tool registry
import { ToolRegistry } from './tools/registry.js';

// Import transport handlers
import { StdioTransportHandler } from './transports/stdio.js';
import { HttpTransportHandler, HttpTransportConfig } from './transports/http.js';

// Import config
import { ServerConfig } from './config/TransportConfig.js';

export class GoogleCalendarMcpServer {
  private server: McpServer;
  private oauth2Client!: OAuth2Client;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
    this.server = new McpServer({
      name: "google-calendar",
      version: "1.3.0"
    });
  }

  async initialize(): Promise<void> {
    // 1. Initialize Authentication (but don't block on it)
    this.oauth2Client = await initializeOAuth2Client();

    // 2. Set up Modern Tool Definitions
    this.registerTools();

    // 3. Set up Graceful Shutdown
    this.setupGracefulShutdown();
  }



  private registerTools(): void {
    ToolRegistry.registerAll(this.server, this.executeWithHandler.bind(this));
  }

  private async executeWithHandler(handler: any, args: any): Promise<{ content: Array<{ type: "text"; text: string }> }> {
    // Extract auth tokens from request parameters
    let { access_token, refresh_token, expiry_date, ...toolArgs } = args;
    
    // Log to stderr to avoid breaking JSONRPC protocol on stdout
    process.stderr.write(`[DEBUG] Executing tool with args: ${JSON.stringify(args, null, 2)}\n`);
    
    // Parse token parameters if they are JSON strings (from external systems)
    try {
      if (typeof access_token === 'string' && access_token.startsWith('{')) {
        const parsed = JSON.parse(access_token);
        if (parsed.success && parsed.tokens && parsed.tokens.google) {
          access_token = parsed.tokens.google.access_token;
        }
      }
      
      if (typeof refresh_token === 'string' && refresh_token.startsWith('{')) {
        const parsed = JSON.parse(refresh_token);
        if (parsed.success && parsed.tokens && parsed.tokens.google) {
          refresh_token = parsed.tokens.google.refresh_token;
        }
      }
      
      if (typeof expiry_date === 'string' && expiry_date.startsWith('{')) {
        const parsed = JSON.parse(expiry_date);
        if (parsed.success && parsed.tokens && parsed.tokens.google) {
          expiry_date = parsed.tokens.google.expires_at?.toString();
        }
      }
    } catch (parseError) {
      process.stderr.write(`[DEBUG] Token parsing failed: ${parseError instanceof Error ? parseError.message : parseError}\n`);
      // Continue with original values if parsing fails
    }
    
    // Tokens must be provided as parameters
    if (!access_token || !refresh_token) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "[GOOGLE_AUTH_ERROR] Authentication required. Please provide access_token and refresh_token as parameters."
      );
    }
    
    // Create an OAuth2Client instance with tokens from parameters
    const authClient = await initializeOAuth2Client();
    authClient.setCredentials({
      access_token: access_token,
      refresh_token: refresh_token,
      expiry_date: expiry_date ? Number(expiry_date) : undefined
    });
    
    const result = await handler.runTool(toolArgs, authClient);
    return result;
  }

  async start(): Promise<void> {
    switch (this.config.transport.type) {
      case 'stdio':
        const stdioHandler = new StdioTransportHandler(this.server);
        await stdioHandler.connect();
        break;
        
      case 'http':
        const httpConfig: HttpTransportConfig = {
          port: this.config.transport.port,
          host: this.config.transport.host
        };
        const httpHandler = new HttpTransportHandler(this.server, httpConfig);
        await httpHandler.connect();
        break;
        
      default:
        throw new Error(`Unsupported transport type: ${this.config.transport.type}`);
    }
  }

  private setupGracefulShutdown(): void {
    const cleanup = async () => {
      try {
        // McpServer handles transport cleanup automatically
        this.server.close();
        
        process.exit(0);
      } catch (error: unknown) {
        process.stderr.write(`Error during cleanup: ${error instanceof Error ? error.message : error}\n`);
        process.exit(1);
      }
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  }

  // Expose server for testing
  getServer(): McpServer {
    return this.server;
  }
} 