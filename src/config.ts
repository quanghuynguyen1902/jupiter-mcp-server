import { config as dotenvConfig } from 'dotenv';
import { logger } from './utils/logger.js';

// Load environment variables from .env file
dotenvConfig();

// Default RPC endpoints by network
const DEFAULT_RPC_ENDPOINTS = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  'testnet': 'https://api.testnet.solana.com',
  'devnet': 'https://api.devnet.solana.com',
};

// Determine network
const network = process.env.SOLANA_NETWORK || 'mainnet-beta';
if (!['mainnet-beta', 'testnet', 'devnet'].includes(network)) {
  logger.warn(`Invalid network specified: ${network}. Falling back to mainnet-beta.`);
}

// Configuration object
export const config = {
  server: {
    name: 'jupiter-mcp-server',
    version: '1.0.0',
  },
  solana: {
    network: network as 'mainnet-beta' | 'testnet' | 'devnet',
    rpcEndpoint: process.env.SOLANA_RPC_ENDPOINT || DEFAULT_RPC_ENDPOINTS[network as keyof typeof DEFAULT_RPC_ENDPOINTS] || DEFAULT_RPC_ENDPOINTS['mainnet-beta'],
    privateKey: process.env.SOLANA_PRIVATE_KEY || '',
  },
  jupiter: {
    apiBaseUrl: 'https://quote-api.jup.ag/v6',
  }
};

// Log configuration (excluding sensitive data)
logger.debug('Server configuration:', {
  ...config,
  solana: {
    ...config.solana,
    privateKey: config.solana.privateKey ? '***REDACTED***' : 'Not provided',
  }
});
