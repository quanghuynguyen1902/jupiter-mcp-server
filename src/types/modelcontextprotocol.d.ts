declare module '@modelcontextprotocol/sdk/server/index.js' {
  export class Server {
    constructor(
      info: { name: string; version: string },
      options: { capabilities: { tools: any } }
    );
    connect(transport: any): Promise<void>;
    setRequestHandler(schema: any, handler: Function): void;
  }
}

declare module '@modelcontextprotocol/sdk/server/stdio.js' {
  export class StdioServerTransport {
    constructor();
  }
}

declare module '@modelcontextprotocol/sdk/types.js' {
  export const CallToolRequestSchema: any;
  export const ErrorCode: any;
  export const ListToolsRequestSchema: any;
  export class McpError extends Error {}

  export interface CallToolRequest {
    params: {
      name: string;
      arguments: any;
    };
  }

  export interface ToolResultSchema {
    toolResult: any;
    content: any[];
    isError: boolean;
  }
}
