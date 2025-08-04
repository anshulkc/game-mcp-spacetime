// test/_utils.ts
import { Effect } from "effect";

/** Unwrap a Right, fail the test if it's a Left. */
export function expectRight<A>(fx: Effect.Effect<A, unknown, never>) {
  return Effect.matchEffect(fx, {
    onFailure: (err: unknown) => Effect.die(new Error(`Expected Right, got Left: ${err}`)),
    onSuccess: (res: A) => Effect.succeed(res),
  });
}
