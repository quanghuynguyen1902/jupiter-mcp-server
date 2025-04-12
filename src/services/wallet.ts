import bs58 from 'bs58';
import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

/**
 * Wallet service to manage private key and sign transactions
 */
class WalletService {
  private _keypair: Keypair | null = null;
  private _connection: Connection | null = null;
  
  /**
   * Initialize the wallet with the private key from the environment
   */
  initialize(): boolean {
    try {
      if (!config.solana.privateKey) {
        logger.warn('No private key provided in environment variables. Wallet features will be disabled.');
        return false;
      }
      
      // Decode the base58 private key
      const decodedKey = bs58.decode(config.solana.privateKey);
      this._keypair = Keypair.fromSecretKey(decodedKey);
      
      // Initialize connection
      this._connection = new Connection(config.solana.rpcEndpoint, 'confirmed');
      
      logger.info(`Wallet initialized with public key: ${this.publicKey.toString()}`);
      return true;
    } catch (error) {
      logger.error('Failed to initialize wallet:', error);
      return false;
    }
  }
  
  /**
   * Get the wallet public key
   */
  get publicKey(): PublicKey {
    if (!this._keypair) {
      throw new Error('Wallet not initialized');
    }
    return this._keypair.publicKey;
  }
  
  /**
   * Get the wallet public key as a string
   */
  get publicKeyString(): string {
    return this.publicKey.toString();
  }
  
  /**
   * Get the connection object
   */
  get connection(): Connection {
    if (!this._connection) {
      throw new Error('Connection not initialized');
    }
    return this._connection;
  }
  
  /**
   * Check if the wallet is initialized
   */
  get isInitialized(): boolean {
    return !!this._keypair && !!this._connection;
  }
  
  /**
   * Sign a transaction
   * @param transaction Transaction to sign
   * @returns Signed transaction (base64 encoded string)
   */
  signTransaction(transaction: Transaction | VersionedTransaction): string {
    if (!this._keypair) {
      throw new Error('Wallet not initialized');
    }
    
    try {
      if (transaction instanceof VersionedTransaction) {
        transaction.sign([this._keypair]);
        return Buffer.from(transaction.serialize()).toString('base64');
      } else {
        transaction.partialSign(this._keypair);
        return transaction.serialize().toString('base64');
      }
    } catch (error) {
      logger.error('Error signing transaction:', error);
      throw new Error(`Failed to sign transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Send a transaction
   * @param serializedTransaction Base64 encoded serialized transaction
   * @param options Send options
   * @returns Transaction signature
   */
  async sendTransaction(
    serializedTransaction: string, 
    options: { skipPreflight?: boolean; maxRetries?: number } = {}
  ): Promise<string> {
    if (!this._connection) {
      throw new Error('Connection not initialized');
    }
    
    try {
      const buffer = Buffer.from(serializedTransaction, 'base64');
      const signature = await this._connection.sendRawTransaction(buffer, {
        skipPreflight: options.skipPreflight || false,
        maxRetries: options.maxRetries || 3,
      });
      
      logger.info(`Transaction sent with signature: ${signature}`);
      return signature;
    } catch (error) {
      logger.error('Error sending transaction:', error);
      throw new Error(`Failed to send transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Singleton instance
export const walletService = new WalletService();
