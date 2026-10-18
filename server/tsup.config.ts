import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts"],
  format: ["esm"],
  target: "node24",
  outDir: "dist",
  clean: true,
  splitting: false,
  sourcemap: true,
});
