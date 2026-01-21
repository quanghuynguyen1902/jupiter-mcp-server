import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import {
  GetPositionsInput,
  GetStakedJupInput,
  PortfolioPositionsResponse,
  StakedJupResponse,
  PlatformInfo,
  GetPriceInput,
  PriceResponse,
} from "../handlers/jupiter.types.js";
// Ensure fetch is available
import "../utils/fetch.js";

/**
 * Jupiter API service for Portfolio and Price APIs
 */
export class JupiterService {
  constructor() {
  }

  /**
   * Get portfolio positions for a wallet address
   * @param params GetPositionsInput parameters
   * @returns Portfolio positions response
   */
  async getPositions(params: GetPositionsInput): Promise<PortfolioPositionsResponse> {
    try {
      const url = new URL(`${config.jupiter.portfolioApiBaseUrl}/positions/${params.address}`);

      if (params.platforms) {
        url.searchParams.append("platforms", params.platforms);
      }

      logger.debug(`Getting portfolio positions for address: ${params.address}`);

      const headers: Record<string, string> = {};
      if (config.jupiter.apiKey) {
        headers['x-api-key'] = config.jupiter.apiKey;
      }

      const response = await fetch(url.toString(), { headers });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`,
        );
      }

      const data: PortfolioPositionsResponse = await response.json();
      logger.debug(`Retrieved ${data.elements?.length || 0} portfolio positions`);
      return data;
    } catch (error) {
      logger.error("Error fetching portfolio positions:", error);
      throw error;
    }
  }

  /**
   * Get staked JUP tokens for a wallet address
   * @param params GetStakedJupInput parameters
   * @returns Staked JUP response
   */
  async getStakedJup(params: GetStakedJupInput): Promise<StakedJupResponse> {
    try {
      const url = `${config.jupiter.portfolioApiBaseUrl}/staked-jup/${params.address}`;

      logger.debug(`Getting staked JUP for address: ${params.address}`);

      const headers: Record<string, string> = {};
      if (config.jupiter.apiKey) {
        headers['x-api-key'] = config.jupiter.apiKey;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`,
        );
      }

