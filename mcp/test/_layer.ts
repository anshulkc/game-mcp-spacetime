// test/_layer.ts
import { Layer } from "effect";
import { NodeHttpClient } from "@effect/platform-node";
import {
  SpacetimeConfigTag,
  SpacetimeConfigLive as DefaultCfg,
} from "../src/connection_spacetime.js";
import { SpacetimeDBTools, ToolkitLayer } from "../src/spacetimedb.js";

// Layer that provides the toolkit with its actual implementations  
export const ToolkitTestLayer = ToolkitLayer.pipe(
  Layer.provide(NodeHttpClient.layerUndici),
  Layer.provide(
    Layer.succeed(
      SpacetimeConfigTag,
      {
        httpUri:   process.env.SPACETIMEDB_HTTP_URI ?? DefaultCfg.httpUri,
        wsUri:     process.env.SPACETIMEDB_WS_URI  ?? DefaultCfg.wsUri,
        identity: process.env.SPACETIMEDB_IDENTITY  ?? DefaultCfg.identity,
      },
    ),
  ),
);

export const LiveLayer = SpacetimeDBTools.pipe(
  Layer.provide(NodeHttpClient.layerUndici),
  Layer.provide(
    Layer.succeed(
      SpacetimeConfigTag,
      {
        httpUri:   process.env.SPACETIMEDB_HTTP_URI ?? DefaultCfg.httpUri,
        wsUri:     process.env.SPACETIMEDB_WS_URI  ?? DefaultCfg.wsUri,
        identity: process.env.SPACETIMEDB_IDENTITY  ?? DefaultCfg.identity,
      },
    ),
  ),
);
