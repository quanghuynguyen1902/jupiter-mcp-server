# Jupiter MCP Server

This repository contains a Model Context Protocol (MCP) server that provides Claude with access to Jupiter's Portfolio API and Price API. The server enables Claude to view portfolio positions, track staked JUP tokens, and get real-time token prices on the Solana blockchain.

## Overview

The MCP server exposes several tools to Claude:

### Portfolio Tools
- `jupiter_get_positions`: Get portfolio positions including wallet balances, staked positions, liquidity pools, farming, vaults, lending, and more
- `jupiter_get_staked_jup`: Get information about staked JUP tokens and unstaking positions
- `jupiter_get_platforms`: Get a list of all DeFi platforms integrated with Jupiter's portfolio tracking

### Price Tools
- `jupiter_get_price`: Get current prices for one or more tokens, including USD price, 24h price change, and token decimals

## API Implementation

This server uses Jupiter APIs:
- **Portfolio API v1** (`https://api.jup.ag/portfolio/v1`) for portfolio tracking and analytics
- **Price API v3** (`https://api.jup.ag/price/v3`) for real-time token pricing

Both APIs require an API key from [Jupiter Portal](https://portal.jup.ag/).

## Prerequisites

- Node.js (v16 or higher)
- Claude Desktop application
- Jupiter API key - Get yours at [https://portal.jup.ag/](https://portal.jup.ag/)

## Installation

### From npm (recommended)

```bash
# Install globally
npm install -g jupiter-mcp-server

# Or use with npx
npx jupiter-mcp-server
```

### From source

1. Clone this repository:
   ```bash
   git clone https://github.com/quanghuynguyen1902/jupiter-mcp-server.git
   cd jupiter-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm ci
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Install globally (optional):
   ```bash
   npm install -g ./
   ```

## Configuration

### Configure Claude Desktop

To configure Claude Desktop to use this MCP server:

1. Open Claude Desktop
2. Navigate to the Claude Desktop configuration file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\\Claude\\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

3. Add the MCP server configuration:

```json
{
  "mcpServers": {
    "jupiter-mcp-server": {
      "command": "npx",
      "args": ["jupiter-mcp-server"],
      "env": {
        "JUPITER_API_KEY": "your_jupiter_api_key_from_portal"
      }
    }
  }
}
```

If you've installed from source and want to run the local version, use:

```json
{
  "mcpServers": {
    "jupiter-mcp-server": {
      "command": "node",
      "args": [
        "/path/to/your/jupiter-mcp-server/build/index.js"
      ],
      "env": {
        "JUPITER_API_KEY": "your_jupiter_api_key_from_portal"
      }
    }
  }
}
```

### Environment Variables Description

- **JUPITER_API_KEY** (required): Your Jupiter API key from [https://portal.jup.ag/](https://portal.jup.ag/)

### Alternative: Using a .env File

If you're running the server directly (not through Claude Desktop), you can create a `.env` file in the root directory:

```
JUPITER_API_KEY=your_jupiter_api_key_from_portal
```

### Running Locally

```bash
# If installed globally
jupiter-mcp-server

# If installed from source
node build/index.js

# Using npx
npx jupiter-mcp-server
```

## Usage

Once configured, restart Claude Desktop. Claude will now have access to Jupiter portfolio and price tools. You can ask Claude to:

### Portfolio Operations

1. View portfolio positions:
   ```
   Show me the portfolio for address YOUR_WALLET_ADDRESS
   ```

2. Check staked JUP:
   ```
   How much JUP is staked for address YOUR_WALLET_ADDRESS?
   ```

3. List available platforms:
   ```
   What platforms are supported for portfolio tracking?
   ```

### Price Operations

4. Get token prices:
   ```
   What's the current price of SOL and USDC?
   ```

5. Get multiple token prices:
   ```
   Get prices for these tokens: So11111111111111111111111111111111111111112,EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
   ```

## Troubleshooting

### API Authentication Issues

If you encounter 401 Unauthorized errors:

1. Verify your `JUPITER_API_KEY` is correctly set in the environment variables
2. Ensure your API key is valid - you can get a new one from [https://portal.jup.ag/](https://portal.jup.ag/)
3. Check that the API key doesn't have any extra spaces or quotes around it

## Development

### Adding New Tools

To add new tools to the MCP server:

1. Define the tool in `src/tools.ts`
2. Create a handler function in the appropriate handler file
3. Add the handler to the `handlers` object in `src/tools.ts`

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Publishing to npm

Make sure you're logged in to npm:

```bash
npm login
```

Then publish the package:

```bash
npm publish
```

To publish a new version, first update the version in package.json:

```bash
npm version patch  # or minor, or major
npm publish
```

## License

MIT

## Support the Project

If Jupiter MCP Server is useful to you, consider [sponsoring its development](https://github.com/sponsors/quanghuynguyen1902).

Your support helps maintain compatibility with Jupiter APIs, add new MCP tools, and improve the documentation.
