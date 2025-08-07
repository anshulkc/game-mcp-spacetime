# SpacetimeDB MCP Tools Test Suite

This directory contains tests for the SpacetimeDB MCP (Model Context Protocol) tools.

## Test Files

### `toolkit.integration.test.ts`
Integration tests for the MCP tools:
- `list_databases` tool testing
- `get_database_interface` tool testing  
- `query_table` tool testing
- Database connection and toolkit setup

### `_layer.ts`
Test layer configuration and Effect setup utilities.

### `_utils.ts`
Test utility functions and helpers.


## Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file

cd mcp
pnpm test toolkit.integration.test.ts

# Run tests with coverage
pnpm coverage
```

## Prerequisites

- Running SpacetimeDB instance on `localhost:3000`
- Valid SpacetimeDB identity configured in environment

## MCP Tools Tested

1. **list_databases**: Lists all available database modules
2. **get_database_interface**: Retrieves database schema (tables/reducers)  
3. **query_table**: Executes read-only SQL queries

Each tool is tested for successful execution and proper response format.