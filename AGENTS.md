# Agent Guidelines for SpacetimeDB MCP Server

## Build/Test Commands
- `pnpm build` - Full build (ESM + CJS + annotations)
- `pnpm test` - Run tests with Vitest
- `pnpm test --run` - Run tests once (single test)
- `pnpm lint` - ESLint check
- `pnpm lint-fix` - Auto-fix linting issues
- `pnpm check` - TypeScript type checking

## Code Style
- **Imports**: Use explicit imports, prefer `import type` for types
- **Formatting**: 2-space indent, 120 char line width, double quotes, no semicolons (ASI)
- **Types**: Use generic array syntax `Array<T>`, explicit return types optional
- **Naming**: camelCase for variables/functions, PascalCase for types/classes
- **Effect**: Use Effect/Layer pattern for services, avoid direct async/await
- **Comments**: Minimal comments, prefer self-documenting code
- **Destructuring**: Sort destructure keys alphabetically
- **Unused vars**: Prefix with `_` if intentionally unused

## Error Handling
- Use Effect's error handling (`Effect.fail`, `Effect.try`)
- Avoid throwing exceptions, use typed errors
- Layer dependencies should be explicit in type signatures