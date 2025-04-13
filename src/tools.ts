import { executeV1SwapHandler, getV1QuoteHandler } from "./handlers/v1Api.js";

export const tools = [
  {
    name: "jupiter_v1_execute_swap",
    description: "Execute a swap using the optimized Jupiter V1 API with enhanced transaction handling",
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
    name: "jupiter_v1_get_quote",
    description: "Get a quote using the Jupiter V1 API for advanced pricing information",
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
  }
];

type handlerDictionary = Record<typeof tools[number]["name"], (input: any) => any>;

export const handlers: handlerDictionary = {
  "jupiter_v1_execute_swap": executeV1SwapHandler,
  "jupiter_v1_get_quote": getV1QuoteHandler
};
