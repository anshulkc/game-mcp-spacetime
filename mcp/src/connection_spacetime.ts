// i made this file to connect to spacetime db and get the connection object
// you do this by using the /v1/identity endpoint to get the identity and token

import { Effect, Console, Context } from "effect";
import { DbConnection } from '../../client/src/module_bindings/index.js'

export interface SpacetimeConfig {
    readonly httpUri: Effect.Effect<string>;
    readonly wsUri: Effect.Effect<string>;
    readonly moduleName: Effect.Effect<string>;
}

interface SpacetimeIdentity {
    identity: string;
    token: string;
}

// class SpacetimeConfig extends Context.Tag("SpacetimeConfig")<
//     SpacetimeConfig,
//     { readonly httpUri: string; readonly wsUri: string; readonly moduleName: string }
//     >() {}

export const SpacetimeConfigTag = Context.Tag("SpacetimeConfig")<SpacetimeConfig>

export const SpacetimeConfigLive: SpacetimeConfig = {
    httpUri: Effect.succeed(process.env.SPACETIMEDB_HTTP_URI ?? "http://localhost:3000"),
    wsUri: Effect.succeed(process.env.SPACETIMEDB_HTTP_URI ?? "http://localhost:3000"),
    moduleName: Effect.succeed(process.env.SPACETIMEDB_HTTP_URI ?? "http://localhost:3000")
}

export const spacetimeDBConnection = () => {
    return Effect.provideService(
        connectToSpacetimeDB,
        SpacetimeConfig,
        SpacetimeConfigLive
    );
}


const fetchSpacetimeIdentity = Effect.gen(function* () {
    const config = yield* (SpacetimeConfig);
    const response = yield* (
    Effect.tryPromise({
      try: () =>
        fetch(`${config.httpUri}/v1/identity`, { method: "POST" }),
      catch: (e) => new Error("Failed to fetch identity: " + String(e))
    })
  );
  if (!response.ok) {
    return yield* Effect.fail(new Error(`Identity fetch failed: ${response.statusText}`));
  }
  const data = yield* (Effect.promise(() => response.json()));
  return { identity: data.identity, token: data.token } as SpacetimeIdentity;
});

const connectToSpacetimeDB = Effect.gen(function* () {
    const config = yield* (SpacetimeConfig);
    const {identity, token} = yield* (fetchSpacetimeIdentity);
    
    return yield* (
        Effect.async<DbConnection, Error>((resume) => {
            DbConnection.builder()
            .withUri(config.wsUri)
            .withModuleName(config.moduleName)
            .withToken(token)
            .onConnect((conn, a_identity) => {
                if (a_identity.toHexString() !== identity) {
                  resume(Effect.fail(new Error("Identity mismatch")));
                } else {
                    resume(Effect.succeed(conn));
                }
              })
              .onConnectError((_ctx, err) => {
                resume(Effect.fail(new Error(`Connection failed: ${err.message}`)));
              })
              .onDisconnect(() => {
                Console.log("Disconnected from SpacetimeDB");
              })
              .build();
            })
        )
    })






