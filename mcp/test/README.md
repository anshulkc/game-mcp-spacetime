# SpacetimeDB MCP Tools Test Suite

This directory contains comprehensive tests for the SpacetimeDB MCP (Model Context Protocol) tools.

## Test Files

### `SpacetimeDBSimple.test.ts`
Unit tests that don't require external dependencies:
- SQL query builder logic
- Parameter validation
- Error handling utilities
- Schema validation helpers

### `SpacetimeDBTools.test.ts` 
Integration tests for the actual MCP tools (requires fixes for Effect layer composition):
- `list_databases` tool testing
- `get_database_interface` tool testing  
- `query_table` tool testing
- `get_database_status` tool testing

### `SpacetimeDBIntegration.test.ts`
End-to-end tests against a real SpacetimeDB instance:
- Real database listing
- Actual schema retrieval
- Live query execution
- Database status checking

### `MockHttpClient.test.ts`
Mock HTTP client for testing without network dependencies:
- Simulated SpacetimeDB API responses
- Controlled test scenarios
- Error condition testing

### `SpacetimeDBToolsMocked.test.ts`
Tests using the mock HTTP client:
- Full tool functionality testing
- Predictable responses
- Error scenario validation

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test SpacetimeDBSimple.test.ts

# Run tests with coverage
pnpm coverage

# Run integration tests (requires running SpacetimeDB)
pnpm test SpacetimeDBIntegration.test.ts
```

## Test Categories

### Unit Tests ✅
- Pure function testing
- Logic validation
- Parameter checking
- Error handling

### Integration Tests ⚠️ 
- Requires running SpacetimeDB instance
- Tests real API endpoints
- Validates actual responses
- Currently skipped by default

### Mocked Tests ⚠️
- Uses mock HTTP responses
- Isolated from network
- Predictable test scenarios
- Requires Effect layer fixes

## Known Issues

1. **Effect Layer Composition**: Current tests have TypeScript errors with Layer.mergeAll usage
2. **HTTP Client Mocking**: Mock HTTP client needs updates for current @effect/platform version
3. **Integration Tests**: Require manual SpacetimeDB setup and are skipped by default

## Test Data

The tests use these known database identities from your SpacetimeDB instance:
- `c200d3b58ace94ebc7f07bea801aa067c9cfaf34a9c8ce2610a4c44983de0ff0`
- `c200b3ec9c01730ad8ac9dad81b006a2c31b698640748e369dc5e701b2ebeb7e` (game_test module)

## MCP Tools Tested

1. **list_databases**: Lists all available database modules
2. **get_database_interface**: Retrieves database schema (tables/reducers)
3. **query_table**: Executes read-only SQL queries
4. **get_database_status**: Gets database metadata and health info

Each tool is tested for:
- Successful execution paths
- Error handling
- Parameter validation
- Response format validation