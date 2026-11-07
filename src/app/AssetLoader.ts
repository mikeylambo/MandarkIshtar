/**
 * Placeholder swap contract (GDD §13): every asset key resolves through assets/manifest.json.
 * Keys with a file that exists override their procedural/synth stand-in; missing files fall back silently
 * and are listed for the dev console.
 */
export interface ManifestEntry { file: string | null; kind: string; standIn: string }
export class AssetLoader {
  readonly entries = new Map<string, ManifestEntry>();
  readonly resolved = new Map<string, string>();
  readonly missing: string[] = [];

  async load(url: string, onResolved: (key: string, url: string) => void): Promise<void> {
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const json = (await res.json()) as { assets: Record<string, ManifestEntry> };
      for (const [k, v] of Object.entries(json.assets)) this.entries.set(k, v);
    } catch { return; }
    const checks = [...this.entries].filter(([, v]) => v.file).map(async ([k, v]) => {
      try {
        const r = await fetch(v.file!, { method: "HEAD" });
        const type = r.headers.get("content-type") ?? "";
        if (r.ok && !type.includes("text/html")) { this.resolved.set(k, v.file!); onResolved(k, v.file!); }
        else this.missing.push(k);
      } catch { this.missing.push(k); }
    });
    await Promise.all(checks);
  }
  url(key: string): string | null { return this.resolved.get(key) ?? null; }
}
