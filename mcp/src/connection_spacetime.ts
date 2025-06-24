import { Effect } from "effect";
import { Identity } from '@clockworklabs/spacetimedb-sdk'
import { DbConnection } from '../../client/src/module_bindings/index.js'
interface SpacetimeConfig {
    httpUri: string;
    wsUri: string;
    moduleName: string;
}

interface SpacetimeIdentity {
    identity: string;
    token: string;
}

const SpacetimeConfigLive = Effect.succeed<SpacetimeConfig>({
    httpUri: process.env.SPACETIMEDB_HTTP_URI ?? "http://localhost:3000",
    wsUri: process.env.SPACETIMEDB_WS_URI ?? "ws://localhost:3000",
    moduleName: process.env.SPACETIMEDB_MODULE ?? "default_module"
  });

const fetchSpacetimeIdentity = Effect.gen(function* () {
    const config = yield* (SpacetimeConfigLive);
    const response = yield* (
    Effect.tryPromise({
      try: () =>
        fetch(`${config.httpUri}/v1/identity`, { method: "POST" }),
      catch: (e) => new Error("Failed to fetch identity: " + String(e))
    })
  );
  if (!response.ok) {
    throw new Error(`Identity fetch failed: ${response.statusText}`);
  }
  const data = yield* (Effect.promise(() => response.json()));
  return { identity: data.identity, token: data.token } as SpacetimeIdentity;
});

export const connectToSpacetimeDB = Effect.gen(function* () {
    const config = yield* (SpacetimeConfigLive);
    const {identity, token} = yield* (fetchSpacetimeIdentity);
    
    return yield* (
        Effect.async<DbConnection, Error>((resume) => {
            DbConnection.builder()
            .withUri(config.wsUri)
            .withModuleName(config.moduleName)
            .withToken(token)
            .onConnect((conn, identity) => {
                if (identity.toHexString() !== identity) {
                  reject(new Error("Identity mismatch"));
                } else {
                  resolve(conn);
                }
              }))

    )
})







