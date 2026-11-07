import * as THREE from "three";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { createLook, type LookKit as ShellLook } from "@slu/web-shell/look/three";
import { loadTuningCanon, tunables } from "@slu/web-shell/tuning";
import { InversionShader, installLook } from "../look/LookKit";
import { PALETTE } from "../look/palette";

/** Mandark look canon (palette tokens, slu.lit, outline, post) bundled from /tuning/*.json. */
const CANON = import.meta.glob("/tuning/*.json", { eager: true });

/**
 * Renderer + scene + the shell Look Kit post stack (bloom on gold/white emissives via threshold, grade, vignette, FXAA),
 * with the game's inversion pass inserted after the grade.
 */
export class SceneRig {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly look: ShellLook;
  readonly inversion: ShaderPass;
  readonly hemi: THREE.HemisphereLight;
  readonly key: THREE.DirectionalLight;
  quality: "high" | "low" = "high";

  constructor(readonly canvas: HTMLCanvasElement) {
    loadTuningCanon(CANON, tunables);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: true });
    this.renderer.setClearColor(PALETTE.void, 1);
    this.renderer.info.autoReset = false;
    this.camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 400);
    this.scene.fog = new THREE.Fog(PALETTE.void, 40, 140);
    this.hemi = new THREE.HemisphereLight(0xdfe6ff, 0x1a2140, 1.25);
    this.key = new THREE.DirectionalLight(0xffffff, 1.6);
    this.key.position.set(-8, 20, 6);
    this.scene.add(this.hemi, this.key);
    this.look = createLook({ renderer: this.renderer, scene: this.scene, camera: this.camera, registry: tunables, particles: 3000 });
    installLook(this.look);
    this.inversion = new ShaderPass(InversionShader);
    const passes = this.look.post.composer.passes.length;
    this.look.post.composer.insertPass(this.inversion, Math.min(4, passes));
    this.resize();
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.look.resize(w, h, this.quality === "high" ? Math.min(2, window.devicePixelRatio || 1) : 1);
  }

  setQuality(q: "high" | "low"): void {
    this.quality = q;
    tunables.set("look.post", "quality", q === "high" ? "high" : "low");
    this.resize();
  }

  /** Presentation dt keeps shell VFX/post in step with slow-mo. */
  update(dt: number): void { this.look.update(dt); }
  render(): void { this.renderer.info.reset(); this.look.render(); }
}
