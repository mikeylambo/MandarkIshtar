import * as THREE from "three";
import { toon } from "../look/LookKit";
import { PALETTE } from "../look/palette";

/**
 * Observatory cartoon art pass. Presentation only: no colliders, triggers,
 * simulation changes or extra gameplay inputs.
 *
 * Geometry is intentionally broad and flat-shaded, matching the approved
 * anime/mecha concept's ink + ivory + gold + midnight-violet language.
 */
const INK = 0x080b1c;
const NAVY = 0x171d41;
const VIOLET = 0x4d3c96;
const GOLD = PALETTE.gold;
const IVORY = 0xffefd0;

let floorTexture: THREE.CanvasTexture | undefined;

export function observatoryFloorTexture(): THREE.CanvasTexture {
  if (floorTexture) return floorTexture;
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Observatory floor needs Canvas2D");

  // Large, readable graphic tiles. No photographic surface noise.
  c.fillStyle = "#171c40";
  c.fillRect(0, 0, size, size);
  const cell = 128;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    c.fillStyle = (x + y) % 2 ? "#242654" : "#1b2249";
    c.fillRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
  }
  c.strokeStyle = "#48509a";
  c.lineWidth = 3;
  for (let i = 0; i <= 8; i++) {
    const at = i * cell;
    c.beginPath(); c.moveTo(at, 0); c.lineTo(at, size); c.stroke();
    c.beginPath(); c.moveTo(0, at); c.lineTo(size, at); c.stroke();
  }

  // Gold concentric construction circles, the visual signature of the hub.
  c.strokeStyle = "#f2b94a";
  for (const [radius, width] of [[470, 8], [422, 3], [300, 5], [270, 2], [105, 6], [70, 2]] as const) {
    c.lineWidth = width;
    c.beginPath(); c.arc(512, 512, radius, 0, Math.PI * 2); c.stroke();
  }
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + i * Math.PI * 2 / 7;
    c.lineWidth = i === 0 ? 8 : 3;
    c.beginPath(); c.moveTo(512 + Math.cos(a) * 110, 512 + Math.sin(a) * 110);
    c.lineTo(512 + Math.cos(a) * 418, 512 + Math.sin(a) * 418); c.stroke();
  }

  // Seven-pointed original sigil: center alignment without new UI copy.
  c.fillStyle = "#ffd77a";
  c.beginPath();
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 7;
    const r = i % 2 === 0 ? 53 : 21;
    const px = 512 + Math.cos(a) * r;
    const py = 512 + Math.sin(a) * r;
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath(); c.fill();

  floorTexture = new THREE.CanvasTexture(canvas);
  floorTexture.colorSpace = THREE.SRGBColorSpace;
  floorTexture.anisotropy = 4;
  floorTexture.magFilter = THREE.LinearFilter;
  return floorTexture;
}

function silhouette(points: [number, number][], color: number, z: number): THREE.Mesh {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y));
  shape.closePath();
  const mesh = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, fog: false }),
  );
  mesh.position.z = z;
  return mesh;
}

function skyline(seed: number, distance: number, baseY: number, color: number): THREE.Mesh {
  // Stable skyline silhouettes; not random runtime variation or texture noise.
  const points: [number, number][] = [[-56, -16], [-56, baseY]];
  for (let i = 0; i < 20; i++) {
    const x = -56 + i * 5.6;
    const h = 4 + ((i * 7 + seed * 5) % 9);
    const top = baseY + h;
    points.push([x, baseY], [x, top]);
    if ((i + seed) % 4 === 0) {
      points.push([x + 2.8, top + 4.5], [x + 5.6, top]);
    } else if ((i + seed) % 3 === 0) {
      points.push([x + 2.8, top + 2.2], [x + 5.6, top]);
    } else {
      points.push([x + 5.6, top]);
    }
    points.push([x + 5.6, baseY]);
  }
  points.push([56, -16]);
  return silhouette(points, color, distance);
}

export interface ObservatoryArt {
  group: THREE.Group;
  animate(timeSeconds: number): void;
}

