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

/**
 * Input parameters for getting portfolio positions
 */
export interface GetPositionsInput {
  /** Solana wallet address to query */
  address: string;

  /** Optional comma-separated list of platform IDs to filter results */
  platforms?: string;
}

/**
 * Input parameters for getting staked JUP tokens
 */
export interface GetStakedJupInput {
  /** Solana wallet address to query */
  address: string;
}

/**
 * Asset information within a portfolio element
 */
export interface PortfolioAsset {
  /** Token mint address */
  address: string;
  /** Amount of the token */
  amount: number;
  /** USD value of the asset */
  value?: number;
  /** Token price in USD */
  price?: number;
  /** Additional asset attributes */
  attributes?: Record<string, any>;
}

/**
 * Portfolio element (position) information
 */
export interface PortfolioElement {
  /** Network ID (e.g., "solana") */
  networkId: string;
  /** Platform ID (e.g., "jupiter-exchange") */
  platformId: string;
  /** Position label/name */
  label: string;
  /** USD value of the position */
  value: number;
  /** Position type: "Wallet", "Staked", "LiquidityPool", "Farming", "Vault", "Lending", "Vesting", "Deposit", "Rewards", "Airdrop", "Margin", "LimitOrder", "DCA", "SmartDCA", "Leverage" */
  type: string;
  /** Position data containing assets */
  data: {
    /** Array of assets in this position */
    assets: PortfolioAsset[];
  };
}

/**
 * Fetcher report for portfolio data collection
 */
export interface FetcherReport {
  /** Fetcher ID */
  id: string;
  /** Fetch status: "succeeded" or "failed" */
  status: string;
  /** Duration in milliseconds */
  duration: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Token metadata information
 */
export interface TokenMetadata {
  /** Token address */
  address: string;
  /** Token decimals */
  decimals: number;
  /** Token symbol */
  symbol: string;
  /** Token logo URI */
  logoURI?: string;
  /** Token name */
  name?: string;
  /** Token price in USD */
  price?: number;
}

/**
 * Portfolio positions response from Jupiter API
 */
export interface PortfolioPositionsResponse {
  /** Timestamp of the data */
  date: number;
  /** Wallet address queried */
  owner: string;
  /** Status reports from data fetchers */
  fetcherReports: FetcherReport[];
  /** Array of portfolio positions */
  elements: PortfolioElement[];
  /** Query execution time in milliseconds */
  duration: number;
  /** Network-specific token metadata */
  tokenInfo: Record<string, Record<string, TokenMetadata>>;
}

/**
 * Unstaking information for JUP tokens
 */
export interface UnstakingInfo {
  /** Amount being unstaked */
  amount: number;
  /** Unix timestamp when unstaking completes */
  until: number;
}

/**
 * Staked JUP response from Jupiter API
 */
export interface StakedJupResponse {
  /** The quantity of JUP tokens currently staked */
  stakedAmount: number;
  /** List of tokens in the unstaking process */
  unstaking: UnstakingInfo[];
}

/**
 * Platform links information
 */
export interface PlatformLinks {
  /** Website URL */
  website?: string;
  /** Discord invite URL */
  discord?: string;
  /** Telegram group URL */
  telegram?: string;
  /** Twitter profile URL */
  twitter?: string;
  /** GitHub repository URL */
  github?: string;
  /** Medium publication URL */
  medium?: string;
  /** Documentation URL */
  documentation?: string;
}

/**
 * Platform information from Jupiter API
 */
export interface PlatformInfo {
  /** Unique platform identifier */
  id: string;
  /** Platform display name */
  name: string;
  /** URL to platform logo/image */
  image: string;
  /** Platform description */
  description: string;
  /** DeFi Llama platform identifier */
  defiLlamaId: string;
  /** Whether platform is deprecated */
  isDeprecated: boolean;
  /** Array of supported token addresses */
  tokens: string[];
  /** Platform category tags */
  tags: string[];
  /** Social/web links */
  links: PlatformLinks;
}

/**
 * Input parameters for getting token prices
 */
export interface GetPriceInput {
  /** Comma-separated list of token mint addresses */
  ids: string;
}

/**
 * Token price information
 */
export interface TokenPrice {
  /** Token decimal places */
  decimals: number;
  /** Current USD price */
  usdPrice: number;
  /** Associated block identifier */
  blockId?: number | null;
  /** 24-hour price change percentage */
  priceChange24h?: number | null;
}

/**
 * Price response from Jupiter API
 * Key is the token mint address, value is the price info
 */
export interface PriceResponse {
  [tokenAddress: string]: TokenPrice;
}
