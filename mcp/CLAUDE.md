# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a SpacetimeDB MCP (Model Context Protocol) server implementation built with Effect-TS. The server provides tools for querying and interacting with SpacetimeDB instances through the MCP protocol.

## Key Technologies

- **Effect-TS**: Core framework for functional programming with services, layers, and error handling
- **@effect/ai**: MCP server implementation and AI toolkit abstractions
- **@effect/platform**: HTTP client and platform abstractions
- **@clockworklabs/spacetimedb-sdk**: SpacetimeDB client SDK
- **@modelcontextprotocol/sdk**: MCP protocol implementation
- **Vitest**: Testing framework
- **TypeScript**: Language with strict type checking

## Architecture

### Core Components

1. **index.ts** - Main entry point that sets up the MCP server with Effect layers
2. **spacetimedb.ts** - Core SpacetimeDB toolkit implementation with 4 main tools:
   - `list_databases`: Lists available database modules
   - `get_database_interface`: Retrieves database schema (tables/reducers)
   - `query_table`: Executes read-only SQL queries
   - `get_database_status`: Gets database metadata and health info
3. **connection_spacetime.ts** - Connection management and configuration

### Effect-TS Patterns

- **Services**: Reusable components with dependency injection (SpacetimeConfigTag)
- **Layers**: Higher-level abstractions managing service construction and dependencies
- **Context**: Collection storing services, accessed via tags
- **Error Handling**: Functional error handling with Effect.fail/Effect.succeed

### Configuration

Configuration is managed through Effect Context with environment variables:
- `SPACETIMEDB_HTTP_URI` (default: "http://localhost:3000")
- `SPACETIMEDB_WS_URI` (default: "ws://localhost:3000")
- `SPACETIMEDB_MODULE` (default: "game_test")

## Common Commands

```bash
# Build the project
pnpm build

# Run type checking
pnpm check

# Run linting
pnpm lint

# Fix linting issues
pnpm lint-fix

# Run tests
pnpm test

# Run tests with coverage
pnpm coverage

# Run the MCP server
pnpm tsx src/index.ts
```

## Development Notes

### Testing Strategy

- **Unit Tests**: `SpacetimeDBSimple.test.ts` for pure functions
- **Integration Tests**: `SpacetimeDBIntegration.test.ts` for real SpacetimeDB instances
- **Mocked Tests**: `SpacetimeDBToolsMocked.test.ts` with mock HTTP responses
- Test configuration uses path aliases: `@template/basic` -> `src/`, `@template/basic/test` -> `test/`

### Layer Architecture

The server uses Effect layers for dependency injection:
```typescript
const ServerLayer = Layer.mergeAll(SpacetimeDBTools).pipe(
  Layer.provide(Layer.succeed(SpacetimeConfigTag, SpacetimeConfigLive)),
  Layer.provide(McpServer.layerStdio({...})),
  Layer.provide(Logger.add(Logger.prettyLogger({ stderr: true })))
);
```

### Error Handling

All tools use consistent error handling patterns:
- HTTP errors are mapped to strings
- Effect.fail for expected errors
- Effect.succeed for successful operations
- Caching with TTL for expensive operations (12 hours)

### HTTP Client Configuration

The toolkit uses Effect's HTTP client with:
- Automatic retries (3 attempts with 3-second spacing)
- Status filtering (OK responses only)
- Bearer token authentication
- Caching for database metadata and schema lookups

## Known Issues

1. **Effect Layer Composition**: Some tests have TypeScript errors with Layer.mergeAll usage
2. **HTTP Client Mocking**: Mock HTTP client needs updates for current @effect/platform version
3. **Integration Tests**: Require manual SpacetimeDB setup and are skipped by default

## SpacetimeDB API Integration

The MCP tools interact with SpacetimeDB's HTTP API:
- `/v1/identity` - Authentication endpoint
- `/v1/database` - Database listing
- `/v1/database/{name}` - Database metadata
- `/v1/database/{name}/schema` - Database schema
- `/v1/database/{name}/sql` - SQL query execution

Authentication requires fetching identity and token from the `/v1/identity` endpoint before making authenticated requests.