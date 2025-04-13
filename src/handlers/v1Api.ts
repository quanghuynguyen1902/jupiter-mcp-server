import { ToolResultSchema } from "../types.js";
import { createErrorResponse, createSuccessResponse, validatePublicKey } from "./utils.js";
import { GetV1QuoteInput, ExecuteV1SwapInput } from "./v1Api.types.js";
import { PublicKey } from "@solana/web3.js";
import { v1ApiClient } from "../services/v1Api.js";
import { walletService } from "../services/wallet.js";
import { logger } from "../utils/logger.js";

/**
 * Handler for executing a swap using the optimized V1 API
 * @param input Swap parameters
 * @returns Success or error response
 */
export const executeV1SwapHandler = async (input: ExecuteV1SwapInput): Promise<ToolResultSchema> => {
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
    
    // Ensure amount is an integer
    const amount = parseInt(input.amount, 10);
    if (isNaN(amount)) {
      return createErrorResponse("Invalid amount. Please provide a valid number.");
    }
    
    // Use the V1 API client to execute the complete swap flow
    logger.debug(`Executing V1 API swap from ${input.inputMint} to ${input.outputMint} for amount ${amount}`);
    const result = await v1ApiClient.completeSwap(
      input.inputMint,
      input.outputMint,
      amount,
      slippageBps,
      input.onlyDirectRoutes,
      input.dynamicComputeUnits,
      input.dynamicSlippage
    );
    
    return createSuccessResponse(`Swap executed successfully using Jupiter V1 API!
Transaction signature: ${result.signature}
Status: ${result.confirmationStatus}
Output amount: ${result.outAmount || "Unknown"}
Price impact: ${result.priceImpact || "Unknown"}`);
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
export const getV1QuoteHandler = async (input: GetV1QuoteInput): Promise<ToolResultSchema> => {
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
    
    // Ensure amount is an integer
    const amount = parseInt(input.amount, 10);
    if (isNaN(amount)) {
      return createErrorResponse("Invalid amount. Please provide a valid number.");
    }
    
    // Use the V1 API client to get a quote
    logger.debug(`Getting V1 API quote from ${input.inputMint} to ${input.outputMint} for amount ${amount}`);
    const quoteData = await v1ApiClient.getQuote({
      inputMint: input.inputMint,
      outputMint: input.outputMint,
      amount,
      slippageBps,
      restrictIntermediateTokens: input.onlyDirectRoutes !== true
    });
    
    // Format the quote data in a more readable way
    const formattedResponse = {
      inputMint: quoteData.inputMint,
      outputMint: quoteData.outputMint,
      inAmount: quoteData.inAmount || input.amount,
      outAmount: quoteData.outAmount,
      priceImpactPct: quoteData.priceImpactPct || "0",
      slippageBps: slippageBps,
      routePlanLength: quoteData.routePlan?.length || 0
    };
    
    return createSuccessResponse(`V1 API Quote Summary:
Input Token: ${formattedResponse.inputMint}
Output Token: ${formattedResponse.outputMint}
Input Amount: ${formattedResponse.inAmount}
Output Amount: ${formattedResponse.outAmount}
Price Impact: ${formattedResponse.priceImpactPct}%
Slippage Tolerance: ${formattedResponse.slippageBps / 100}%
Route Hops: ${formattedResponse.routePlanLength}`);
  } catch (error) {
    logger.debug("Error in getV1QuoteHandler:", error);
    return createErrorResponse(`Error getting V1 API quote: ${error instanceof Error ? error.message : String(error)}`);
  }
};
