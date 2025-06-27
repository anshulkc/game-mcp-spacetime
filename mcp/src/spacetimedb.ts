import { AiError, AiTool, AiToolkit, McpServer } from "@effect/ai"
import { HttpClient, HttpClientResponse, Path } from "@effect/platform"
import { NodeHttpClient, NodePath } from "@effect/platform-node"
import {
  Array,
  Cache,
  Data,
  Duration,
  Effect,
  Layer,
  Option,
  pipe,
  Schedule,
  Schema,
} from "effect"
import { SpacetimeConfigTag } from "./connection_spacetime.js"

class AiError extends Data.TaggedError("AiError")<{
    readonly code:
      | "ParseError"
    readonly detail?: unknown        // optional structured payload
}> {}



const DatabaseName = Schema.String.annotations({
    description: "The name of the database module",
})

const TableName = Schema.String.annotations({
    description: "The name of the database table",
})

const ReducerName = Schema.String.annotations({
    description: "The name of the reducer function",
})

const FilterObject = Schema.Record({ key: Schema.String, value: Schema.Unknown }).annotations({
    description: "Filter object with string keys and unknown values for table queries",
})

const DatabaseMetaDataSchema = Schema.Struct({
    database_identity: Schema.String,
    owner_identity: Schema.String,
    host_type: Schema.String,
    initial_program: Schema.String
}).annotations({
    description: "Metadata of a database module for get_database_status",
})

const DatabaseStatus = Schema.Struct({
    status: Schema.String,
    region: Schema.String,
    module_hash: Schema.String,
    last_updated: Schema.String, // thought these would be useful as well
    active_connections: Schema.Number // thought these would be useful as well
  }).annotations({
    description: "Status of a database module for get_database_status",
})


// TODO: thinking about adding adding indexes here (may be useful for the query_table tool)
  const TableSchema = Schema.Struct({
    name: Schema.String,
    columns: Schema.Array(Schema.Struct({
      name: Schema.String,
      type: Schema.String,
      constraints: Schema.Array(Schema.String)
    }))
  }).annotations({
    description: "Schema of a database table for get_database_interface",
  })

  const ReducerSignature = Schema.Struct({
    name: Schema.String,
    parameters: Schema.Array(Schema.Struct({
      name: Schema.String,
      type: Schema.String
    })),
    return_type: Schema.String
  }).annotations({
    description: "Reducer signature for get_database_interface",
  })

  const DatabaseInterface = Schema.Struct({
    tables: Schema.String,
    reducers: Schema.String
  }).annotations({
    description: "Database interface for get_database_interface",
  })

  // the 4 tools to query spacetimeDB

  const toolkit = AiToolkit.make(
    AiTool.make("list_databases", {
      description: "Listing all available database modules on a connected spacetimeDB instance (different servers for different regions)",
      success: Schema.String,
      failure: Schema.String,
      parameters: {},
    })
    .annotate(AiTool.Readonly, true)
    .annotate(AiTool.Destructive, false),

AiTool.make("get_database_interface", {
    description: "Retrieves the full interface/metadata for a database module or specific table or reducers. This will list all tables, their schemas, and all available reducers with their function signatures",
    success: Schema.Union(DatabaseInterface, TableSchema, ReducerSignature),
    failure: Schema.String, 
    parameters: {
        db_name: DatabaseName, 
        table_name: Schema.optional(TableName),
        reducer_name: Schema.optional(ReducerName),
    }
})
.annotate(AiTool.Readonly, true)
.annotate(AiTool.Destructive, false),

AiTool.make("query_table", {
    description: "Performs read-only queries on database tables",
    success: Schema.Array(Schema.Object),
    failure: Schema.String,
    parameters: {
        db_name: DatabaseName,
        table_name: TableName,
        filter: FilterObject
    }
  })
  .annotate(AiTool.Readonly, true)
  .annotate(AiTool.Destructive, false),

  AiTool.make("get_database_status", {
    description: "Checks health and status of a database module",
    success: DatabaseStatus,
    failure: Schema.String,
    parameters: {
        db_name: DatabaseName
      }
  })
  .annotate(AiTool.Readonly, true)
  .annotate(AiTool.Destructive, false),
)

