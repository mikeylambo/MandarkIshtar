import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  build: { target: "es2022", chunkSizeWarningLimit: 1500, sourcemap: false },
  test: { include: ["tests/**/*.test.ts"], environment: "node", testTimeout: 600000, hookTimeout: 60000 }
});
