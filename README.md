# Jupiter MCP Server

This repository contains a Model Context Protocol (MCP) server that provides Claude with access to Jupiter's swap API. The server enables Claude to perform operations like getting quotes, building swap transactions, and sending swap transactions on the Solana blockchain using Jupiter.

## Overview

The MCP server exposes several tools to Claude:

- `jupiter_get_quote`: Get a quote for swapping tokens on Jupiter
- `jupiter_build_swap_transaction`: Build a swap transaction on Jupiter
- `jupiter_send_swap_transaction`: Send a swap transaction on Jupiter
- `jupiter_execute_swap`: Execute a complete swap using a wallet private key from environment variables

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

### Environment Variables

Create a `.env` file in the root directory of the project with the following variables:

```
# Required for automatic swap execution
SOLANA_PRIVATE_KEY=your_private_key_in_base58_format

# Optional - defaults to Solana mainnet
SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta

# Optional security
API_KEY=your_api_key_for_additional_security

# Optional logging
LOG_LEVEL=info  # Options: error, warn, info, debug
```

You can copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

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
      "command": "jupiter-mcp-server",
      "args": []
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
      ]
    }
  }
}
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

If you've configured your environment with a Solana private key, Claude can now execute swaps directly without requiring you to sign transactions manually. This feature uses the private key from your `.env` file to:

1. Get a quote for the swap
2. Build the transaction
3. Sign the transaction with your private key
4. Send the transaction to the network

All in one step!

### Security Considerations

When using automatic swap execution:

- **NEVER share your `.env` file or private key**
- Keep your private key secure and do not commit it to version control
- Consider using a dedicated wallet with limited funds for this purpose
- Set appropriate slippage parameters to avoid unexpected outcomes
- Consider adding API key protection by setting the `API_KEY` environment variable

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
