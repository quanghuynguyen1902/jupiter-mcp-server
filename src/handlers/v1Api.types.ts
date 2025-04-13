/**
 * Input parameters for a swap quote
 */
export interface GetV1QuoteInput {
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
 * Interface for executing a token swap
 */
export interface ExecuteV1SwapInput extends GetV1QuoteInput {
  /** Optional dynamic compute unit flag */
  dynamicComputeUnits?: boolean;
  
  /** Optional dynamic slippage flag */
  dynamicSlippage?: boolean;
}
