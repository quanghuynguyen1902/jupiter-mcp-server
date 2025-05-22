import { Keypair, Connection, VersionedTransaction } from '@solana/web3.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { walletService } from './wallet.js';
import {
  QuoteInput,
  SwapInput,
  QuoteResponse,
  SwapResponse,
  SwapResult,
  PriorityLevel,
  TokenInfo,
  SearchTokenInput
} from '../handlers/jupiter.types.js';
// Import bs58 for decoding private keys
import bs58 from 'bs58';
// Ensure fetch is available
import '../utils/fetch.js';

/**
 * Jupiter API service for optimized swap performance
 * Combines the best of both v1Api and jupiter implementations
 */
export class JupiterService {
  private readonly baseUrl: string;
  private readonly tokenListUrl: string = 'https://token.jup.ag/all';
  private tokenList: TokenInfo[] = [];
  private isTokenListInitialized: boolean = false;
  private lastTokenListFetchTime: number = 0;
  // Cache duration (1 hour)
  private readonly CACHE_DURATION: number = 60 * 60 * 1000;

  constructor() {
    this.baseUrl = config.jupiter.apiBaseUrl;
  }

  /**
   * Get a quote for swapping tokens
   * @param params Quote parameters
   * @returns Quote response
   */
  async getQuote(params: QuoteInput): Promise<QuoteResponse> {
    try {
      const url = new URL(`${this.baseUrl}/quote`);
      url.searchParams.append("inputMint", params.inputMint);
      url.searchParams.append("outputMint", params.outputMint);
      url.searchParams.append("amount", params.amount.toString());

      if (params.slippageBps !== undefined) {
        url.searchParams.append("slippageBps", params.slippageBps.toString());
      } else {
        // Default slippage of 0.5%
        url.searchParams.append("slippageBps", "50");
      }

      // Handle route restrictions (direct routes setting)
      if (params.onlyDirectRoutes === true) {
        url.searchParams.append("onlyDirectRoutes", "true");
      } else {
        // By default, enable restrictIntermediateTokens for more stable routes
        url.searchParams.append("restrictIntermediateTokens", "true");
      }

      logger.debug(`Getting quote with params: ${url.toString()}`);
      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data: QuoteResponse = await response.json();
      logger.debug('Quote received successfully');
      return data;
    } catch (error) {
      logger.error("Error fetching quote:", error);
      throw error;
    }
  }

