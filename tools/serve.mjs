// Starts `vite preview` on a free port and resolves with its URL. Used by boot-check / captures / perf.
import { preview } from "vite";
export async function serve(port = 4173) {
  const server = await preview({ preview: { port, strictPort: false, host: "127.0.0.1" }, logLevel: "silent" });
  const url = server.resolvedUrls?.local?.[0] ?? `http://127.0.0.1:${port}/`;
  return { url, close: () => new Promise((r) => server.httpServer.close(r)) };
}
