import { ToolResultSchema } from "../types.js";
import { createErrorResponse, createSuccessResponse, validatePublicKey } from "./utils.js";
import { GetQuoteInput, BuildSwapTransactionInput, SendSwapTransactionInput } from "./jupiter.types.js";
import { PublicKey } from "@solana/web3.js";
import { jupiterService } from "../services/jupiter.js";
import { walletService } from "../services/wallet.js";
import { logger } from "../utils/logger.js";

export const getQuoteHandler = async (input: GetQuoteInput): Promise<ToolResultSchema> => {
  try {
    // Validate input and output mints
    const inputMintResult = validatePublicKey(input.inputMint);
    if (!(inputMintResult instanceof PublicKey)) {
      return inputMintResult;
    }
    
    const outputMintResult = validatePublicKey(input.outputMint);
    if (!(outputMintResult instanceof PublicKey)) {
      return outputMintResult;
    }
    
    // Ensure amount is an integer
    const parsedAmount = parseInt(input.amount, 10);
    if (isNaN(parsedAmount)) {
      return createErrorResponse("Invalid amount. Please provide a valid number.");
    }
    
    // Create a new input with parsed integer amount
    const parsedInput = {
      ...input,
      amount: parsedAmount.toString()
    };
    
    // Use the Jupiter service to get the quote
    const quoteData = await jupiterService.getQuote(parsedInput);
    
    return createSuccessResponse(`Quote: ${JSON.stringify(quoteData, null, 2)}`);
  } catch (error) {
    logger.debug("Error in getQuoteHandler:", error);
    return createErrorResponse(`Error getting quote: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const buildSwapTransactionHandler = async (input: BuildSwapTransactionInput): Promise<ToolResultSchema> => {
  try {
    // Validate user public key
    const userPublicKeyResult = validatePublicKey(input.userPublicKey);
    if (!(userPublicKeyResult instanceof PublicKey)) {
      return userPublicKeyResult;
    }
    
    // Use the Jupiter service to build the swap transaction
    const swapData = await jupiterService.buildSwapTransaction(input);
    
    return createSuccessResponse(`Swap transaction: ${JSON.stringify(swapData, null, 2)}`);
  } catch (error) {
    logger.debug("Error in buildSwapTransactionHandler:", error);
    return createErrorResponse(`Error building swap transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const sendSwapTransactionHandler = async (input: SendSwapTransactionInput): Promise<ToolResultSchema> => {
  try {
    // Use the Jupiter service to send the swap transaction
    const swapResult = await jupiterService.sendSwapTransaction(input);
    
    return createSuccessResponse(`Swap result: ${JSON.stringify(swapResult, null, 2)}`);
  } catch (error) {
    logger.debug("Error in sendSwapTransactionHandler:", error);
    return createErrorResponse(`Error sending swap transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const executeSwapHandler = async (input: GetQuoteInput): Promise<ToolResultSchema> => {
  try {
    // Check if wallet is initialized
    if (!walletService.isInitialized) {
      return createErrorResponse("Wallet not initialized. Cannot execute swap. Please check your environment variables for SOLANA_PRIVATE_KEY.");
    }
    
    // Validate input and output mints
    const inputMintResult = validatePublicKey(input.inputMint);
    if (!(inputMintResult instanceof PublicKey)) {
      return inputMintResult;
    }
    
    const outputMintResult = validatePublicKey(input.outputMint);
    if (!(outputMintResult instanceof PublicKey)) {
      return outputMintResult;
    }
    
    // Ensure amount is an integer
    const parsedAmount = parseInt(input.amount, 10);
    if (isNaN(parsedAmount)) {
      return createErrorResponse("Invalid amount. Please provide a valid number.");
    }
    
    // Create a new input with parsed integer amount
    const parsedInput = {
      ...input,
      amount: parsedAmount.toString()
    };
    
    // Use the wallet service to execute the complete swap flow
    const result = await jupiterService.executeSwap(parsedInput);
    
    if (result.txid) {
      return createSuccessResponse(`Swap executed successfully! Transaction signature: ${result.txid}\n\nDetails: ${JSON.stringify(result.swapData || {}, null, 2)}`);
    } else {
      return createSuccessResponse(`Swap executed: ${JSON.stringify(result, null, 2)}`);
    }
  } catch (error) {
    logger.debug("Error in executeSwapHandler:", error);
    return createErrorResponse(`Error executing swap: ${error instanceof Error ? error.message : String(error)}`);
  }
};
