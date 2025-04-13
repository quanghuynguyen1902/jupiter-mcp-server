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
  PriorityLevel
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
}

// Singleton instance
export const jupiterService = new JupiterService();
