import { ToolResultSchema } from "../types.js";
import { createErrorResponse, createSuccessResponse, validatePublicKey } from "./utils.js";
import { GetPositionsInput, GetStakedJupInput, GetPriceInput } from "./jupiter.types.js";
import { PublicKey } from "@solana/web3.js";
import { jupiterService } from "../services/jupiter.js";
import { logger } from "../utils/logger.js";

/**
 * Handler for getting portfolio positions
 * @param input GetPositionsInput parameters
 * @returns Success or error response with portfolio positions
 */
export const getPositionsHandler = async (input: GetPositionsInput): Promise<ToolResultSchema> => {
  try {
    // Validate wallet address
    const addressResult = validatePublicKey(input.address);
    if (!(addressResult instanceof PublicKey)) {
      return addressResult;
    }

    logger.debug(`Getting portfolio positions for address: ${input.address}`);

    // Get portfolio positions
    const positions = await jupiterService.getPositions({
      address: input.address,
      platforms: input.platforms
    });

    // Format the positions result
    const formattedPositions = jupiterService.formatPositionsResult(positions);

    return createSuccessResponse(formattedPositions);
  } catch (error) {
    logger.debug("Error in getPositionsHandler:", error);
    return createErrorResponse(`Error getting portfolio positions: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Handler for getting staked JUP tokens
 * @param input GetStakedJupInput parameters
 * @returns Success or error response with staked JUP details
 */
export const getStakedJupHandler = async (input: GetStakedJupInput): Promise<ToolResultSchema> => {
  try {
    // Validate wallet address
    const addressResult = validatePublicKey(input.address);
    if (!(addressResult instanceof PublicKey)) {
      return addressResult;
    }

    logger.debug(`Getting staked JUP for address: ${input.address}`);

    // Get staked JUP
    const stakedJup = await jupiterService.getStakedJup({
      address: input.address
    });

    // Format the staked JUP result
    const formattedStakedJup = jupiterService.formatStakedJupResult(stakedJup);

    return createSuccessResponse(formattedStakedJup);
  } catch (error) {
    logger.debug("Error in getStakedJupHandler:", error);
    return createErrorResponse(`Error getting staked JUP: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Handler for getting available platforms
 * @returns Success or error response with platforms list
 */
export const getPlatformsHandler = async (): Promise<ToolResultSchema> => {
  try {
    logger.debug("Getting available platforms");

    // Get platforms
    const platforms = await jupiterService.getPlatforms();

    // Format the platforms result
    const formattedPlatforms = jupiterService.formatPlatformsResult(platforms);

    return createSuccessResponse(formattedPlatforms);
  } catch (error) {
    logger.debug("Error in getPlatformsHandler:", error);
    return createErrorResponse(`Error getting platforms: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Handler for getting token prices
 * @param input GetPriceInput parameters
 * @returns Success or error response with token prices
 */
export const getPriceHandler = async (input: GetPriceInput): Promise<ToolResultSchema> => {
  try {
    // Validate input
    if (!input.ids || input.ids.trim() === "") {
      return createErrorResponse("Invalid input. Please provide at least one token mint address.");
    }

    logger.debug(`Getting prices for tokens: ${input.ids}`);

    // Get token prices
    const prices = await jupiterService.getPrice({
      ids: input.ids
    });

    // Format the prices result
    const formattedPrices = jupiterService.formatPriceResult(prices);

    return createSuccessResponse(formattedPrices);
  } catch (error) {
    logger.debug("Error in getPriceHandler:", error);
    return createErrorResponse(`Error getting token prices: ${error instanceof Error ? error.message : String(error)}`);
  }
};
