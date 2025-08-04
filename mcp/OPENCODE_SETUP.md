# SpacetimeDB MCP Server Setup for OpenCode

## Prerequisites

1. **SpacetimeDB running locally** on `http://localhost:3000`
2. **Built MCP server** (run `pnpm build` in this directory)

## Configuration Options

### Option 1: Direct MCP Server Usage

Start the MCP server directly:
```bash
./start-mcp.sh
```

The server will run in stdio mode and accept MCP protocol messages.

### Option 2: Claude Desktop Configuration

If you have Claude Desktop installed, add this to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "spacetime-mcp": {
      "command": "node",
      "args": [
        "/Users/anshulkc/game-mcp-spacetime-1/mcp/build/cjs/index.js"
      ],
      "env": {
        "SPACETIMEDB_HTTP_URI": "http://localhost:3000",
        "SPACETIMEDB_WS_URI": "ws://localhost:3000", 
        "SPACETIMEDB_MODULE": "game_test"
      }
    }
  }
}
```

### Option 3: OpenCode Integration

For OpenCode, you can integrate this MCP server by:

1. **Starting SpacetimeDB locally:**
   ```bash
   # Make sure SpacetimeDB is running on localhost:3000
   ```

2. **Build and start the MCP server:**
   ```bash
   cd /Users/anshulkc/game-mcp-spacetime-1/mcp
   pnpm build
   ./start-mcp.sh
   ```

3. **Available Tools:**
   - `list_databases` - Lists all available database modules
   - `get_database_interface` - Gets schema for databases/tables/reducers
   - `query_table` - Performs read-only SQL queries on tables
   - `get_database_status` - Checks database health/status

## Environment Variables

- `SPACETIMEDB_HTTP_URI` - HTTP endpoint (default: http://localhost:3000)
- `SPACETIMEDB_WS_URI` - WebSocket endpoint (default: ws://localhost:3000)  
- `SPACETIMEDB_MODULE` - Module name (default: game_test)

## Testing

Test the MCP server with:
```bash
node test-mcp.js
```

## Usage Examples

Once connected, you can:

1. **List all databases:**
   ```
   Use the list_databases tool
   ```

2. **Get database schema:**
   ```
   Use get_database_interface with db_name: "your_database"
   ```

3. **Query a table:**
   ```
   Use query_table with:
   - db_name: "your_database"
   - table_name: "your_table" 
   - columns: ["col1", "col2"]
   - where: "condition"
   ```