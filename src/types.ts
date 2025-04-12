import type { ToolResultSchema as MCPToolResultSchema } from '@modelcontextprotocol/sdk/types.js';

export interface ToolResultSchema extends MCPToolResultSchema {
  toolResult: any;
  content: Array<{
    type: string;
    text: string;
  }>;
  isError: boolean;
}
