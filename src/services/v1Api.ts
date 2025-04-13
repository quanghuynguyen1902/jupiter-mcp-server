import { Keypair, VersionedTransaction, Connection } from '@solana/web3.js';
import { logger } from '../utils/logger.js';
import { walletService } from './wallet.js';
import { config } from '../config.js';
// Import bs58 for decoding private keys
import bs58 from 'bs58';
// Ensure fetch is available
import '../utils/fetch.js';

interface QuoteParams {
  inputMint: string;
  outputMint: string;
  amount: number | string;
  slippageBps: number;
  restrictIntermediateTokens?: boolean;
}

interface QuoteResponse {
  inputMint: string;
  outputMint: string;
  outAmount: string;
  inAmount?: string;
  otherAmountThreshold?: string;
  swapMode?: string;
  slippageBps?: number;
  platformFee?: any;
  priceImpactPct?: string;
  routePlan?: any[];
  contextSlot?: number;
}

interface ExecuteResponse {
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
 * Jupiter V1 API Client for more optimized swap performance
 */
export class V1ApiClient {
  private readonly baseUrl: string = "https://lite-api.jup.ag/swap/v1";
  
  /**
   * Get a quote for swapping tokens using V1 API
   * @param params Quote parameters
   * @returns Quote response
   */
  async getQuote(params: QuoteParams): Promise<QuoteResponse> {
    try {
      const url = new URL(`${this.baseUrl}/quote`);
      url.searchParams.append("inputMint", params.inputMint);
      url.searchParams.append("outputMint", params.outputMint);
      url.searchParams.append("amount", params.amount.toString());
      url.searchParams.append("slippageBps", params.slippageBps.toString());
      // Restrict intermediate tokens for more stable routes
      url.searchParams.append("restrictIntermediateTokens", 
        params.restrictIntermediateTokens === false ? "false" : "true");

      logger.debug(`Getting V1 API quote with params: ${url.toString()}`);
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data: QuoteResponse = await response.json();
      logger.debug('V1 API quote received successfully');
      return data;
    } catch (error) {
      logger.error("Error fetching V1 API quote:", error);
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
    dynamicSlippage: boolean = true
  ): Promise<ExecuteResponse> {
    try {
      logger.debug('Building V1 API swap transaction');
      const response = await fetch(`${this.baseUrl}/swap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey,
          dynamicComputeUnitLimit, // Estimate compute units dynamically
          dynamicSlippage, // Estimate slippage dynamically
          // Priority fee optimization
          prioritizationFeeLamports: {
            priorityLevelWithMaxLamports: {
              maxLamports: 1000000, // Cap fee at 0.001 SOL
              global: false, // Use local fee market for better estimation
              priorityLevel: "veryHigh", // 75th percentile for better landing
            },
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data: ExecuteResponse = await response.json();
      logger.debug('V1 API swap built successfully');
      return data;
    } catch (error) {
      logger.error("Error building V1 API transaction:", error);
      throw error;
    }
  }
  
  /**
   * Execute a complete swap transaction from quote to execution
   * @param inputMint Input token mint address
   * @param outputMint Output token mint address
   * @param amount Amount to swap in lamports/smallest units
   * @param slippageBps Slippage tolerance in basis points (e.g., 50 = 0.5%)
   * @param onlyDirectRoutes Only use direct routes between input and output tokens
   * @param dynamicComputeUnits Use dynamic compute unit estimation
   * @param dynamicSlippage Use dynamic slippage estimation
   * @returns Transaction details including signature and confirmation
   */
  async completeSwap(
    inputMint: string,
    outputMint: string,
    amount: number | string,
    slippageBps: number = 50,
    onlyDirectRoutes: boolean = false,
    dynamicComputeUnits: boolean = true,
    dynamicSlippage: boolean = true
  ): Promise<{ signature: string; confirmationStatus: string; outAmount?: string; priceImpact?: string }> {
    try {
      if (!walletService.isInitialized) {
        throw new Error('Wallet not initialized. Cannot execute swap.');
      }
      
      // Step 1: Get quote
      const quote = await this.getQuote({
        inputMint,
        outputMint,
        amount,
        slippageBps,
        restrictIntermediateTokens: !onlyDirectRoutes
      });
      
      logger.debug(`Quote received, expected output: ${quote.outAmount}`);
      if (quote.priceImpactPct) {
        logger.debug(`Price impact: ${quote.priceImpactPct}%`);
      }
      
      // Step 2: Execute swap
      const executeResponse = await this.executeSwap(
        quote,
        walletService.publicKeyString,
        dynamicComputeUnits,
        dynamicSlippage
      );
      
      if (executeResponse.simulationError !== null) {
        throw new Error(`Simulation error: ${executeResponse.simulationError}`);
      }
      
      // Step 3: Deserialize the transaction
      const transactionBinary = Buffer.from(executeResponse.swapTransaction, "base64");
      const transaction = VersionedTransaction.deserialize(transactionBinary);
      
      // Step 4: Sign the transaction with the wallet
      // Extract the keypair from bs58-encoded private key
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
      logger.error("Failed to complete V1 API swap:", error);
      throw error;
    }
  }
}

// Singleton instance
export const v1ApiClient = new V1ApiClient();