      const data: StakedJupResponse = await response.json();
      logger.debug(`Staked JUP: ${data.stakedAmount}, Unstaking entries: ${data.unstaking?.length || 0}`);
      return data;
    } catch (error) {
      logger.error("Error fetching staked JUP:", error);
      throw error;
    }
  }

  /**
   * Get list of available platforms
   * @returns Array of platform information
   */
  async getPlatforms(): Promise<PlatformInfo[]> {
    try {
      const url = `${config.jupiter.portfolioApiBaseUrl}/platforms`;

      logger.debug("Getting list of platforms");

      const headers: Record<string, string> = {};
      if (config.jupiter.apiKey) {
        headers['x-api-key'] = config.jupiter.apiKey;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`,
        );
      }

      const data: PlatformInfo[] = await response.json();
      logger.debug(`Retrieved ${data.length} platforms`);
      return data;
    } catch (error) {
      logger.error("Error fetching platforms:", error);
      throw error;
    }
  }

  /**
   * Format portfolio positions in a user-friendly way
   * @param positions Portfolio positions response
   * @returns Formatted positions summary
   */
  formatPositionsResult(positions: PortfolioPositionsResponse): string {
    let result = `Portfolio Summary for ${positions.owner}\n`;
    result += `Query Time: ${new Date(positions.date).toLocaleString()}\n`;
    result += `Duration: ${positions.duration}ms\n\n`;

    if (!positions.elements || positions.elements.length === 0) {
      return result + "No positions found.";
    }

    // Calculate total value
    const totalValue = positions.elements.reduce((sum, el) => sum + (el.value || 0), 0);
    result += `Total Portfolio Value: $${totalValue.toFixed(2)}\n\n`;

    // Group by type
    const byType = positions.elements.reduce((acc, el) => {
      if (!acc[el.type]) acc[el.type] = [];
      acc[el.type].push(el);
      return acc;
    }, {} as Record<string, typeof positions.elements>);

    // Display positions by type
    Object.entries(byType).forEach(([type, elements]) => {
      result += `${type}:\n`;
      elements.forEach((el) => {
        result += `  • ${el.label} (${el.platformId})\n`;
        result += `    Value: $${el.value.toFixed(2)}\n`;
        if (el.data?.assets && el.data.assets.length > 0) {
          result += `    Assets: ${el.data.assets.length} token(s)\n`;
        }
      });
      result += "\n";
    });

    return result;
  }

  /**
   * Format staked JUP in a user-friendly way
   * @param stakedJup Staked JUP response
   * @returns Formatted staked JUP summary
   */
  formatStakedJupResult(stakedJup: StakedJupResponse): string {
    let result = `Staked JUP Summary:\n`;
    result += `Currently Staked: ${stakedJup.stakedAmount.toLocaleString()} JUP\n\n`;

    if (stakedJup.unstaking && stakedJup.unstaking.length > 0) {
      result += `Unstaking Positions (${stakedJup.unstaking.length}):\n`;
      stakedJup.unstaking.forEach((unstake, index) => {
        const date = new Date(unstake.until * 1000);
        result += `  ${index + 1}. Amount: ${unstake.amount.toLocaleString()} JUP\n`;
        result += `     Available: ${date.toLocaleString()}\n`;
      });
    } else {
      result += "No unstaking positions.";
    }

    return result;
  }

  /**
   * Format platforms list in a user-friendly way
   * @param platforms Array of platform information
   * @returns Formatted platforms summary
   */
  formatPlatformsResult(platforms: PlatformInfo[]): string {
    let result = `Available Platforms (${platforms.length}):\n\n`;

    platforms.forEach((platform, index) => {
      result += `${index + 1}. ${platform.name} (${platform.id})\n`;
      result += `   ${platform.description}\n`;
      if (platform.tags && platform.tags.length > 0) {
        result += `   Tags: ${platform.tags.join(", ")}\n`;
      }
      result += `   Deprecated: ${platform.isDeprecated ? "Yes" : "No"}\n`;
      if (platform.links?.website) {
        result += `   Website: ${platform.links.website}\n`;
      }
      if (index < platforms.length - 1) {
        result += "\n";
      }
    });

    return result;
  }

  /**
   * Get token prices from Jupiter Price API v3
   * @param params GetPriceInput parameters
   * @returns Price response with token prices
   */
  async getPrice(params: GetPriceInput): Promise<PriceResponse> {
    try {
      const url = new URL(config.jupiter.priceApiBaseUrl);
      url.searchParams.append("ids", params.ids);

      logger.debug(`Getting prices for tokens: ${params.ids}`);

      const headers: Record<string, string> = {};
      if (config.jupiter.apiKey) {
        headers['x-api-key'] = config.jupiter.apiKey;
      }

      const response = await fetch(url.toString(), { headers });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`,
        );
      }

      const data: PriceResponse = await response.json();
      logger.debug(`Retrieved prices for ${Object.keys(data).length} tokens`);
      return data;
    } catch (error) {
      logger.error("Error fetching token prices:", error);
      throw error;
    }
  }

  /**
   * Format price response in a user-friendly way
   * @param prices Price response from Jupiter API
   * @returns Formatted price summary
   */
  formatPriceResult(prices: PriceResponse): string {
    const tokenAddresses = Object.keys(prices);

    if (tokenAddresses.length === 0) {
      return "No price data found for the specified tokens.";
    }

    let result = `Token Prices (${tokenAddresses.length}):\n\n`;

    tokenAddresses.forEach((address, index) => {
      const price = prices[address];
      result += `${index + 1}. ${address}\n`;
      result += `   Price: $${price.usdPrice.toFixed(6)}\n`;
      result += `   Decimals: ${price.decimals}\n`;

      if (price.priceChange24h !== null && price.priceChange24h !== undefined) {
        const change = price.priceChange24h;
        const changeSign = change >= 0 ? "+" : "";
        result += `   24h Change: ${changeSign}${change.toFixed(2)}%\n`;
      }

      if (price.blockId !== null && price.blockId !== undefined) {
        result += `   Block ID: ${price.blockId}\n`;
      }

      if (index < tokenAddresses.length - 1) {
        result += "\n";
      }
    });

    return result;
  }
}

// Singleton instance
export const jupiterService = new JupiterService();
