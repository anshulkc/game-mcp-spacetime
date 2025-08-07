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
   ```bash
   # Make sure SpacetimeDB is running on localhost:3000
   ```

## Claude Integration

Add the MCP server to Claude:

```bash
claude mcp add-json spacetime-tools '{
  "command": "node",
  "args": ["/Users/anshulkc/game-mcp-spacetime-1/mcp/build/esm/mcp/src/index.js"],
  "cwd": "/Users/anshulkc/game-mcp-spacetime-1",
  "env": {
    "SPACETIMEDB_HTTP_URI": "http://localhost:3000",
    "SPACETIMEDB_WS_URI": "ws://localhost:3000",
    "SPACETIMEDB_IDENTITY": "your-spacetimedb-identity-here"
  }
}' -s user
```

**Note:** Replace `your-spacetimedb-identity-here` with your actual SpacetimeDB identity.
