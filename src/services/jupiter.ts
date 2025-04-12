import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { walletService } from './wallet.js';
import { GetQuoteInput, BuildSwapTransactionInput, SendSwapTransactionInput } from '../handlers/jupiter.types.js';

/**
 * Service for interacting with Jupiter API
 */
export class JupiterService {
  private readonly apiBaseUrl: string;
  
  constructor() {
    this.apiBaseUrl = config.jupiter.apiBaseUrl;
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
      logger.error('Error getting quote:', error);
      throw new Error(`Error getting quote: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Build a swap transaction
   * @param input Build transaction parameters
   * @returns Swap transaction data
   */
  async buildSwapTransaction(input: BuildSwapTransactionInput | { quoteResponse: any }): Promise<any> {
    try {
      // Build the request body
      const requestBody: any = {
        quoteResponse: typeof input.quoteResponse === 'string' 
          ? JSON.parse(input.quoteResponse) 
          : input.quoteResponse,
      };
      
      // If wallet is initialized, use its public key by default
      if (walletService.isInitialized) {
        requestBody.userPublicKey = (input as BuildSwapTransactionInput).userPublicKey || walletService.publicKeyString;
      } else if ((input as BuildSwapTransactionInput).userPublicKey) {
        requestBody.userPublicKey = (input as BuildSwapTransactionInput).userPublicKey;
      } else {
        throw new Error('No wallet initialized and no user public key provided');
      }
      
      // Add additional parameters if available
      if ((input as BuildSwapTransactionInput).prioritizationFeeLamports !== undefined) {
        requestBody.prioritizationFeeLamports = (input as BuildSwapTransactionInput).prioritizationFeeLamports;
      }
      
      if ((input as BuildSwapTransactionInput).computeUnitPriceMicroLamports !== undefined) {
        requestBody.computeUnitPriceMicroLamports = (input as BuildSwapTransactionInput).computeUnitPriceMicroLamports;
      }
      
      if ((input as BuildSwapTransactionInput).asLegacyTransaction !== undefined) {
        requestBody.asLegacyTransaction = (input as BuildSwapTransactionInput).asLegacyTransaction;
      }
      
      // Make the API request
      logger.debug('Building swap transaction with data:', { userPublicKey: requestBody.userPublicKey });
      const response = await fetch(`${this.apiBaseUrl}/swap-instructions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
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
      logger.error('Error building swap transaction:', error);
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
      
      // Check if we need to sign the transaction
      if (swapTransaction.needsSignature) {
        // Deserialize the transaction
        const serializedTx = swapTransaction.serializedTransaction;
        // Sign the transaction with our wallet
        const signedTx = await this.signSwapTransaction(serializedTx);
        
        // Send the signed transaction
        return this.sendSignedTransaction(signedTx, {
          skipPreflight: (input as SendSwapTransactionInput).skipPreflight,
          maxRetries: (input as SendSwapTransactionInput).maxRetries
        });
      } else {
        // If no signature needed, just send it directly
        return this.sendSignedTransaction(swapTransaction.serializedTransaction, {
          skipPreflight: (input as SendSwapTransactionInput).skipPreflight,
          maxRetries: (input as SendSwapTransactionInput).maxRetries
        });
      }
    } catch (error) {
      logger.error('Error sending swap transaction:', error);
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
      logger.error('Error signing swap transaction:', error);
      throw new Error(`Failed to sign transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Send a signed transaction
   * @param serializedTransaction The signed serialized transaction
   * @param options Send options
   * @returns Transaction result
   */
  private async sendSignedTransaction(
    serializedTransaction: string,
    options: { skipPreflight?: boolean; maxRetries?: number } = {}
  ): Promise<any> {
    try {
      // Send the transaction using Jupiter API
      const response = await fetch(`${this.apiBaseUrl}/swap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          serializedTransaction,
          options: {
            skipPreflight: options.skipPreflight || false,
            maxRetries: options.maxRetries || 3
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error sending transaction: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      logger.info(`Transaction sent with signature: ${result.txid}`);
      return result;
    } catch (error) {
      logger.error('Error sending signed transaction:', error);
      throw new Error(`Failed to send transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Execute a swap with auto-build and auto-send
   * @param quoteInput Quote input parameters
   * @returns Transaction result
   */
  async executeSwap(quoteInput: GetQuoteInput): Promise<any> {
    try {
      if (!walletService.isInitialized) {
        throw new Error('Wallet not initialized. Cannot execute swap.');
      }
      
      logger.info(`Executing swap from ${quoteInput.inputMint} to ${quoteInput.outputMint} for amount ${quoteInput.amount}`);
      
      // Step 1: Get quote
      const quoteResponse = await this.getQuote(quoteInput);
      logger.info(`Quote received, price impact: ${quoteResponse.priceImpactPct}%`);
      
      // Step 2: Build transaction
      const swapTransaction = await this.buildSwapTransaction({
        quoteResponse,
        userPublicKey: walletService.publicKeyString
      });
      logger.info('Swap transaction built successfully');
      
      // Step 3: Send transaction
      const result = await this.sendSwapTransaction({
        swapTransaction
      });
      
      logger.info(`Swap executed successfully with signature: ${result.txid}`);
      return result;
    } catch (error) {
      logger.error('Error executing swap:', error);
      throw new Error(`Error executing swap: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Singleton instance
export const jupiterService = new JupiterService();
