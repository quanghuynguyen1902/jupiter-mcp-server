export interface GetQuoteInput {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
  onlyDirectRoutes?: boolean;
  asLegacyTransaction?: boolean;
  maxAccounts?: number;
  swapMode?: string;
  excludeDexes?: string[];
  platformFeeBps?: number;
}

export interface BuildSwapTransactionInput {
  quoteResponse: string;
  userPublicKey: string;
  prioritizationFeeLamports?: number;
  computeUnitPriceMicroLamports?: number;
  asLegacyTransaction?: boolean;
}

export interface SendSwapTransactionInput {
  swapTransaction: string;
  serializedTransaction?: string;
  skipPreflight?: boolean;
  maxRetries?: number;
}

// Type alias for executive swap, which uses the same input as GetQuoteInput
export type ExecuteSwapInput = GetQuoteInput;
