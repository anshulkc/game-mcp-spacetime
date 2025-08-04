import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  tsconfig: "tsconfig.build.json",   // <-- here
  dts: true,
  format: ["esm", "cjs"]
});