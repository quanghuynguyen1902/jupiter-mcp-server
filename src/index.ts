#!/usr/bin/env node

// Import fetch polyfill first
import './utils/fetch.js';

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  CallToolRequest
} from "@modelcontextprotocol/sdk/types.js";
import { handlers, tools } from "./tools.js";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";
import { walletService } from "./services/wallet.js";

// Initialize wallet service if private key is provided
const walletInitialized = walletService.initialize();
if (walletInitialized) {
  logger.debug(`Wallet initialized successfully with public key: ${walletService.publicKeyString}`);
} else {
  logger.debug('Wallet not initialized. Automatic swap execution will not be available.');
}

// Create and configure the server
const server = new Server({
  name: config.server.name,
  version: config.server.version,
}, {
  capabilities: {
    tools: {}
  }
});

// Connect to transport
const transport = new StdioServerTransport();
await server.connect(transport);

// Register request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const handler = handlers[request.params.name];
  if (handler) {
    try {
      const input = request.params.arguments;
      logger.debug(`Handling request for tool: ${request.params.name}`);
      return await handler(input);
    } catch (error) {
      logger.error(`Error in handler ${request.params.name}:`, error);
      return { 
        toolResult: { error: (error as Error).message }, 
        content: [], 
        isError: true 
      };
    }
  }
  
  logger.warn(`Method not found: ${request.params.name}`);
  return { 
    toolResult: { error: "Method not found" }, 
    content: [], 
    isError: true 
  };
});

logger.debug(`${config.server.name} v${config.server.version} started on network: ${config.solana.network}`);
