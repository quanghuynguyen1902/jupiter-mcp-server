import { getQuoteHandler, executeSwapHandler, searchTokenHandler } from "./handlers/jupiter.js";

export const tools = [
  {
    name: "jupiter_get_quote",
    description: "Get a quote for swapping tokens on Jupiter",
    inputSchema: {
      type: "object",
      properties: {
        inputMint: { type: "string" },
        outputMint: { type: "string" },
        amount: { type: "string" },
        slippageBps: { type: "number" },
        onlyDirectRoutes: { type: "boolean" }
      },
      required: ["inputMint", "outputMint", "amount"]
    }
  },
  {
    name: "jupiter_execute_swap",
    description: "Execute a token swap on Jupiter using wallet private key from environment variables",
    inputSchema: {
      type: "object",
      properties: {
        inputMint: { type: "string" },
        outputMint: { type: "string" },
        amount: { type: "string" },
        slippageBps: { type: "number" },
        onlyDirectRoutes: { type: "boolean" },
        dynamicComputeUnits: { type: "boolean" },
        dynamicSlippage: { type: "boolean" }
      },
      required: ["inputMint", "outputMint", "amount"]
    }
  },
  {
    name: "jupiter_search_token",
    description: "Search for token mints by symbol or name on Solana",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string" },
        includeUnknown: { type: "boolean" },
        onlyVerified: { type: "boolean" }
      },
      required: ["symbol"]
    }
  }
];

type handlerDictionary = Record<typeof tools[number]["name"], (input: any) => any>;

export const handlers: handlerDictionary = {
  "jupiter_get_quote": getQuoteHandler,
  "jupiter_execute_swap": executeSwapHandler,
  "jupiter_search_token": searchTokenHandler
};
