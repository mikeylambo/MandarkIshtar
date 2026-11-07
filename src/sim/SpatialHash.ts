/** Uniform-grid spatial hash on the XZ plane (cell 4 u). Rebuilt each frame. */
export class SpatialHash {
  private cells = new Map<number, number[]>();
  private pool: number[][] = [];
  constructor(readonly cell = 4) {}
  private key(cx: number, cz: number): number { return ((cx + 512) << 10) | (cz + 512); }
  clear(): void {
    for (const arr of this.cells.values()) { arr.length = 0; this.pool.push(arr); }
    this.cells.clear();
  }
  insert(index: number, x: number, z: number, r: number): void {
    const c = this.cell;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const z0 = Math.floor((z - r) / c), z1 = Math.floor((z + r) / c);
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
      const k = this.key(cx, cz);
      let arr = this.cells.get(k);
      if (!arr) { arr = this.pool.pop() ?? []; this.cells.set(k, arr); }
      arr.push(index);
    }
  }
  /** Calls fn for each candidate index near (x,z,r). May repeat indices across cells; caller dedupes if needed. */
  query(x: number, z: number, r: number, out: number[]): number[] {
    out.length = 0;
    const c = this.cell;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const z0 = Math.floor((z - r) / c), z1 = Math.floor((z + r) / c);
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
      const arr = this.cells.get(this.key(cx, cz));
      if (!arr) continue;
      for (const i of arr) if (!out.includes(i)) out.push(i);
    }
    return out;
  }
}
