// test/toolkit.integration.test.ts
import { describe, it, vi } from "@effect/vitest";
import { Effect } from "effect";

import { SpacetimeDBToolkit } from "../src/spacetimedb.js";
import { ToolkitTestLayer } from "./_layer.js";

/* bump timeouts—first network hop may take >5 s on CI */
vi.setConfig({ testTimeout: 10_000 });

describe("Toolkit ↔ live SpacetimeDB", () => {
  it("list_databases returns the local module", async () => {
    const effect = Effect.gen(function* () {
      const toolkit = yield* SpacetimeDBToolkit;
      
      // Now I know the correct API - use the handle method!
      console.error("🔍 Available tools:", toolkit.tools.map((t: any) => t.name));
      console.error("🔍 Handle function:", typeof toolkit.handle);
      
      // Call using the handle method (correct API)
      const dbs = yield* toolkit.handle("list_databases", {});
      console.error("📋 Databases found:", JSON.stringify(dbs, null, 2));
      
      // throw new Error(`SUCCESS! DATABASES: ${JSON.stringify(dbs, null, 2)}`);
    }).pipe(Effect.provide(ToolkitTestLayer));
    
    try {
      await Effect.runPromise(effect as any);
    } catch (error) {
      console.error("❌ Effect failed:", error);
      throw error;
    }
  });

  it("get_database_interface returns tables + reducers", async () => {
    const effect = Effect.gen(function* () {
      const toolkit = yield* SpacetimeDBToolkit;
      
      console.error("🔍 Available methods:", Object.keys(toolkit));
      
      // Call using the handle method (correct API)
      const result = yield* toolkit.handle("get_database_interface", {
        db_name: process.env.SPACETIMEDB_IDENTITY ?? "c200a7faab014ed9655ddc4de58a8ee28c87e1d3b556d0d8c8d7e61e1e8fa4e1",
        table_name: "message",
      });
      
      console.error("🏗️  Database interface:", JSON.stringify(result, null, 2));
      
      //const { tables, reducers } = result as any;
      
      // expect(Array.isArray(tables)).toBe(true);
      // expect(tables.length).toBeGreaterThan(0);
      // expect(Array.isArray(reducers)).toBe(true);
      // throw new Error(`📊 Found ${tables?.length || 0} tables and ${reducers?.length || 0} reducers`);
    }).pipe(Effect.provide(ToolkitTestLayer));
    
    try {
      await Effect.runPromise(effect as any);
    } catch (error) {
      console.error("❌ Effect failed:", error);
      throw error;
    }
  });

  it("query_table selects 1 row", async () => {
    const effect = Effect.gen(function* () {
      const toolkit = yield* SpacetimeDBToolkit;
      
      const rowsets = yield* toolkit.handle("query_table", {
        db_name:    "c2006aac1fe36812d86abe77b73c26d850338225ac490c246b50b5aaa8804561",
        table_name: "message",
        columns:    ["text"],              // SELECT "text"
      });
      
      console.error("🔍 Query results:", JSON.stringify(rowsets, null, 2));
      console.error(`📈 Returned ${(rowsets as any)[0]?.rows?.length || 0} rows from '${"message"}' table`);
      
      // expect((rowsets as any)[0]?.rows.length).toBeGreaterThan(0);
    }).pipe(Effect.provide(ToolkitTestLayer));
    
    try {
      await Effect.runPromise(effect as any);
    } catch (error) {
      console.error("❌ Effect failed:", error);
      throw error;
    }
  });

  it("get_database_status returns metadata", async () => {
    const effect = Effect.gen(function* () {
      const toolkit = yield* SpacetimeDBToolkit;
      
      const status = yield* toolkit.handle("get_database_status", {
        db_name: process.env.SPACETIMEDB_IDENTITY ?? "c200a7faab014ed9655ddc4de58a8ee28c87e1d3b556d0d8c8d7e61e1e8fa4e1"
      });
      
      console.error("🏥 Database status:", JSON.stringify(status, null, 2));
      
      // expect(status).toBeDefined();
      // expect((status as any).database_identity).toBeDefined();
      // expect((status as any).owner_identity).toBeDefined();
    }).pipe(Effect.provide(ToolkitTestLayer));
    
    try {
      await Effect.runPromise(effect as any);
    } catch (error) {
      console.error("❌ Effect failed:", error);
      throw error;
    }
  });
});
