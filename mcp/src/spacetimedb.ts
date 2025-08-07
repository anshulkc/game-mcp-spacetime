import { AiTool, AiToolkit, McpServer } from "@effect/ai"
import { HttpClient, HttpClientResponse, HttpClientRequest } from "@effect/platform"
import { NodeHttpClient } from "@effect/platform-node"
import {
  Cache,
  Duration,
  Effect,
  Layer,
  pipe,
  Schedule,
  Schema,
} from "effect"
import { SpacetimeConfigTag, fetchSpacetimeIdentity } from "./connection_spacetime.js"


const DatabaseName = Schema.String.annotations({
    description: "The name of the database module",
})

const TableName = Schema.String.annotations({
    description: "The name of the database table",
})

const ReducerName = Schema.String.annotations({
    description: "The name of the reducer function",
})

const HexIdentity = Schema.Struct({ __identity__: Schema.String });
const HostType = Schema.Union(
  Schema.Struct({ Wasm: Schema.Tuple() }),
  Schema.Struct({ TypeScript: Schema.Tuple() }),
  Schema.Struct({ Python: Schema.Tuple() })
  // add new tags here as they appear
);

const DatabaseMetaDataSchema = Schema.Struct({
    database_identity: HexIdentity,
    owner_identity: HexIdentity,
    host_type: HostType,
    initial_program: Schema.String
}).annotations({
    description: "Metadata of a database module for get_database_status",
})

// TODO: thinking about adding adding indexes here (useful for the query_table tool)
const TableSchema = Schema.Struct({
    name: Schema.String,
    product_type_ref: Schema.Number,
    primary_key: Schema.Array(Schema.Number),
    indexes: Schema.Array(Schema.Unknown),
    constraints: Schema.Array(Schema.Unknown),
    sequences: Schema.Array(Schema.Unknown),
    schedule: Schema.Record({key: Schema.String, value: Schema.Array(Schema.Unknown)}),
    table_type: Schema.Record({key: Schema.String, value: Schema.Array(Schema.Unknown)}),
    table_access: Schema.Record({key: Schema.String, value: Schema.Array(Schema.Unknown)})
  }).annotations({
    description: "Schema of a database table for get_database_interface",
  })

  const OptionSchema = <A>(value: Schema.Schema<A>) =>
    Schema.Union(
      Schema.Struct({ none: Schema.Tuple() }),
      Schema.Struct({ some: value })
    )
  
  // AlgebraicType := String | Int | Boolean | …  – each encoded as {"Tag": []}
  const AlgebraicType = Schema.Union(
    Schema.Struct({ String: Schema.Tuple() }),
    Schema.Struct({ Int: Schema.Tuple() }),
    Schema.Struct({ Boolean: Schema.Tuple() })
  )
  
  // Lifecycle := { <tag>: [] }   -- if that really is the shape
  // const Lifecycle = Schema.Record({
  //   key: Schema.String,
  //   value: Schema.Tuple()        // []  – empty array stands for unit
  // })

  export const ReducerSignature = Schema.Struct({
    /** Reducer identifier inside the module */
    name: Schema.String,
    params: Schema.Struct({
    elements: Schema.Array(
        Schema.Struct({
          name: OptionSchema(Schema.String),
          algebraic_type: AlgebraicType
        })
      )
    }),
    lifecycle: Schema.Unknown
  }).annotations({
    description: "Reducer definition for get_database_interface"
  })


  const getDatabasesSchema = Schema.Struct({
    identities: Schema.Array(Schema.String),
  });

  const RawModuleDefJson = Schema.Struct({
    typespace: Schema.Unknown,          // or model it precisely later
    tables: Schema.Array(TableSchema),
    reducers: Schema.Array(ReducerSignature),
    types: Schema.Array(Schema.Unknown),
    misc_exports: Schema.Array(Schema.Unknown),
    row_level_security: Schema.Array(Schema.Unknown)
  })

  const DatabaseInterface = Schema.Struct({
    tables: Schema.Array(TableSchema),
    reducers: Schema.Array(ReducerSignature)
  }).annotations({
    description: "Database interface for get_database_interface",
  })

  const ProductTypeSchema = Schema.Struct({
    elements: Schema.Array(Schema.Struct({
        name: OptionSchema(Schema.String),
        algebraic_type: Schema.Unknown
    }))
  }).annotations({
    description: "Product type for Rowset",
  })

  const RowSetSchema = Schema.Struct({
    schema: ProductTypeSchema,
    rows: Schema.Array(Schema.Array(Schema.Unknown))
  }).annotations({
    description: "Rowset for query_table",
  })

  type RowSet = Readonly<typeof RowSetSchema.Type>

  // the 4 tools to query spacetimeDB

  export const SpacetimeDBToolkit = AiToolkit.make(
    AiTool.make("list_databases", {
      description: "Listing all available database modules on a connected spacetimeDB instance (different servers for different regions)",
      success: Schema.Array(Schema.String),
      failure: Schema.String,
      parameters: {},
    })
    .annotate(AiTool.Readonly, true)
    .annotate(AiTool.Destructive, false),

    AiTool.make("get_database_interface", {
        description: "Retrieves the full interface/metadata for a database module or specific table or reducers. This will list all tables, their schemas, and all available reducers with their function signatures",
        success: Schema.Union(DatabaseInterface, TableSchema, ReducerSignature), // Union === one of the choices
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
        success: Schema.Array(RowSetSchema),
        failure: Schema.String,
        parameters: {
            db_name: DatabaseName,
            table_name: TableName,
            columns: Schema.optional(Schema.Array(Schema.String)),
            where: Schema.optional(Schema.String),
        }
    })
    .annotate(AiTool.Readonly, true)
    .annotate(AiTool.Destructive, false),

    AiTool.make("get_database_status", {
        description: "Checks health and status of a database module",
        success: DatabaseMetaDataSchema,
        failure: Schema.String,
        parameters: {
            db_name: DatabaseName
        }
    })
    .annotate(AiTool.Readonly, true)
    .annotate(AiTool.Destructive, false),
)

