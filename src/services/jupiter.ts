import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { walletService } from './wallet.js';
import { GetQuoteInput, BuildSwapTransactionInput, SendSwapTransactionInput } from '../handlers/jupiter.types.js';
// Ensure fetch is available
import '../utils/fetch.js';

/**
 * Service for interacting with Jupiter API
 */
export class JupiterService {
  private readonly apiBaseUrl: string;
  private readonly liteApiBaseUrl: string;
  
  constructor() {
    this.apiBaseUrl = config.jupiter.apiBaseUrl;
    this.liteApiBaseUrl = config.jupiter.liteApiBaseUrl;
  }
  
  /**
   * Get a quote for swapping tokens
   * @param input Quote parameters
   * @returns Quote response
   */
  async getQuote(input: GetQuoteInput): Promise<any> {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append("inputMint", input.inputMint);
      params.append("outputMint", input.outputMint);
      params.append("amount", input.amount);
      
      if (input.slippageBps !== undefined) {
        params.append("slippageBps", input.slippageBps.toString());
      }
      
      if (input.onlyDirectRoutes !== undefined) {
        params.append("onlyDirectRoutes", input.onlyDirectRoutes.toString());
      }
      
      if (input.asLegacyTransaction !== undefined) {
        params.append("asLegacyTransaction", input.asLegacyTransaction.toString());
      }
      
      if (input.maxAccounts !== undefined) {
        params.append("maxAccounts", input.maxAccounts.toString());
      }
      
      if (input.swapMode !== undefined) {
        params.append("swapMode", input.swapMode);
      }
      
      if (input.excludeDexes !== undefined && input.excludeDexes.length > 0) {
        params.append("excludeDexes", input.excludeDexes.join(","));
      }
      
      if (input.platformFeeBps !== undefined) {
        params.append("platformFeeBps", input.platformFeeBps.toString());
      }
      
      // Make the API request
      logger.debug(`Getting quote with params: ${params.toString()}`);
      const response = await fetch(`${this.apiBaseUrl}/quote?${params.toString()}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error getting quote: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const quoteData = await response.json();
      logger.debug('Quote received successfully');
      return quoteData;
    } catch (error) {
      logger.debug('Error getting quote:', error);
      throw new Error(`Error getting quote: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Build a swap transaction using the lite API
   * @param input Build transaction parameters
   * @returns Swap transaction data
   */
  async buildSwapTransaction(input: BuildSwapTransactionInput | { quoteResponse: any; userPublicKey: string }): Promise<any> {
    try {
      // Build the request body according to the lite-api format
      const requestBody: any = {
        quoteResponse: typeof input.quoteResponse === 'string' 
          ? JSON.parse(input.quoteResponse) 
          : input.quoteResponse,
      };
      
      // Add the required userPublicKey
      if (walletService.isInitialized) {
        requestBody.userPublicKey = (input as BuildSwapTransactionInput).userPublicKey || walletService.publicKeyString;
      } else if ((input as BuildSwapTransactionInput).userPublicKey) {
        requestBody.userPublicKey = (input as BuildSwapTransactionInput).userPublicKey;
      } else {
        throw new Error('No wallet initialized and no user public key provided');
      }
      
      // Add priority fee if available
      if ((input as BuildSwapTransactionInput).prioritizationFeeLamports !== undefined) {
        const prioritizationFee = (input as BuildSwapTransactionInput).prioritizationFeeLamports;
        requestBody.prioritizationFeeLamports = {
          priorityLevelWithMaxLamports: {
            maxLamports: prioritizationFee,
            priorityLevel: "veryHigh"
          }
        };
      } else {
        // Add default priority fee
        requestBody.prioritizationFeeLamports = {
          priorityLevelWithMaxLamports: {
            maxLamports: 10000000,
            priorityLevel: "veryHigh"
          }
        };
      }
      
      // Add compute unit limit
      requestBody.dynamicComputeUnitLimit = true;
      
      // Make the API request to the swap endpoint
      logger.debug('Building swap transaction with data:', { userPublicKey: requestBody.userPublicKey });
      const response = await fetch(`${this.liteApiBaseUrl}/swap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error building swap transaction: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const swapData = await response.json();
      logger.debug('Swap transaction built successfully');
      return swapData;
    } catch (error) {
      logger.debug('Error building swap transaction:', error);
      throw new Error(`Error building swap transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Send a swap transaction using the wallet service
   * @param input Swap transaction input
   * @returns Transaction result
   */
  async sendSwapTransaction(input: SendSwapTransactionInput | { swapTransaction: any }): Promise<any> {
    try {
      if (!walletService.isInitialized) {
        throw new Error('Wallet not initialized. Cannot send transaction.');
      }
      
      // Parse the swap transaction if it's a string
      const swapTransaction = typeof input.swapTransaction === 'string'
        ? JSON.parse(input.swapTransaction)
        : input.swapTransaction;
      
      // Extract the transaction data
      const serializedTx = swapTransaction.transaction || swapTransaction.encodedTransaction;
      
      if (!serializedTx) {
        throw new Error('No transaction data found in the swap transaction');
      }
      
      // Sign the transaction if needed
      if (swapTransaction.needsSignature) {
        const signedTx = await this.signSwapTransaction(serializedTx);
        
        // Send the signed transaction
        return await walletService.sendTransaction(signedTx, {
          skipPreflight: (input as SendSwapTransactionInput).skipPreflight,
          maxRetries: (input as SendSwapTransactionInput).maxRetries
        });
      } else {
        // If no signature needed, just send it directly
        return await walletService.sendTransaction(serializedTx, {
          skipPreflight: (input as SendSwapTransactionInput).skipPreflight,
          maxRetries: (input as SendSwapTransactionInput).maxRetries
        });
      }
    } catch (error) {
      logger.debug('Error sending swap transaction:', error);
      throw new Error(`Error sending swap transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Sign a swap transaction with the wallet
   * @param serializedTransaction The serialized transaction to sign
   * @returns Signed transaction
   */
  private async signSwapTransaction(serializedTransaction: string): Promise<string> {
    try {
      return walletService.signTransaction(
        Transaction.from(Buffer.from(serializedTransaction, 'base64'))
      );
    } catch (error) {
      logger.debug('Error signing swap transaction:', error);
      throw new Error(`Failed to sign transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Execute a swap with auto-build and auto-send using the lite API
   * @param quoteInput Quote input parameters
   * @returns Transaction result
   */
  async executeSwap(quoteInput: GetQuoteInput): Promise<any> {
    try {
      if (!walletService.isInitialized) {
        throw new Error('Wallet not initialized. Cannot execute swap.');
      }
      
      logger.debug(`Executing swap from ${quoteInput.inputMint} to ${quoteInput.outputMint} for amount ${quoteInput.amount}`);
      
      // Step 1: Get quote
      const quoteResponse = await this.getQuote(quoteInput);
      logger.debug(`Quote received, price impact: ${quoteResponse.priceImpactPct}%`);
      
      // Step 2: Build transaction with the lite API
      const swapData = await this.buildSwapTransaction({
        quoteResponse,
        userPublicKey: walletService.publicKeyString
      });
      logger.debug('Swap transaction built successfully');
      
      // Step 3: Send the transaction
      const txid = await walletService.sendTransaction(
        swapData.transaction || swapData.encodedTransaction
      );
      
      logger.debug(`Swap executed successfully with signature: ${txid}`);
      return { txid, swapData };
    } catch (error) {
      logger.debug('Error executing swap:', error);
      throw new Error(`Error executing swap: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Singleton instance
export const jupiterService = new JupiterService();