  /**
   * Execute a swap transaction with optimized parameters
   * @param quoteResponse Quote response from getQuote
   * @param userPublicKey User's public key
   * @param dynamicComputeUnitLimit Use dynamic compute unit estimation
   * @param dynamicSlippage Use dynamic slippage estimation
   * @returns Execute response with transaction details
   */
  async executeSwap(
      quoteResponse: QuoteResponse,
      userPublicKey: string,
      dynamicComputeUnitLimit: boolean = true,
      dynamicSlippage: boolean = true,
      priorityFee?: PriorityLevel
  ): Promise<SwapResponse> {
    try {
      logger.debug('Building swap transaction');

      // Prepare the request body
      const requestBody: any = {
        quoteResponse,
        userPublicKey,
        dynamicComputeUnitLimit,
        dynamicSlippage
      };

      // Add priority fee if specified, otherwise use default
      if (priorityFee) {
        requestBody.prioritizationFeeLamports = priorityFee;
      } else {
        // Default priority fee optimization
        requestBody.prioritizationFeeLamports = {
          priorityLevelWithMaxLamports: {
            maxLamports: 1000000, // Cap fee at 0.001 SOL
            global: false, // Use local fee market for better estimation
            priorityLevel: "veryHigh", // 75th percentile for better landing
          }
        };
      }

      // Make the API request to the swap endpoint
      const response = await fetch(`${this.baseUrl}/swap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data: SwapResponse = await response.json();
      logger.debug('Swap transaction built successfully');
      return data;
    } catch (error) {
      logger.error("Error building swap transaction:", error);
      throw error;
    }
  }

  /**
   * Execute a complete swap transaction from quote to execution
   * @param params Swap parameters
   * @returns Transaction details including signature and confirmation
   */
  async completeSwap(params: SwapInput): Promise<SwapResult> {
    try {
      if (!walletService.isInitialized) {
        throw new Error('Wallet not initialized. Cannot execute swap.');
      }

      // Ensure amount is a valid number
      const amount = parseInt(params.amount, 10);
      if (isNaN(amount)) {
        throw new Error('Invalid amount. Please provide a valid number.');
      }

      // Parse the slippage if provided or use default
      const slippageBps = params.slippageBps || 50; // Default to 0.5%

      logger.debug(`Executing swap from ${params.inputMint} to ${params.outputMint} for amount ${amount}`);

      // Step 1: Get quote
      const quote = await this.getQuote({
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        amount: amount.toString(),
        slippageBps,
        onlyDirectRoutes: params.onlyDirectRoutes
      });

      logger.debug(`Quote received, expected output: ${quote.outAmount}`);
      if (quote.priceImpactPct) {
        logger.debug(`Price impact: ${quote.priceImpactPct}%`);
      }

      // Step 2: Execute swap
      const executeResponse = await this.executeSwap(
          quote,
          walletService.publicKeyString,
          params.dynamicComputeUnits !== false, // Default to true
          params.dynamicSlippage !== false      // Default to true
      );

      if (executeResponse.simulationError) {
        throw new Error(`Simulation error: ${executeResponse.simulationError}`);
      }

      // Step 3: Deserialize the transaction
      const transactionBinary = Buffer.from(executeResponse.swapTransaction, "base64");
      const transaction = VersionedTransaction.deserialize(transactionBinary);

      // Step 4: Sign the transaction with the wallet
      const decodedKey = bs58.decode(config.solana.privateKey);
      const keypair = Keypair.fromSecretKey(decodedKey);
      transaction.sign([keypair]);

      // Step 5: Serialize the transaction back to binary format
      const signedTransactionBinary = transaction.serialize();

      // Step 6: Send the transaction
      logger.debug('Sending signed transaction to Solana network...');
      const connection = new Connection(
          config.solana.rpcEndpoint,
          'confirmed'
      );

      const signature = await connection.sendRawTransaction(signedTransactionBinary, {
        maxRetries: 2,
        skipPreflight: true
      });

      logger.debug(`Transaction sent with signature: ${signature}`);

      // Step 7: Confirm the transaction
      const confirmation = await connection.confirmTransaction(signature, 'processed');

      if (confirmation.value.err) {
        logger.error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      logger.debug(`Transaction successful: ${signature}`);
      return {
        signature,
        confirmationStatus: 'confirmed',
        outAmount: quote.outAmount,
        priceImpact: quote.priceImpactPct
      };
    } catch (error) {
      logger.error("Failed to complete swap:", error);
      throw error;
    }
  }

  /**
   * Format quote result in a user-friendly way
   * @param quote Quote response from Jupiter API
   * @param inputAmount Original input amount
   * @param slippageBps Slippage tolerance in basis points
   * @returns Formatted quote summary
   */
  formatQuoteResult(quote: QuoteResponse, inputAmount: string, slippageBps: number = 50): string {
    return `Quote Summary:
Input Token: ${quote.inputMint}
Output Token: ${quote.outputMint}
Input Amount: ${quote.inAmount || inputAmount}
Output Amount: ${quote.outAmount}
Price Impact: ${quote.priceImpactPct || "0"}%
Slippage Tolerance: ${slippageBps / 100}%
Route Hops: ${quote.routePlan?.length || 0}`;
  }

  /**
   * Format swap result in a user-friendly way
   * @param result Swap result from Jupiter API
   * @returns Formatted swap summary
   */
  formatSwapResult(result: SwapResult): string {
    return `Swap executed successfully!
Transaction signature: ${result.signature}
Status: ${result.confirmationStatus}
Output amount: ${result.outAmount || "Unknown"}
Price impact: ${result.priceImpact || "Unknown"}%`;
  }

  /**
   * Load token list from Jupiter API
   * @returns Promise that resolves when token list is loaded
   */
  async loadTokenList(): Promise<void> {
    try {
      const now = Date.now();
      // If loaded within the last hour, don't reload
      if (this.isTokenListInitialized && now - this.lastTokenListFetchTime < this.CACHE_DURATION) {
        logger.debug('Using cached token list');
        return;
      }

      logger.debug('Loading token list from Jupiter API...');

      // Use Jupiter API to fetch token list
      const response = await fetch(this.tokenListUrl);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      this.tokenList = data.map((token: any) => ({
        symbol: token.symbol,
        name: token.name,
        address: token.address,
        logoURI: token.logoURI,
        decimals: token.decimals,
        tags: token.tags,
        verified: !token.tags?.includes('unvetted')
      }));

      logger.debug(`Loaded ${this.tokenList.length} tokens`);
      this.isTokenListInitialized = true;
      this.lastTokenListFetchTime = now;
    } catch (error) {
      logger.error('Error loading token list:', error);
      throw error;
    }
  }

  /**
   * Search tokens by symbol or name
   * @param query Search query (symbol or name)
   * @param options Search options
   * @returns Matching tokens
   */
  async searchTokens(
      query: string,
      options: { includeUnknown?: boolean; onlyVerified?: boolean } = {}
  ): Promise<TokenInfo[]> {
    try {
      // Ensure token list is loaded
      if (!this.isTokenListInitialized) {
        await this.loadTokenList();
      }

      // Normalize search query
      const normalizedQuery = query.toLowerCase().trim();

      logger.debug(`Searching for token with query: "${normalizedQuery}"`);

      // Filter matching tokens
      let results = this.tokenList.filter(token => {
        // Search by symbol or name
        const symbolMatch = token.symbol.toLowerCase().includes(normalizedQuery);
        const nameMatch = token.name.toLowerCase().includes(normalizedQuery);

        // Apply filters
        let passesFilters = true;

        if (options.onlyVerified && !token.verified) {
          passesFilters = false;
        }

        if (!options.includeUnknown && token.tags?.includes('unvetted')) {
          passesFilters = false;
        }

        return (symbolMatch || nameMatch) && passesFilters;
      });

      // Sort results: prioritize exact symbol matches
      results.sort((a, b) => {
        // Exact match to symbol
        if (a.symbol.toLowerCase() === normalizedQuery) return -1;
        if (b.symbol.toLowerCase() === normalizedQuery) return 1;

        // Then match at start of symbol
        if (a.symbol.toLowerCase().startsWith(normalizedQuery)) return -1;
        if (b.symbol.toLowerCase().startsWith(normalizedQuery)) return 1;

        // Then exact match to name
        if (a.name.toLowerCase() === normalizedQuery) return -1;
        if (b.name.toLowerCase() === normalizedQuery) return 1;

        // Finally verified status
        if (a.verified && !b.verified) return -1;
        if (!a.verified && b.verified) return 1;

        return 0;
      });

      logger.debug(`Found ${results.length} tokens matching "${query}"`);

      // Limit number of results
      return results.slice(0, 10);
    } catch (error) {
      logger.error('Error searching tokens:', error);
      throw error;
    }
  }

  /**
   * Get token info by mint address
   * @param mintAddress Token mint address
   * @returns Token info or null if not found
   */
  async getTokenByMint(mintAddress: string): Promise<TokenInfo | null> {
    try {
      // Ensure token list is loaded
      if (!this.isTokenListInitialized) {
        await this.loadTokenList();
      }

      logger.debug(`Looking up token by mint address: ${mintAddress}`);

      return this.tokenList.find(token =>
          token.address.toLowerCase() === mintAddress.toLowerCase()
      ) || null;
    } catch (error) {
      logger.error('Error getting token by mint:', error);
      throw error;
    }
  }

  /**
   * Format token search results in a user-friendly way
   * @param tokens Array of matching tokens
   * @param query Original search query
   * @returns Formatted token results
   */
  formatTokenResults(tokens: TokenInfo[], query: string): string {
    if (tokens.length === 0) {
      return `No tokens found matching "${query}"`;
    }

    let result = `Found ${tokens.length} tokens matching "${query}":\n\n`;

    tokens.forEach((token, index) => {
      result += `${index + 1}. ${token.symbol} (${token.name})\n`;
      result += `   Mint: ${token.address}\n`;
      result += `   Decimals: ${token.decimals}\n`;
      result += `   Verified: ${token.verified ? 'Yes' : 'No'}\n`;

      if (index < tokens.length - 1) {
        result += '\n';
      }
    });

    result += `\nYou can use any of these mint addresses for token swaps.`;

    return result;
  }
}

// Singleton instance
export const jupiterService = new JupiterService();
