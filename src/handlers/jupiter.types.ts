/**
 * Basic input parameters for a swap quote
 */
export interface QuoteInput {
  /** Input token mint address */
  inputMint: string;

  /** Output token mint address */
  outputMint: string;

  /** Amount to swap in lamports/smallest units */
  amount: string;

  /** Slippage tolerance in basis points (e.g., 50 = 0.5%) */
  slippageBps?: number;

  /** Only use direct routes between input and output tokens */
  onlyDirectRoutes?: boolean;
}

/**
 * Enhanced input for swap execution
 */
export interface SwapInput extends QuoteInput {
  /** Optional dynamic compute unit flag */
  dynamicComputeUnits?: boolean;

  /** Optional dynamic slippage flag */
  dynamicSlippage?: boolean;
}

/**
 * Quote response from Jupiter API
 */
export interface QuoteResponse {
  inputMint: string;
  outputMint: string;
  inAmount?: string;
  outAmount: string;
  otherAmountThreshold?: string;
  swapMode?: string;
  slippageBps?: number;
  platformFee?: any;
  priceImpactPct?: string;
  routePlan?: any[];
  contextSlot?: number;
}

/**
 * Response from Jupiter swap endpoint
 */
export interface SwapResponse {
  swapTransaction: string;
  lastValidBlockHeight?: number;
  prioritizationFeeLamports?: number;
  computeUnitLimit?: number;
  prioritizationType?: {
    computeBudget: {
      microLamports: number;
      estimatedMicroLamports: number;
    };
  };
  dynamicSlippageReport?: {
    slippageBps: number;
    otherAmount: number;
    simulatedIncurredSlippageBps: number;
    amplificationRatio: string;
    categoryName: string;
    heuristicMaxSlippageBps: number;
  };
  simulationError: string | null;
}

/**
 * Result of a complete swap transaction
 */
export interface SwapResult {
  /** Transaction signature */
  signature: string;

  /** Transaction confirmation status */
  confirmationStatus: string;

  /** Output amount received in the swap */
  outAmount?: string;

  /** Price impact percentage */
  priceImpact?: string;
}

/**
 * Priority level definitions for priority fees
 */
export interface PriorityLevel {
  priorityLevelWithMaxLamports: {
    maxLamports: number;
    priorityLevel: 'low' | 'medium' | 'high' | 'veryHigh';
    global?: boolean;
  };
}

/**
 * Input parameters for token search
 */
export interface SearchTokenInput {
  /** Search term (token symbol or name) */
  symbol: string;

  /** Whether to include unknown/unvetted tokens in results */
  includeUnknown?: boolean;

  /** Whether to only return verified tokens */
  onlyVerified?: boolean;
}

/**
 * Token information structure
 */
export interface TokenInfo {
  /** Token symbol (e.g., SOL, USDC) */
  symbol: string;

  /** Token name (e.g., Solana, USD Coin) */
  name: string;

  /** Token mint address */
  address: string;

  /** Token logo URI */
  logoURI?: string;

  /** Number of decimal places */
  decimals: number;

  /** Token tags */
  tags?: string[];

  /** Whether token is verified */
  verified?: boolean;
}