/** Decorative only; all arches and skyline objects remain outside the arena boundary. */
export function buildObservatoryArt(radius: number): ObservatoryArt {
  const group = new THREE.Group();
  group.name = "observatory:cartoon-art-pass";

  // A strong graphic perimeter readable under the existing high-angle camera.
  const stageEdge = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.34, radius - 0.24, 96),
    new THREE.MeshBasicMaterial({ color: GOLD, side: THREE.DoubleSide, depthWrite: false }),
  );
  stageEdge.rotation.x = -Math.PI / 2;
  stageEdge.position.y = 0.025;
  group.add(stageEdge);

  // Instanced cartoon columns retain the original arena collision rules.
  const n = 12;
  const stem = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.72, 3.8, 0.72), toon(NAVY), n,
  );
  const cap = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.42, 0.36, 1.42), toon(IVORY), n,
  );
  const goldBar = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.5, 0.13, 1.5), toon(GOLD), n,
  );
  const pivot = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const a = i * Math.PI * 2 / n;
    const x = Math.sin(a) * (radius + 3.3);
    const z = Math.cos(a) * (radius + 3.3);
    pivot.position.set(x, 2.0, z); pivot.updateMatrix(); stem.setMatrixAt(i, pivot.matrix);
    pivot.position.y = 4.05; pivot.updateMatrix(); cap.setMatrixAt(i, pivot.matrix);
    pivot.position.y = 4.29; pivot.updateMatrix(); goldBar.setMatrixAt(i, pivot.matrix);
  }
  stem.instanceMatrix.needsUpdate = true;
  cap.instanceMatrix.needsUpdate = true;
  goldBar.instanceMatrix.needsUpdate = true;
  group.add(stem, cap, goldBar);

  // Layered skyline, not a photoreal skybox.
  group.add(skyline(1, radius + 29, -4, VIOLET));
  group.add(skyline(4, radius + 25, -6, 0x322b6c));
  group.add(skyline(2, radius + 21, -8, 0x191b45));

  // Oversized moon gives close-up/cinematic shots the concept's silhouette.
  // Gameplay remains readable because the moon lives far outside the play area.
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(9, 64),
    new THREE.MeshBasicMaterial({ color: IVORY, side: THREE.DoubleSide, fog: false }),
  );
  moon.position.set(-1.5, 20, radius + 33);
  group.add(moon);

  const moonHalo = new THREE.Mesh(
    new THREE.RingGeometry(9.5, 9.8, 64),
    new THREE.MeshBasicMaterial({ color: GOLD, side: THREE.DoubleSide, fog: false }),
  );
  moonHalo.position.copy(moon.position);
  moonHalo.position.z -= 0.08;
  group.add(moonHalo);

  // A deliberate orbit graphic rather than particle-heavy atmospheric noise.
  const orbit = new THREE.Group();
  orbit.position.set(0, 5, 0);
  const orbitalRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.1, 0.055, 5, 72),
    new THREE.MeshBasicMaterial({ color: PALETTE.blue, depthWrite: false }),
  );
  orbitalRing.rotation.x = Math.PI / 2.7;
  orbit.add(orbitalRing);
  const orbitalGold = new THREE.Mesh(
    new THREE.TorusGeometry(3.65, 0.04, 5, 72),
    new THREE.MeshBasicMaterial({ color: GOLD, depthWrite: false }),
  );
  orbitalGold.rotation.x = Math.PI / 2.25;
  orbit.add(orbitalGold);
  group.add(orbit);

  // Ink-dark framework stays restrained so the existing stations and doors read.
  const outerBand = new THREE.Mesh(
    new THREE.TorusGeometry(radius + 3.3, 0.24, 4, 96),
    toon(INK),
  );
  outerBand.rotation.x = Math.PI / 2;
  outerBand.position.y = 4.5;
  group.add(outerBand);
  const goldRail = new THREE.Mesh(
    new THREE.TorusGeometry(radius + 3.3, 0.055, 4, 96),
    toon(GOLD),
  );
  goldRail.rotation.x = Math.PI / 2;
  goldRail.position.y = 4.76;
  group.add(goldRail);

  return {
    group,
    animate: (t) => {
      orbitalRing.rotation.z = t * 0.11;
      orbitalGold.rotation.z = -t * 0.08;
      moonHalo.rotation.z = Math.sin(t * 0.14) * 0.01;
    },
  };
}
