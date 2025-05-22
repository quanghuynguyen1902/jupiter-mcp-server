[![MseeP Badge](https://mseep.net/pr/quanghuynguyen1902-jupiter-mcp-server-badge.jpg)](https://mseep.ai/app/quanghuynguyen1902-jupiter-mcp-server)

# Jupiter MCP Server

This repository contains a Model Context Protocol (MCP) server that provides Claude with access to Jupiter's swap API. The server enables Claude to perform operations like getting quotes, building swap transactions, and sending swap transactions on the Solana blockchain using Jupiter.

## Overview

The MCP server exposes several tools to Claude:

- `jupiter_get_quote`: Get a quote for swapping tokens on Jupiter
- `jupiter_build_swap_transaction`: Build a swap transaction on Jupiter
- `jupiter_send_swap_transaction`: Send a swap transaction on Jupiter
- `jupiter_execute_swap`: Execute a complete swap using a wallet private key from environment variables

## API Implementation

This server uses Jupiter APIs:
- **Lite API v1** (`https://lite-api.jup.ag/swap/v1`) for executing swaps

The Lite API provides a simplified interface for building and executing swaps in a single request, which improves reliability.

## Prerequisites

- Node.js (v16 or higher)
- Claude Desktop application
- (Optional) A Solana wallet private key for automatic swap execution

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

### Configure Claude Desktop with Environment Variables

To configure Claude Desktop to use this MCP server with environment variables for automatic swap execution:

1. Open Claude Desktop
2. Navigate to the Claude Desktop configuration file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\\Claude\\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

3. Add the MCP server configuration with environment variables:

```json
{
  "mcpServers": {
    "jupiter-mcp-server": {
      "command": "npx",
      "args": ["jupiter-mcp-server"],
      "env": {
        "SOLANA_PRIVATE_KEY": "your_private_key_in_base58_format",
        "SOLANA_RPC_ENDPOINT": "https://api.mainnet-beta.solana.com",
        "SOLANA_NETWORK": "mainnet-beta",
        "LOG_LEVEL": "info"
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
        "SOLANA_PRIVATE_KEY": "your_private_key_in_base58_format",
        "SOLANA_RPC_ENDPOINT": "https://api.mainnet-beta.solana.com",
        "SOLANA_NETWORK": "mainnet-beta",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Environment Variables Description

- **SOLANA_PRIVATE_KEY** (required for automatic swap): Your Solana wallet private key in base58 format
- **SOLANA_RPC_ENDPOINT** (optional): RPC endpoint URL, defaults to mainnet public endpoint
- **SOLANA_NETWORK** (optional): 'mainnet-beta', 'testnet', or 'devnet', defaults to 'mainnet-beta'
- **LOG_LEVEL** (optional): 'error', 'warn', 'info', or 'debug', defaults to 'info'

### Alternative: Using a .env File

If you're running the server directly (not through Claude Desktop), you can create a `.env` file in the root directory with the same variables:

```
SOLANA_PRIVATE_KEY=your_private_key_in_base58_format
SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta
LOG_LEVEL=info
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

Once configured, restart Claude Desktop. Claude will now have access to the Jupiter swap tools. You can ask Claude to:

1. Get a quote for swapping tokens:
   ```
   What's the quote for swapping 1 SOL to USDC?
   ```

2. Build a swap transaction:
   ```
   Build a swap transaction for the quote I just got.
   ```

3. Send a swap transaction:
   ```
   Send the swap transaction I just built.
   ```

4. Execute a swap automatically (if you've provided a private key):
   ```
   Execute a swap of 0.1 SOL to USDC.
   ```

## Automatic Swap Execution

If you've configured your environment with a Solana private key, Claude can now execute swaps directly without requiring you to sign transactions manually. This feature uses the private key from your environment to:

1. Get a quote for the swap
2. Build the transaction
3. Sign the transaction with your private key
4. Send the transaction to the network

All in one step!

## Troubleshooting

If you encounter errors during swap execution:

1. Set `LOG_LEVEL=debug` in your environment variables to get detailed logs
2. Check that you have provided a valid Solana private key
3. Ensure your wallet has sufficient SOL for the swap and transaction fees
4. Verify that you are using the correct input and output token mints

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
