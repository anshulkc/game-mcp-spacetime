# SpacetimeDB MCP Server

A Model Context Protocol (MCP) server for SpacetimeDB integration.

## Setup

1. **Install dependencies:**
   ```bash
   cd mcp
   pnpm install
   ```

2. **Build the project:**
   ```bash
   pnpm build
   ```

3. **Start SpacetimeDB:**
   # Make sure SpacetimeDB is running on localhost:3000

   ```bash
   spacetime start
   spacetime login
   ```

## Claude Integration

Add the MCP server to Claude:

I've provided an example spacetime instance to play around with:

```bash
claude mcp add-json spacetime-tools '{
  "command": "node",
  "args": ["/Users/anshulkc/game-mcp-spacetime-1/mcp/build/esm/mcp/src/index.js"],
  "cwd": "/Users/anshulkc/game-mcp-spacetime-1", 
  "env": {
    "SPACETIMEDB_HTTP_URI": "http://localhost:3000",
    "SPACETIMEDB_WS_URI": "ws://localhost:3000",
    "SPACETIMEDB_IDENTITY": "c200a7faab014ed9655ddc4de58a8ee28c87e1d3b556d0d8c8d7e61e1e8fa4e1"
  }
}' -s user
```

**Note:** Make sure to use the update with the correct paths and replace `c200a7faab014ed9655ddc4de58a8ee28c87e1d3b556d0d8c8d7e61e1e8fa4e1` with your actual SpacetimeDB identity if using a custom spacetime instance.
