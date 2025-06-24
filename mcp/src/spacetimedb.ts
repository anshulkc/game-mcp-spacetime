import { AiTool, AiToolkit, McpServer } from "@effect/ai"
import { HttpClient, HttpClientResponse, Path } from "@effect/platform"
import { NodeHttpClient, NodePath } from "@effect/platform-node"
import {
  Array,
  Cache,
  Duration,
  Effect,
  Layer,
  Option,
  pipe,
  Schedule,
  Schema,
} from "effect"

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
    tables: Schema.Array(TableSchema),
    reducers: Schema.Array(ReducerSignature)
  }).annotations({
    description: "Database interface for get_database_interface",
  })

  // the 4 tools to query spacetimeDB

  const toolkit = AiToolkit.make(
    AiTool.make("list_databases", {
      description: "Listing all available database modules on a connected spacetimeDB instance (different servers for different regions)",
      success: Schema.Array(DatabaseName),
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
        const http = yield* HttpClient.HttpClient.pipe(
            HttpClient.filterStatusOk,
            HttpClient.retry(Schedule.spaced(distanceDuration.seconds(3)).pipe(
                Schedule.compose(Schedule.recurs(3))
            )
        )
    )

    