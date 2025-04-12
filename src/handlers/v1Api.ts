import { ToolResultSchema } from "../types.js";
import { createErrorResponse, createSuccessResponse, validatePublicKey } from "./utils.js";
import { GetQuoteInput } from "./jupiter.types.js";
import { PublicKey } from "@solana/web3.js";
import { v1ApiClient } from "../services/v1Api.js";
import { walletService } from "../services/wallet.js";
import { logger } from "../utils/logger.js";

/**
 * Handler for executing a swap using the optimized V1 API
 * @param input Swap parameters
 * @returns Success or error response
 */
export const executeV1SwapHandler = async (input: GetQuoteInput): Promise<ToolResultSchema> => {
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
    
    // Parse the slippage if provided or use default
    const slippageBps = input.slippageBps || 50; // Default to 0.5%
    
    // Use the V1 API client to execute the complete swap flow
    logger.debug(`Executing V1 API swap from ${input.inputMint} to ${input.outputMint} for amount ${input.amount}`);
    const result = await v1ApiClient.completeSwap(
      input.inputMint,
      input.outputMint,
      input.amount,
      slippageBps
    );
    
    return createSuccessResponse(`Swap executed successfully using Jupiter V1 API! Transaction signature: ${result.signature}\nStatus: ${result.confirmationStatus}`);
  } catch (error) {
    logger.debug("Error in executeV1SwapHandler:", error);
    return createErrorResponse(`Error executing V1 API swap: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Handler for getting a quote using the V1 API
 * @param input Quote parameters
 * @returns Success or error response with quote details
 */
export const getV1QuoteHandler = async (input: GetQuoteInput): Promise<ToolResultSchema> => {
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
    
    // Parse the slippage if provided or use default
    const slippageBps = input.slippageBps || 50; // Default to 0.5%
    
    // Use the V1 API client to get a quote
    logger.debug(`Getting V1 API quote from ${input.inputMint} to ${input.outputMint} for amount ${input.amount}`);
    const quoteData = await v1ApiClient.getQuote({
      inputMint: input.inputMint,
      outputMint: input.outputMint,
      amount: input.amount,
      slippageBps,
      restrictIntermediateTokens: input.onlyDirectRoutes !== true
    });
    
    return createSuccessResponse(`V1 API Quote: ${JSON.stringify(quoteData, null, 2)}`);
  } catch (error) {
    logger.debug("Error in getV1QuoteHandler:", error);
    return createErrorResponse(`Error getting V1 API quote: ${error instanceof Error ? error.message : String(error)}`);
  }
};
