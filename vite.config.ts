import { defineConfig, type Plugin } from "vitest/config";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Emits `asset-index.json`: the manifest files that actually exist in the public dir at build time. The AssetLoader
 * fetches only those, so a release with stand-ins makes no requests for undelivered files (hosts answer them 404).
 */
function assetIndex(): Plugin {
  return {
    name: "asset-index",
    apply: "build",
    generateBundle() {
      const manifest = JSON.parse(readFileSync("assets/manifest.json", "utf8")) as { assets: Record<string, { file: string | null }> };
      const present = Object.values(manifest.assets).map((v) => v.file).filter((f): f is string => !!f && existsSync(join("assets", f)));
      this.emitFile({ type: "asset", fileName: "asset-index.json", source: JSON.stringify({ present }) });
    },
  };
}

export default defineConfig({
  base: "./",
  publicDir: "assets",
  plugins: [assetIndex()],
  build: { target: "es2022", chunkSizeWarningLimit: 1500, sourcemap: false },
  test: { include: ["tests/**/*.test.ts"], environment: "node", testTimeout: 600000, hookTimeout: 60000 }
});
