import { ToolResultSchema } from "../types.js";
import { createErrorResponse, createSuccessResponse, validatePublicKey } from "./utils.js";
import { GetQuoteInput, BuildSwapTransactionInput, SendSwapTransactionInput } from "./jupiter.types.js";
import { PublicKey } from "@solana/web3.js";

const JUPITER_API_BASE_URL = "https://quote-api.jup.ag/v6";

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
    const response = await fetch(`${JUPITER_API_BASE_URL}/quote?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      return createErrorResponse(`Error getting quote: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const quoteData = await response.json();
    return createSuccessResponse(`Quote: ${JSON.stringify(quoteData, null, 2)}`);
  } catch (error) {
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
    
    // Parse the quote response
    let quoteResponse;
    try {
      quoteResponse = JSON.parse(input.quoteResponse);
    } catch (error) {
      return createErrorResponse(`Invalid quote response: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Build the request body
    const requestBody: any = {
      quoteResponse,
      userPublicKey: input.userPublicKey
    };
    
    if (input.prioritizationFeeLamports !== undefined) {
      requestBody.prioritizationFeeLamports = input.prioritizationFeeLamports;
    }
    
    if (input.computeUnitPriceMicroLamports !== undefined) {
      requestBody.computeUnitPriceMicroLamports = input.computeUnitPriceMicroLamports;
    }
    
    if (input.asLegacyTransaction !== undefined) {
      requestBody.asLegacyTransaction = input.asLegacyTransaction;
    }
    
    // Make the API request
    const response = await fetch(`${JUPITER_API_BASE_URL}/swap-instructions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return createErrorResponse(`Error building swap transaction: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const swapData = await response.json();
    return createSuccessResponse(`Swap transaction: ${JSON.stringify(swapData, null, 2)}`);
  } catch (error) {
    return createErrorResponse(`Error building swap transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const sendSwapTransactionHandler = async (input: SendSwapTransactionInput): Promise<ToolResultSchema> => {
  try {
    // Build the request body
    const requestBody: any = {};
    
    if (input.swapTransaction) {
      try {
        requestBody.swapTransaction = JSON.parse(input.swapTransaction);
      } catch (error) {
        return createErrorResponse(`Invalid swap transaction: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    if (input.serializedTransaction) {
      requestBody.serializedTransaction = input.serializedTransaction;
    }
    
    if (!requestBody.swapTransaction && !requestBody.serializedTransaction) {
      return createErrorResponse("Either swapTransaction or serializedTransaction must be provided");
    }
    
    if (input.skipPreflight !== undefined) {
      requestBody.options = requestBody.options || {};
      requestBody.options.skipPreflight = input.skipPreflight;
    }
    
    if (input.maxRetries !== undefined) {
      requestBody.options = requestBody.options || {};
      requestBody.options.maxRetries = input.maxRetries;
    }
    
    // Make the API request
    const response = await fetch(`${JUPITER_API_BASE_URL}/swap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return createErrorResponse(`Error sending swap transaction: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const swapResult = await response.json();
    return createSuccessResponse(`Swap result: ${JSON.stringify(swapResult, null, 2)}`);
  } catch (error) {
    return createErrorResponse(`Error sending swap transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
};