// Implementing the spacetimeDB tools

const ToolkitLayer = toolkit.toLayer(
    Effect.gen(function* () {
      const raw = yield* HttpClient.HttpClient
      const http = raw.pipe(
        HttpClient.filterStatusOk,
        HttpClient.retry(
          Schedule.spaced(Duration.seconds(3)).pipe(
            Schedule.compose(Schedule.recurs(3))
          )
        )
      )



    // included some caching here so that lookup calls aren't repeated if made in a short period of time
    // makes new cache

    
    // cache for the expensive database metadata lookup
    const dbCache = yield* Cache.make({
        // Use the httpUri from SpacetimeConfigLive (from connection_spacetime)
        lookup: (db_name?: string) =>
            Effect.gen(function* () {
                const config = yield* SpacetimeConfigTag;

                if (db_name == null) {
                    const response = yield* http.get(`${config.httpUri}/v1/database`);
                    if (response.status !== 200) {
                        return yield* Effect.fail(new AiError({ code: "ParseError", detail: "Database not found" }));
                    }
                    const databases = yield* HttpClientResponse.schemaBodyJson(Schema.String)(response);
                    return databases;
                }

                const response = yield* http.get(`${config.httpUri}/v1/database/${db_name}`);
                const metadata = yield* HttpClientResponse.schemaBodyJson(Schema.String)(response);
                // Find the database metadata for the requested db_name
                if (!metadata) {
                    return yield* Effect.fail(new AiError({ code: "InvalidRequest", detail: "Database not found" }));
                }
                return metadata;
            }),
        capacity: 100, // max number of databases returned (most recent)
        timeToLive: Duration.minutes(30), // cache expires after 30 minutes
    })
    return toolkit.of({

        // list_databases: Listing all available database modules on a connected spacetimeDB instance
        list_databases: () => dbCache.get(undefined).pipe(Effect.map(JSON.stringify)),
        // Get database interface
        get_database_interface: Effect.fn(function* ({ db_name, table_name, reducer_name }) {
        const config = yield* SpacetimeConfigTag;
          const metadata = yield* dbCache.get(db_name)
          
          if (table_name) {
            const table = metadata.tables.find(t => t.name === table_name)
            if (!table) {
                return yield* Effect.fail(new Error(`Table ${table_name} not found`))
            }
            return table
          }
          
          if (reducer_name) {
            const reducer = metadata.reducers.find(r => r.name === reducer_name)
            if (!reducer) return yield* Effect.fail(new Error(`Reducer ${reducer_name} not found`))
            return reducer
          }
          
          return metadata
        }),
  
        // Query database table
        query_table: Effect.fn(function* ({ db_name, table_name, filter }) {
          const whereClause = Object.entries(filter)
            .map(([key, value]) => {
              const val = typeof value === 'string' ? `'${value}'` : value
              return `${key} = ${val}`
            })
            .join(' AND ')
          
          const sql = `SELECT * FROM "${table_name}"${whereClause ? ` WHERE ${whereClause}` : ''}`
          
          const response = yield* http.post(
            `${SPACETIME_API_BASE}/${db_name}/sql`,
            {
              body: JSON.stringify({ sql }),
              headers: { "Content-Type": "application/json" }
            }
          )
          
          return yield* HttpClientResponse.schemaBodyJson(Schema.Array(Schema.Object))(response)
        }),
  
        // Get database status
        get_database_status: Effect.fn(function* ({ db_name }) {
          const response = yield* http.get(`${SPACETIME_API_BASE}/${db_name}`)
          const data = yield* HttpClientResponse.schemaBodyJson(Schema.Object)(response)
          
          return {
            identity: data.identity,
            address: data.address,
            names: data.names,
            schema_hash: data.schema?.hash || "unknown"
          }
        })
      })
    })
  ).pipe(
    Layer.provide(NodeHttpClient.layerUndici)
  )
  
  export const SpacetimeDBTools = McpServer.toolkit(toolkit).pipe(
    Layer.provide(ToolkitLayer)
  )


  