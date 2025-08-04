// i made this file to connect to spacetime db and get the connection object
// you do this by using the /v1/identity endpoint to get the identity and token

import { Effect, Console, Context } from "effect";
import { DbConnection } from '../../client/src/module_bindings/index.js'


export interface SpacetimeConfig {
    readonly httpUri: string;
    readonly wsUri: string;
    readonly identity: string;
}

interface SpacetimeIdentity {
    identity: string;
    token: string;
}

// class SpacetimeConfig extends Context.Tag("SpacetimeConfig")<
//     SpacetimeConfig,
//     { readonly httpUri: string; readonly wsUri: string; readonly moduleName: string }
//     >() {}

// curried meaning; transformation rewriting a function that rewrites a function that normally expects
// expects several arguments at one f(a, b, c) into f(a)(b)(c)
// call supplies one argument and returns a new function thta waits for the next argument
// until all parameters have been provided


export class SpacetimeConfigTag extends
  Context.Tag("SpacetimeConfig")< // run time identifier
    SpacetimeConfigTag,                   // SELF  = the key/tag of the context
    SpacetimeConfig                       // SERVICE - the interface that describes the value stored in the context
  >() {}
  
export const SpacetimeConfigLive: SpacetimeConfig = {
    httpUri: process.env.SPACETIMEDB_HTTP_URI ?? "http://localhost:3000",
    wsUri: process.env.SPACETIMEDB_WS_URI ?? "ws://localhost:3000",
    identity: process.env.SPACETIMEDB_IDENTITY ?? "c200a7faab014ed9655ddc4de58a8ee28c87e1d3b556d0d8c8d7e61e1e8fa4e1",
}

export const spacetimeDBConnection = () => {
    return Effect.provideService(
        connectToSpacetimeDB, // the base program
        SpacetimeConfigTag, // the key of the context
        SpacetimeConfigLive // the value stored in the context
    );
}

export const fetchSpacetimeIdentity = Effect.gen(function* () {
    const config = yield* (SpacetimeConfigTag);
    
    console.error("🔧 Using manual SpacetimeDB identity:", config.identity);
    return { identity: config.identity, token: "" } as SpacetimeIdentity;
});

export const fetchSpacetimeIdentityTwo = Effect.gen(function* () {
  const config = yield* (SpacetimeConfigTag);
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
return { identity: "", token: data.token } as SpacetimeIdentity;
});

export const connectToSpacetimeDB = Effect.gen(function* () {
    const config = yield* (SpacetimeConfigTag);
    const { identity } = yield* (fetchSpacetimeIdentity);
    const { token } = yield* (fetchSpacetimeIdentityTwo);
    
    return yield* (
        Effect.async<DbConnection, Error>((resume) => {
            DbConnection.builder()
            .withUri(config.wsUri)
            .withModuleName(config.identity)
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






