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

export interface PriorityLevel {
  priorityLevelWithMaxLamports: {
    maxLamports: number;
    priorityLevel: 'low' | 'medium' | 'high' | 'veryHigh';
  };
}

export interface BuildSwapTransactionInput {
  quoteResponse: string | any;
  userPublicKey: string;
  prioritizationFeeLamports?: number | PriorityLevel;
  computeUnitPriceMicroLamports?: number;
  asLegacyTransaction?: boolean;
  dynamicComputeUnitLimit?: boolean;
}

export interface SendSwapTransactionInput {
  swapTransaction: string | any;
  serializedTransaction?: string;
  skipPreflight?: boolean;
  maxRetries?: number;
}

// Type alias for executive swap, which uses the same input as GetQuoteInput
export type ExecuteSwapInput = GetQuoteInput;

// Response from lite-api swap endpoint
export interface LiteApiSwapResponse {
  transaction: string;
  encodedTransaction?: string;
  needsSignature?: boolean;
  signers?: string[];
}