// Implementing the spacetimeDB tools

export const ToolkitLayer = SpacetimeDBToolkit.toLayer(
    Effect.gen(function* () {
      const raw = yield* HttpClient.HttpClient
      const http = raw.pipe(
        HttpClient.retry(
          Schedule.spaced(Duration.seconds(3)).pipe(
            Schedule.compose(Schedule.recurs(3))
          )
        )
      )
      const config = yield* SpacetimeConfigTag
      const { identity } = yield* fetchSpacetimeIdentity

    // included some caching here so that lookup calls aren't repeated if made in a short period of time
    // makes new cache
    
    // cache for the expensive database metadata lookup
    const dbCache = yield* Cache.make({
        // Use the httpUri from SpacetimeConfigLive (from connection_spacetime)
        lookup: (db_name?: string) =>
            Effect.gen(function* () {
                if (db_name == null) {
                    const response = yield* http.get(`${config.httpUri}/v1/database`);
                    if (response.status !== 200) {
                        return yield* Effect.fail(`Database ${db_name} not found`);
                    }
                    const databases = yield* HttpClientResponse.schemaBodyJson(DatabaseMetaDataSchema)(response);
                    return databases;
                }

                const response = yield* http.get(`${config.httpUri}/v1/database/${db_name}`);
                const metadata = yield* HttpClientResponse.schemaBodyJson(DatabaseMetaDataSchema)(response);
                // Find the database metadata for the requested db_name
                if (!metadata) {
                    return yield* Effect.fail(`Database ${db_name} not found`);
                }
                return metadata
            }),
        capacity: 100, // max number of databases returned (most recent)
        timeToLive: Duration.hours(12), // cache expires after 12 hours
    })


    const schemaCache = yield* Cache.make({
        lookup: (db_name: string) =>
          Effect.gen(function* () {
            const res = yield* http.get(
              `${config.httpUri}/v1/database/${identity}/schema?version=9`
            )
            // RawModuleDef is big → keep as “unknown” and map later

            const databaseSchema = yield* HttpClientResponse.schemaBodyJson(RawModuleDefJson)(res);
            return databaseSchema;
          }),
        capacity: 100,
        timeToLive: Duration.hours(12)
      })

      

      const runSelectSql = (
        dbName: string,
        sql: string
      ): Effect.Effect<readonly RowSet[], string, never> =>
        Effect.gen(function* ($) {
          return yield* HttpClientRequest.post(`${config.httpUri}/v1/database/${dbName}/sql`).pipe(
            HttpClientRequest.setHeader("Authorization", `Bearer ${'eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJoZXhfaWRlbnRpdHkiOiJjMjAwZWE2MmI0ZmQ3Y2ViM2VjZGQ3NmI3OGU0MDYwOGViNDdhYzY4MTMwZDVmNmRmMGVhZGU3YjAzNDU5YjhlIiwic3ViIjoiMTAzYjFjODctMTExMS00MDM2LTk3MzktMWE0MDI5NTkwNmUxIiwiaXNzIjoibG9jYWxob3N0IiwiYXVkIjpbInNwYWNldGltZWRiIl0sImlhdCI6MTc1NDI4ODI2OSwiZXhwIjpudWxsfQ.-U_DtKyFCKrUWU6BLexwd8erpMSaAWwtlxxhscP1iRqvnnxEM5pBh4Ttbz79S3Ie1u9_YNCTel1_787PLSoSTA'}`),
            HttpClientRequest.bodyText(sql, "text/plain"),
          ).pipe(
          http.execute,
          Effect.flatMap(HttpClientResponse.schemaBodyJson(Schema.Array(RowSetSchema)))
          )
        }).pipe(
          Effect.mapError(err =>
            typeof err === "string"
              ? err
              : (err as any)?.message ?? String(err)
          )
        )

        const buildSelectSql = ({
          tableName,
          columns,
          where,
        }: {
          tableName: string
          columns?: readonly string[]
          where?: string
        }) => {
          const cols =
            columns && columns.length
              ? columns.map(c => `"${c}"`).join(", ")   // ✓ back-ticks → interpolates
              : "*";
        
          const predicate = where && where.trim().length
            ? ` WHERE ${where}`
            : "";
        
          return `SELECT ${cols} FROM "${tableName}"${predicate};`;
        };
        



    return SpacetimeDBToolkit.of({

        // list_databases: Listing all available database modules on a connected spacetimeDB instance
        list_databases: () =>
            http.get(`${config.httpUri}/v1/identity/${identity}/databases`).pipe(
              Effect.flatMap(HttpClientResponse.schemaBodyJson(getDatabasesSchema)),
              Effect.map(res => res.identities),
              Effect.mapError(err =>
                typeof err === "string"
                  ? err
                  : (err as any)?.message ?? String(err)
              )
            ),
        // Get database interface
        get_database_interface: Effect.fn(function* ({ db_name, table_name, reducer_name }) {
            // for a given database, you return both tables and reducers (full interface)
            // if you provide a table name, you return the table schema
            // if you provide a reducer name, you return the reducer signature
            // if both are requested, then make two calls to the function to extract info

            // .pipe(f) == pipe(effect, f)
            const results = yield* schemaCache
            .get(db_name)
            .pipe(
                Effect.mapError(err =>
                    typeof err === "string"
                      ? err
                      : (err as any)?.message ?? String(err)   // ParseError / HttpClientError -> string
                  )
                )

            if (table_name && reducer_name) {
                return yield* Effect.fail("Specify either table_name or reducer_name, not both")
            }
            
            if (table_name) {
                const table = results.tables
                const table_schema = table.find(t => t.name === table_name);
                return table_schema ? table_schema : yield* Effect.fail(`Table ${table_name} not found`);
            }

            if (reducer_name) {
                const reducer = results.reducers
                const reducer_schema = reducer.find(r => r.name === reducer_name);
                return reducer_schema ? reducer_schema : yield* Effect.fail(`Reducer ${reducer_name} not found`);
            }

            // tables: Schema.Array(TableSchema),
    // reducers: Schema.Array(ReducerSignature)

            return db_name ? {tables: results.tables, reducers: results.reducers} : yield* Effect.fail(`Unable to get database interface for ${db_name}`);

        }),
  
        // Query database table
        query_table: ({ db_name, table_name, columns, where }) =>
          Effect.gen(function* ($) {
            // Build SQL from high-level params

            const sql = buildSelectSql({ 
              tableName: table_name, 
              ...(columns && { columns }),
              ...(where && { where }) 
            })
            console.log("▶ SQL:", sql);

        
            // Execute (re-using existing helper)
            const data   = yield* $(runSelectSql(db_name, sql))
        
            return data
          }).pipe(
            Effect.mapError(err =>
              typeof err === "string"
                ? err
                : (err as any)?.message ?? String(err)
            )
          ),
  
        // Get database status
        get_database_status:  ({ db_name }) =>
          pipe(
            dbCache.get(db_name),
            Effect.mapError(err =>
              // any → string;  you can make this nicer if you wish
              typeof err === "string" ? err : (err as any)?.message ?? String(err)
            )
          ),
        })
      })
  ).pipe(
    Layer.provide(
      NodeHttpClient.layerUndici
    )
  )
  
  export const SpacetimeDBTools = McpServer.toolkit(SpacetimeDBToolkit).pipe(
    Layer.provide(ToolkitLayer),
  )
