import { getQuoteHandler, buildSwapTransactionHandler, sendSwapTransactionHandler, executeSwapHandler } from "./handlers/jupiter.js";

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
        onlyDirectRoutes: { type: "boolean" },
        asLegacyTransaction: { type: "boolean" },
        maxAccounts: { type: "number" },
        swapMode: { type: "string" },
        excludeDexes: { 
          type: "array",
          items: { type: "string" }
        },
        platformFeeBps: { type: "number" }
      },
      required: ["inputMint", "outputMint", "amount"]
    }
  },
  {
    name: "jupiter_build_swap_transaction",
    description: "Build a swap transaction on Jupiter",
    inputSchema: {
      type: "object",
      properties: {
        quoteResponse: { type: "string" },
        userPublicKey: { type: "string" },
        prioritizationFeeLamports: { type: "number" },
        computeUnitPriceMicroLamports: { type: "number" },
        asLegacyTransaction: { type: "boolean" }
      },
      required: ["quoteResponse", "userPublicKey"]
    }
  },
  {
    name: "jupiter_send_swap_transaction",
    description: "Send a swap transaction on Jupiter",
    inputSchema: {
      type: "object",
      properties: {
        swapTransaction: { type: "string" },
        serializedTransaction: { type: "string" },
        skipPreflight: { type: "boolean" },
        maxRetries: { type: "number" }
      }
    }
  },
  {
    name: "jupiter_execute_swap",
    description: "Execute a complete swap using wallet private key from environment variables",
    inputSchema: {
      type: "object",
      properties: {
        inputMint: { type: "string" },
        outputMint: { type: "string" },
        amount: { type: "string" },
        slippageBps: { type: "number" },
        onlyDirectRoutes: { type: "boolean" },
        swapMode: { type: "string" }
      },
      required: ["inputMint", "outputMint", "amount"]
    }
  }
];

type handlerDictionary = Record<typeof tools[number]["name"], (input: any) => any>;

export const handlers: handlerDictionary = {
  "jupiter_get_quote": getQuoteHandler,
  "jupiter_build_swap_transaction": buildSwapTransactionHandler,
  "jupiter_send_swap_transaction": sendSwapTransactionHandler,
  "jupiter_execute_swap": executeSwapHandler
};
