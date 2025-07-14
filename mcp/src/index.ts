// import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js"
import { McpServer, McpSchema } from "@effect/ai"
import { NodeRuntime, NodeSink, NodeStream } from "@effect/platform-node"
import { Layer, Logger } from "effect"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod";
import * as Effect from "effect/Effect";
import * as Context from "effect/Context";
import * as Exit from "effect/Exit";
// additional imports for toolkits and configuration
import { SpacetimeDBTools } from "./spacetimedb.js";
import { ReferenceDocsTools } from "./temp.js";
import { SpacetimeConfigTag, SpacetimeConfigLive } from "./connection_spacetime.js";


// service: reusable components that provide specifical functionality like logging, database access or configuration
// services are stored in a Context, which acts as a repository or container
// service identified by a unique tag, and the required ones are reflected in the Requirements parameter of the effect types

// Config: application configuration
// Logger: depends on Config
// Database: depends on Config and Logger services

// layers: higher level abstraction for constructing services (handles creation of servicess and dependencies
// without exposing the implementation details of the services --> manages dependencies between services

// context: collection storing services; i.e a map with tags as keys and services as values

// tag: unique identifier for a service

        // ┌─── The service to be created
        // │                ┌─── The possible error
        // │                │      ┌─── The required dependencies
        // ▼                ▼      ▼
// Layer<RequirementsOut, Error, RequirementsIn> --> Layer is a function that returns a Layer object

// Effect.Effect --> first Effect refers to the module containing core functionality and second Effect is the concrete
// type representing an effectful computation


// we define a service tag for the database connection

// this code will be focused to be production ready, so I will choose to use service/layer wherever possible

// mcp server implementation in @effect/ai
// layerStdio is a layer that provides a McpServer instance with stdio transport
// it takes in the name, version, stdin, and stdout streams
// it returns a layer that provides a McpServer instance
// it also provides a logger layer

McpServer.layerStdio({
        name: "spacetime-mcp",
        version: "0.0.1",
        stdin: NodeStream.stdin,
        stdout: NodeSink.stdout
}).pipe(
        Layer.provide([
          // provide the spacetime configuration service
          Layer.succeed(SpacetimeConfigTag, SpacetimeConfigLive),
          // provide the custom MCP toolkits
          SpacetimeDBTools,
          ReferenceDocsTools,
        ]),
        Layer.provide(Logger.add(Logger.prettyLogger({ stderr: true }))), // stderr logger
        Layer.launch,
        NodeRuntime.runMain,
)

