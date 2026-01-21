import { getPositionsHandler, getStakedJupHandler, getPlatformsHandler, getPriceHandler } from "./handlers/jupiter.js";

export const tools = [
  {
    name: "jupiter_get_positions",
    description: "Get portfolio positions for a Solana wallet address including wallet balances, staked positions, liquidity pools, farming, vaults, lending, and more",
    inputSchema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Solana wallet address to query"
        },
        platforms: {
          type: "string",
          description: "Optional comma-separated list of platform IDs to filter results (e.g., 'jupiter-exchange,jupiter-governance')"
        }
      },
      required: ["address"]
    }
  },
  {
    name: "jupiter_get_staked_jup",
    description: "Get staked JUP tokens information for a Solana wallet address, including amount staked and unstaking positions",
    inputSchema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Solana wallet address to query"
        }
      },
      required: ["address"]
    }
  },
  {
    name: "jupiter_get_platforms",
    description: "Get a list of all DeFi platforms integrated with Jupiter's portfolio tracking system",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "jupiter_get_price",
    description: "Get current prices for one or more tokens on Jupiter, including USD price, 24h price change, and token decimals",
    inputSchema: {
      type: "object",
      properties: {
        ids: {
          type: "string",
          description: "Comma-separated list of token mint addresses (e.g., 'So11111111111111111111111111111111111111112,EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')"
        }
      },
      required: ["ids"]
    }
  }
];

type handlerDictionary = Record<typeof tools[number]["name"], (input: any) => any>;

export const handlers: handlerDictionary = {
  "jupiter_get_positions": getPositionsHandler,
  "jupiter_get_staked_jup": getStakedJupHandler,
  "jupiter_get_platforms": getPlatformsHandler,
  "jupiter_get_price": getPriceHandler
};
