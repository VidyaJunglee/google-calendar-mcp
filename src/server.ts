import { FastMCP } from "fastmcp";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { OAuth2Client } from "google-auth-library";

// Import authentication components
import { getAuthenticatedClient } from './auth/tokenFetcher.js';

// Import tool registry
import { ToolRegistry } from './tools/registry.js';

// Import config
import { ServerConfig } from './config/TransportConfig.js';

export class GoogleCalendarMcpServer {
  private server: FastMCP;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
    this.server = new FastMCP({
      name: "google-calendar",
      version: "1.3.0",
    });
  }

  async initialize(): Promise<void> {
    // Register tools
    this.registerTools();
    
    // Setup graceful shutdown is handled by FastMCP automatically or we can add listeners if needed
    // But FastMCP.stop() is available.
  }

  private registerTools(): void {
    const tools = ToolRegistry.tools;
    
    for (const tool of tools) {
      this.server.addTool({
        name: tool.name,
        description: tool.description,
        parameters: tool.schema,
        execute: async (args) => {
          // Preprocess: Normalize datetime fields
          // We can use the logic from ToolRegistry or just do it here.
          // Since we are inside the execute callback, we can do it here.
          const normalizedArgs = { ...args };
          const dateTimeFields = ['start', 'end', 'originalStartTime', 'futureStartDate', 'timeMin', 'timeMax'];
          for (const field of dateTimeFields) {
            if (normalizedArgs[field] && typeof normalizedArgs[field] === 'object') {
              const obj = normalizedArgs[field] as any;
              if (obj.date) normalizedArgs[field] = obj.date;
              else if (obj.dateTime) normalizedArgs[field] = obj.dateTime;
            }
          }

          // Extract user_id and provider
          const { user_id, provider, ...toolArgs } = normalizedArgs;

          // Validate required parameters (FastMCP validates schema, but we check specific auth params)
          if (!user_id || !provider) {
             // Should be caught by schema validation if they are required in schema, 
             // but let's be safe or if schema makes them optional for some reason.
             // Our schemas make them required.
          }

          process.stderr.write(`[DEBUG] Executing tool ${tool.name} with args: ${JSON.stringify(normalizedArgs, null, 2)}\n`);

          // Fetch tokens and create authenticated OAuth2Client
          const authClient = await getAuthenticatedClient(user_id, provider);

          // Apply custom handler function if exists
          const processedArgs = tool.handlerFunction ? await tool.handlerFunction(normalizedArgs) : normalizedArgs;
          
          // Execute the tool handler
          const handler = new tool.handler();
          
          // We need to adapt the handler.runTool signature.
          // Existing handlers return { content: ... }
          // FastMCP expects string | TextContent | ...
          const result = await handler.runTool(toolArgs, authClient);
          
          // FastMCP handles the response format, we just return the content.
          // If result.content is array of text, we can return it directly or join it?
          // FastMCP supports returning { content: [...] } objects if they match the schema?
          // Looking at types: execute returns Promise<AudioContent | ContentResult | ... | string>
          // ContentResult is { content: Content[] } which matches what runTool returns.
          return result;
        }
      });
    }
  }

  async start(): Promise<void> {
    switch (this.config.transport.type) {
      case 'stdio':
        await this.server.start({
          transportType: 'stdio'
        });
        break;
        
      case 'http':
        await this.server.start({
          transportType: 'httpStream',
          httpStream: {
            port: this.config.transport.port || 3000,
            host: this.config.transport.host || '127.0.0.1',
            stateless: true, // Enable stateless mode as requested
            enableJsonResponse: true // Enable JSON-RPC responses
          }
        });
        break;
        
      default:
        throw new Error(`Unsupported transport type: ${this.config.transport.type}`);
    }
  }
} 