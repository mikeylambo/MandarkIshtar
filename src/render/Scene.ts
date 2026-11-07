import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { InversionShader } from "../look/LookKit";
import { PALETTE } from "../look/palette";

/** Renderer, scene, post chain (bloom on gold/white emissives only via a high threshold, then the inversion pass). */
export class SceneRig {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly composer: EffectComposer;
  readonly bloom: UnrealBloomPass;
  readonly inversion: ShaderPass;
  readonly hemi: THREE.HemisphereLight;
  readonly key: THREE.DirectionalLight;
  quality: "high" | "low" = "high";

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setClearColor(PALETTE.void, 1);
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.info.autoReset = false;
    this.camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 400);
    this.scene.fog = new THREE.Fog(PALETTE.void, 40, 140);
    this.hemi = new THREE.HemisphereLight(0xdfe6ff, 0x1a2140, 1.25);
    this.key = new THREE.DirectionalLight(0xffffff, 1.6);
    this.key.position.set(-8, 20, 6);
    this.scene.add(this.hemi, this.key);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1280, 720), 0.85, 0.45, 0.82);
    this.composer.addPass(this.bloom);
    this.inversion = new ShaderPass(InversionShader);
    this.composer.addPass(this.inversion);
    this.composer.addPass(new OutputPass());
    this.resize();
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  setQuality(q: "high" | "low"): void {
    this.quality = q;
    this.renderer.setPixelRatio(q === "high" ? Math.min(2, window.devicePixelRatio || 1) : 1);
    this.bloom.enabled = q === "high";
    this.resize();
  }

  render(): void { this.renderer.info.reset(); this.composer.render(); }
}
