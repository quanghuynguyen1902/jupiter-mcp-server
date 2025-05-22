import { ToolResultSchema } from "../types.js";
import { createErrorResponse, createSuccessResponse, validatePublicKey } from "./utils.js";
import { QuoteInput, SwapInput, SearchTokenInput } from "./jupiter.types.js";
import { PublicKey } from "@solana/web3.js";
import { jupiterService } from "../services/jupiter.js";
import { walletService } from "../services/wallet.js";
import { logger } from "../utils/logger.js";

/**
 * Handler for getting a quote for token swap
 * @param input Quote parameters
 * @returns Success or error response with quote details
 */
export const getQuoteHandler = async (input: QuoteInput): Promise<ToolResultSchema> => {
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

    // Use the Jupiter service to get a quote
    logger.debug(`Getting quote from ${input.inputMint} to ${input.outputMint} for amount ${amount}`);
    const quoteData = await jupiterService.getQuote({
      inputMint: input.inputMint,
      outputMint: input.outputMint,
      amount: amount.toString(),
      slippageBps,
      onlyDirectRoutes: input.onlyDirectRoutes
    });

    // Format the quote in a user-friendly way
    const formattedQuote = jupiterService.formatQuoteResult(quoteData, input.amount, slippageBps);

    return createSuccessResponse(formattedQuote);
  } catch (error) {
    logger.debug("Error in getQuoteHandler:", error);
    return createErrorResponse(`Error getting quote: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Handler for executing a token swap
 * @param input Swap parameters
 * @returns Success or error response
 */
export const executeSwapHandler = async (input: SwapInput): Promise<ToolResultSchema> => {
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
    const amount = parseInt(input.amount, 10);
    if (isNaN(amount)) {
      return createErrorResponse("Invalid amount. Please provide a valid number.");
    }

    // Use the Jupiter service to execute the complete swap flow
    logger.debug(`Executing swap from ${input.inputMint} to ${input.outputMint} for amount ${amount}`);

    const result = await jupiterService.completeSwap({
      inputMint: input.inputMint,
      outputMint: input.outputMint,
      amount: amount.toString(),
      slippageBps: input.slippageBps,
      onlyDirectRoutes: input.onlyDirectRoutes,
      dynamicComputeUnits: input.dynamicComputeUnits,
      dynamicSlippage: input.dynamicSlippage
    });

    // Format the result in a user-friendly way
    const formattedResult = jupiterService.formatSwapResult(result);

    return createSuccessResponse(formattedResult);
  } catch (error) {
    logger.debug("Error in executeSwapHandler:", error);
    return createErrorResponse(`Error executing swap: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Handler for searching token mints by symbol or name
 * @param input Search parameters
 * @returns Success or error response with token details
 */
export const searchTokenHandler = async (input: SearchTokenInput): Promise<ToolResultSchema> => {
  try {
    // Validate input
    if (!input.symbol || input.symbol.trim() === "") {
      return createErrorResponse("Invalid search term. Please provide a valid token symbol or name.");
    }

    logger.debug(`Searching for tokens with query: ${input.symbol}`);

    // Default options
    const includeUnknown: boolean = input.includeUnknown === true;
    const onlyVerified: boolean = input.onlyVerified !== false; // Default to true

    // Search tokens
    const tokens = await jupiterService.searchTokens(input.symbol, {
      includeUnknown,
      onlyVerified
    });

    if (tokens.length === 0) {
      return createSuccessResponse(`No tokens found matching "${input.symbol}"`);
    }

    // Format the token results for response
    const formattedTokens = tokens.map(token => ({
      symbol: token.symbol,
      name: token.name,
      mint: token.address,
      decimals: token.decimals,
      verified: token.verified
    }));

    // Get formatted output
    const formattedOutput = jupiterService.formatTokenResults(tokens, input.symbol);

    return createSuccessResponse( `Found ${tokens.length} tokens matching "${input.symbol}"`);
  } catch (error) {
    logger.debug("Error in searchTokenHandler:", error);
    return createErrorResponse(`Error searching for tokens: ${error instanceof Error ? error.message : String(error)}`);
  }
};
