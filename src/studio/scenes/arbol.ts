import * as THREE from "three";
import type { EngineApi, Mode, StudioScene } from "../types.ts";

/* Autumn Tree — ported verbatim from public/3d/arbol3d-v3.html (legacy page).
   Concept — Abdou Yaackoubi · the Sakura QR tree.
   The seed and every rnd() call keep their original order so the generated
   layout is identical to the standalone page. */

const QR = [
"QQQQQQQ.Q.Q...QQQQ..Q.QQQQQQQ",
"Q.....Q.QQQ.Q..QQ.Q.Q.Q.....Q",
"Q.QQQ.Q..Q.QQQ.Q.QQ...Q.QQQ.Q",
"Q.QQQ.Q.QQ..Q.QQ...Q..Q.QQQ.Q",
"Q.QQQ.Q.QQQ.QQQ..QQ...Q.QQQ.Q",
"Q.....Q.Q..Q.....QQQ..Q.....Q",
"QQQQQQQ.Q.Q.Q.Q.Q.Q.Q.QQQQQQQ",
".........QQQQ.Q.Q...Q........",
"...Q..Q.....Q..Q.Q.....QQQ.QQ",
"Q...Q..Q..QQQ.QQQ..QQQ..Q...Q",
".Q.QQ.QQ.QQ.QQ.QQ.Q.Q.Q...QQ.",
"Q.QQ.Q...QQQQQQ......QQQQ.QQ.",
".QQQQQQ.Q.......QQ.QQ.QQ.Q...",
".....Q.QQ.QQ.QQ.Q..QQQ.Q.Q.Q.",
".QQQ.QQ.Q.QQQ..Q.QQ...Q....QQ",
".Q.QQ..QQQ..Q......Q...Q...Q.",
"QQ...QQ.QQQ..Q..QQQQ...QQ..Q.",
".QQ.....Q.QQ..Q.QQ.QQ.....QQQ",
"Q.Q.Q.QQ..QQQQQQ.Q...Q.QQ..QQ",
"..QQ.Q...Q..QQ.Q.QQ....Q.....",
"Q..QQQQ.Q..QQQQ.Q...QQQQQ..Q.",
"........Q.Q......Q..Q...Q..QQ",
"QQQQQQQ..QQQ.Q.Q.QQ.Q.Q.QQQQ.",
"Q.....Q..QQQ.Q....Q.Q...Q.QQQ",
"Q.QQQ.Q..Q....QQQ.Q.QQQQQQ.Q.",
"Q.QQQ.Q.Q..QQQQQQ..QQQQ.QQQQQ",
"Q.QQQ.Q..Q.QQ...Q..QQ...Q.Q.Q",
"Q.....Q..Q..Q..QQQQQ..QQ..QQ.",
"QQQQQQQ..QQQ...QQQ....Q.QQQQ."];

interface Leaf {
  cxp: number; cyp: number; czp: number;
  tx: number; ty: number; tz: number;
  q: number; qDelay: number; dur: number;
  ph: number; rx: number; ry: number; yaw: number;
  cPainted?: number;
}
interface Vox {
  mesh: THREE.InstancedMesh; i: number;
  hx: number; hy: number; hz: number;
  ex: number; ey: number; ez: number;
  sx: number; sy: number; sz: number;
  rot: number; ph: number; sp: number; delay: number; k: number;
  scaleY?: number;
  isLeaf?: Leaf; isFiller?: { g: number; delay: number };
}

export function create(api: EngineApi): StudioScene {
  const N = 29, MSZ = 0.5;
  const cx = (c: number) => (c - 14) * MSZ, cz = (r: number) => (r - 14) * MSZ;
  const inFinder = (c: number, r: number) => (c < 8 && r < 8) || (c > 20 && r < 8) || (c < 8 && r > 20);
  const inTrunkZone = (c: number, r: number) => Math.abs(c - 14) <= 1 && Math.abs(r - 14) <= 1;

  let seed = 23;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const smooth = (p: number) => p * p * (3 - 2 * p);

  const rig = new THREE.Group();
  rig.add(new THREE.HemisphereLight(0xfffaf0, 0x8a8578, 1.3));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.2);
  sun.position.set(-5.1, 16, -3.2);
  rig.add(sun);

  const world = new THREE.Group();
  rig.add(world);

  const M = new THREE.Matrix4(), C = new THREE.Color(), C2 = new THREE.Color();
  const V = new THREE.Vector3(), SC = new THREE.Vector3(1, 1, 1);
  const Qt = new THREE.Quaternion(), E = new THREE.Euler();
  const HSL = { h: 0, s: 0, l: 0 };
  /* landed/QR version of a leaf tone: keep the vivid palette color and only
     clamp lightness so pale palettes still read as modules on white */
  const vividToQR = (col: THREE.Color) => {
    col.getHSL(HSL);
    const yellowish = HSL.h > 0.08 && HSL.h < 0.4;
    return new THREE.Color().setHSL(HSL.h, Math.max(HSL.s, 0.5), Math.min(HSL.l, yellowish ? 0.44 : 0.52));
  };

  const voxels: Vox[] = [];
  function reg(mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, baseE?: THREE.Euler): Vox {
    const a = rnd() * Math.PI * 2, rr = 7 + rnd() * 7;
    const v: Vox = { mesh, i, hx: x, hy: y, hz: z, ex: baseE ? baseE.x : 0, ey: baseE ? baseE.y : 0, ez: baseE ? baseE.z : 0,
      sx: Math.cos(a) * rr, sy: 2.5 + rnd() * 8, sz: Math.sin(a) * rr,
      rot: (rnd() - 0.5) * 5, ph: rnd() * 6.28, sp: 0.5 + rnd() * 0.7, delay: rnd() * 0.9, k: 1 };
    voxels.push(v);
    return v;
  }

  // ---- classification of dark modules ----
  const grassCells: [number, number][] = [], rockCells: [number, number][] = [], leafTargets: [number, number][] = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (QR[r][c] !== "Q") continue;
    if (inTrunkZone(c, r)) continue;            // the trunk occupies the center
    if (inFinder(c, r)) {
      (rnd() < 0.3 ? rockCells : grassCells).push([c, r]);
    } else if (rnd() < 0.10) {
      grassCells.push([c, r]);
    } else {
      leafTargets.push([c, r]);
    }
  }

  // ---- light floor, just wider than the QR (14.5) ----
  const SOIL = 17;
  const FLOORS: Record<string, number> = { cement: 0xD2D2CC, grass: 0xBCCF9C, dirt: 0xD8C7A4 };
  let floorKey = "grass";
  const soilMat = new THREE.MeshLambertMaterial({ color: FLOORS.grass, transparent: true, opacity: 1 });
  const soil = new THREE.Mesh(new THREE.BoxGeometry(SOIL, 0.85, SOIL), soilMat);
  soil.position.y = -0.425;
  world.add(soil);
  const soilRim = new THREE.Mesh(new THREE.BoxGeometry(SOIL + 0.7, 0.32, SOIL + 0.7),
    new THREE.MeshLambertMaterial({ color: 0x9EAD83, transparent: true, opacity: 1 }));
  soilRim.position.y = -1.0;
  world.add(soilRim);
  const rimMat = soilRim.material as THREE.MeshLambertMaterial;

  const WHITE = new THREE.Color(0xFFFFFF);
  const soilBase = new THREE.Color(FLOORS.grass);
  const rimBase = new THREE.Color(0x9EAD83);
  let whiteT = 0;
  const CV = new THREE.Vector3();

  const SUN_DIR = [0.32, 0.2];

  // ---- trunk ----
  const CS = 0.32;
  const trunkCells: [number, number, number][] = [];
  for (let y = 0.2; y <= 7.2; y += CS) {
    const rad = 0.85 - y * 0.05;
    for (let x = -0.96; x <= 0.96; x += CS)
    for (let z = -0.96; z <= 0.96; z += CS)
      if (x * x + z * z <= rad * rad) trunkCells.push([x, y, z]);
  }
  const trunkSet = new Set(trunkCells.map(([x, y, z]) => Math.round(x / CS) + ":" + Math.round(y / CS) + ":" + Math.round(z / CS)));
  ([[1.6, 8.8, 0.9], [-1.4, 9.0, -0.8], [0.8, 9.3, -1.5], [-0.9, 8.6, 1.3]] as const).forEach(([ex, ey, ez]) => {
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const gx = Math.round(ex * t / CS), gy = Math.round((6.2 + (ey - 6.2) * t) / CS), gz = Math.round(ez * t / CS);
      const key = gx + ":" + gy + ":" + gz;
      if (trunkSet.has(key)) continue;
      trunkSet.add(key);
      trunkCells.push([gx * CS, gy * CS, gz * CS]);
    }
  });
  const trunkGeo = new THREE.BoxGeometry(CS, CS, CS);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const trunk = new THREE.InstancedMesh(trunkGeo, trunkMat, trunkCells.length);
  trunkCells.forEach(([x, y, z], i) => {
    reg(trunk, i, x, y, z);
    const v = 0.85 + (rnd() - 0.5) * 0.2;
    C.setRGB(0.24 * v, 0.15 * v, 0.09 * v);
    trunk.setColorAt(i, C);
  });
  trunk.instanceColor!.needsUpdate = true;
  world.add(trunk);

  // ---- dark grass tufts: fill their module ----
  const grassBaseGeo = new THREE.BoxGeometry(MSZ * 0.88, 0.14, MSZ * 0.88);
  const grassBaseMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const grassBase = new THREE.InstancedMesh(grassBaseGeo, grassBaseMat, grassCells.length);
  const bladeDefs: [number, number, number, number, number][] = [];
  grassCells.forEach(([c, r], i) => {
    reg(grassBase, i, cx(c), 0.07, cz(r));
    C.set(rnd() < 0.5 ? 0x7EC15C : 0x5FA33E).multiplyScalar(0.85 + rnd() * 0.3);
    grassBase.setColorAt(i, C);
    const nb = 2 + ((rnd() * 2) | 0);
    for (let k = 0; k < nb; k++) bladeDefs.push([cx(c) + (rnd() - 0.5) * 0.26, 0.14, cz(r) + (rnd() - 0.5) * 0.26, 0.3 + rnd() * 0.26, (rnd() - 0.5) * 0.4]);
  });
  grassBase.instanceColor!.needsUpdate = true;
  world.add(grassBase);
  const bladeGeo = new THREE.BoxGeometry(0.055, 1, 0.055);
  bladeGeo.translate(0, 0.5, 0);
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const blades = new THREE.InstancedMesh(bladeGeo, bladeMat, bladeDefs.length);
  bladeDefs.forEach(([x, y, z, h], i) => {
    reg(blades, i, x, y, z).scaleY = h;
    C.set(rnd() < 0.5 ? 0x76C15C : 0x53A33E).multiplyScalar(0.85 + rnd() * 0.3);
    blades.setColorAt(i, C);
  });
  blades.instanceColor!.needsUpdate = true;
  world.add(blades);

  // ---- rocks: fill the corner modules ----
  const rockGeo = new THREE.BoxGeometry(MSZ * 0.84, 1, MSZ * 0.8);
  const rockMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCells.length);
  rockCells.forEach(([c, r], i) => {
    const h = 0.08 + rnd() * rnd() * 0.5;
    const v = reg(rocks, i, cx(c), h / 2, cz(r));
    v.scaleY = h;
    C.set(0x467CB9).multiplyScalar(0.8 + rnd() * 0.4);
    rocks.setColorAt(i, C);
  });
  rocks.instanceColor!.needsUpdate = true;
  world.add(rocks);

  // ---- leaves: live in the canopy, fall to their module when QR is requested ----
  const PALETTES: Record<string, number[]> = {
    autumn: [0xd9772b, 0xc94f2e, 0xe3a832, 0xa83c28, 0xe8c25a, 0xcf6425],
    gold: [0xE4C469, 0xD7B557, 0xC9A64B, 0xEFD58C, 0xB89A3E, 0xDCB44E],
    crimson: [0xC94F2E, 0xA83C28, 0x8E2F1F, 0xD96A4A, 0xB5472A, 0x9E3322],
    spring: [0x7FA35A, 0x5E8743, 0x9CBB6E, 0x4C7034, 0x86A952, 0x6B9447],
    cream: [0xF2EFE6, 0xDDD8C9, 0xC9C3B2, 0xE8E2D4, 0xBDB7A6, 0xD1CBBA],
    sakura: [0xF2A9C4, 0xE78BB0, 0xF8C3D6, 0xD9739F, 0xEE9CBB, 0xE283AC]
  };
  let paletteName = "autumn";
  let palette = PALETTES.autumn;

  const lumps = [
    [3.8, 9.6, 1.5, 2.6], [-3.6, 9.2, -1.2, 2.6], [1.2, 10.9, -3.2, 2.4],
    [-1.5, 10.6, 3.2, 2.4], [0, 11.6, 0, 2.6], [4.2, 8.4, -2.6, 2.2], [-4.4, 8.6, 2.2, 2.2]
  ];
  function canopyPoint(): [number, number, number] {
    let x, y, z;
    do { x = rnd() * 2 - 1; y = rnd() * 2 - 1; z = rnd() * 2 - 1; } while (x * x + y * y + z * z > 1);
    if (rnd() < 0.62) {
      const len = Math.sqrt(x * x + y * y + z * z) || 1;
      const sh = 0.55 + 0.45 * Math.pow(rnd(), 0.4);
      return [x / len * sh * 6.6, 9.0 + y / len * sh * 3.4, z / len * sh * 6.6];
    }
    const b = lumps[(rnd() * lumps.length) | 0];
    return [b[0] + x * b[3], b[1] + y * b[3] * 0.8, b[2] + z * b[3]];
  }
  const usedCells = new Set<string>();
  function snapFrom(sampler: () => [number, number, number]): [number, number, number] {
    for (let tries = 0; tries < 60; tries++) {
      const [x, y, z] = sampler();
      const gx = Math.round(x / 0.5) * 0.5, gy = Math.round(y / 0.5) * 0.5, gz = Math.round(z / 0.5) * 0.5;
      const key = gx + ":" + gy + ":" + gz;
      if (!usedCells.has(key)) { usedCells.add(key); return [gx, gy, gz]; }
    }
    const [x, y, z] = sampler();
    return [Math.round(x / 0.5) * 0.5, Math.round(y / 0.5) * 0.5, Math.round(z / 0.5) * 0.5];
  }
  const N_LEAF = Math.max(leafTargets.length * 3, 950);
  const leafGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const canopy = new THREE.InstancedMesh(leafGeo, leafMat, N_LEAF);
  const leafs: Leaf[] = [];
  const order = [...Array(N_LEAF).keys()];
  for (let i = order.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
  const stackN = new Array(leafTargets.length).fill(0);
  for (let i = 0; i < N_LEAF; i++) {
    const [px, py, pz] = snapFrom(canopyPoint);
    const ti = i < leafTargets.length ? i : (rnd() * leafTargets.length) | 0;
    const [tc, tr] = leafTargets[ti];
    const n = Math.min(stackN[ti]++, 5);
    leafs.push({
      cxp: px, cyp: py, czp: pz,
      tx: cx(tc), ty: 0.13 + n * 0.095, tz: cz(tr),
      q: 0, qDelay: order[i] * 0.0022 + rnd() * 0.25, dur: 0.8 + rnd() * 0.7,
      ph: rnd() * 6.28, rx: rnd() * 5 - 2.5, ry: rnd() * 5 - 2.5, yaw: 0
    });
    const v = reg(canopy, i, px, py, pz);
    v.isLeaf = leafs[i];
  }
  const leafVivid: THREE.Color[] = [], leafQR: THREE.Color[] = [];
  let leafColorsDirty = true;
  function paintLeaves() {
    let s2 = 97;
    const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
    leafVivid.length = 0; leafQR.length = 0;
    for (let i = 0; i < N_LEAF; i++) {
      const col = new THREE.Color(palette[(r2() * palette.length) | 0]);
      col.multiplyScalar(0.85 + r2() * 0.3);
      leafVivid.push(col);
      leafQR.push(vividToQR(col));
    }
    /* no direct instance writes: the per-frame color pass repaints each leaf
       from its current fall progress */
    leafColorsDirty = true;
  }
  paintLeaves();
  world.add(canopy);

  // ---- filler leaves: thicken the canopy and fade away when generating the QR ----
  const N_FILL = 680;
  const fillerMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const filler = new THREE.InstancedMesh(leafGeo, fillerMat, N_FILL);
  const fillPts: [number, number, number][] = [];
  function fillerPoint(): [number, number, number] {
    let x, y, z;
    do { x = rnd() * 2 - 1; y = rnd() * 2 - 1; z = rnd() * 2 - 1; } while (x * x + y * y + z * z > 1);
    if (rnd() < 0.7) return [x * 6.3, 9.0 + y * 3.2, z * 6.3];
    const b = lumps[(rnd() * lumps.length) | 0];
    return [b[0] + x * b[3] * 0.9, b[1] + y * b[3] * 0.7, b[2] + z * b[3] * 0.9];
  }
  for (let i = 0; i < N_FILL; i++) {
    const [px, py, pz] = snapFrom(fillerPoint);
    const v = reg(filler, i, px, py, pz);
    v.isFiller = { g: 1, delay: 0.15 + rnd() * 1.7 };
    fillPts.push([px, py, pz]);
  }
  function paintFiller() {
    let s4 = 41;
    const r4 = () => (s4 = (s4 * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < N_FILL; i++) {
      C.set(palette[(r4() * palette.length) | 0]).multiplyScalar(0.85 + r4() * 0.3);
      filler.setColorAt(i, C);
    }
    filler.instanceColor!.needsUpdate = true;
  }
  paintFiller();
  world.add(filler);

  // ---- pixelated tree shadow, cast by the sun ----
  const shCells = new Set<string>();
  const projectCell = (x: number, y: number, z: number) => {
    const gx = Math.round((x + y * SUN_DIR[0]) / MSZ), gz = Math.round((z + y * SUN_DIR[1]) / MSZ);
    if (Math.abs(gx * MSZ) < SOIL / 2 - 0.4 && Math.abs(gz * MSZ) < SOIL / 2 - 0.4) shCells.add(gx + ":" + gz);
  };
  leafs.forEach(l => projectCell(l.cxp, l.cyp, l.czp));
  fillPts.forEach(([x, y, z]) => projectCell(x, y, z));
  trunkCells.forEach(([x, y, z]) => projectCell(x, y, z));
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x26261F, transparent: true, opacity: 0.16, depthWrite: false });
  const shKeys = [...shCells];
  const treeShadow = new THREE.InstancedMesh(new THREE.BoxGeometry(MSZ * 0.96, 0.02, MSZ * 0.96), shadowMat, shKeys.length);
  shKeys.forEach((key, i) => {
    const [gx, gz] = key.split(":").map(Number);
    M.makeTranslation(gx * MSZ, 0.03, gz * MSZ);
    treeShadow.setMatrixAt(i, M);
  });
  treeShadow.renderOrder = 5;
  world.add(treeShadow);

  // ---- ambient leaves: spawn in the canopy and flutter down ----
  const NFALL = 45;
  const fallGeo = new THREE.BoxGeometry(0.3, 0.09, 0.3);
  const fallMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
  const falling = new THREE.InstancedMesh(fallGeo, fallMat, NFALL);
  interface Faller { ph: number; rx: number; ry: number; x: number; y: number; z: number; sp: number }
  const fallers: Faller[] = [];
  function respawnFaller(l: Faller) {
    const [px, py, pz] = canopyPoint();
    l.x = px; l.y = py - 0.2; l.z = pz;
    l.sp = 0.8 + rnd() * 0.9;
  }
  for (let i = 0; i < NFALL; i++) {
    const l: Faller = { ph: rnd() * 6.28, rx: rnd() * 4 - 2, ry: rnd() * 4 - 2, x: 0, y: 0, z: 0, sp: 0 };
    respawnFaller(l);
    l.y -= rnd() * 4;
    fallers.push(l);
    C.set(palette[(rnd() * palette.length) | 0]);
    falling.setColorAt(i, C);
  }
  falling.instanceColor!.needsUpdate = true;
  world.add(falling);

  // ---- fireflies ----
  const NFIRE = 9;
  const fireflies = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xffe28a }), NFIRE);
  const flies: { cx: number; cy: number; cz: number; ph: number; w: number }[] = [];
  for (let i = 0; i < NFIRE; i++) flies.push({ cx: (rnd() - 0.5) * 12, cy: 1.2 + rnd() * 5.5, cz: (rnd() - 0.5) * 10, ph: rnd() * 6.28, w: 0.25 + rnd() * 0.5 });
  world.add(fireflies);

  const total = voxels.length;

  let mode: Mode = "scene";
  let stateT = 10;
  let topFlown = true;
  const HINTS = {
    scene: "fallen leaves, dark grass and rocks all live on dark squares — press Show QR to complete the code",
    qrDrop: "the tree releases its leaves — each one falls onto a dark module of the code…",
    qrTop: "TOP VIEW — the floor fades to white; leaves, grass and rocks draw the QR · scan it",
    cloud: "the scene dissolves — every block drifts free · pick a view to rebuild it"
  };
  function setMode(m: Mode) {
    mode = m;
    stateT = 0;
    voxels.forEach(v => { v.delay = rnd() * 0.9; });
    api.syncSegs(m);
    if (m === "scene") { api.fly(64, 35, 34); topFlown = true; api.setHint(HINTS.scene); }
    if (m === "cloud") { api.fly(64, 22, 36); topFlown = true; api.setHint(HINTS.cloud); }
    if (m === "qr") {
      const TAU = Math.PI * 2;
      const norm = (a: number) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
      world.rotation.set(norm(world.rotation.x), norm(world.rotation.y), norm(world.rotation.z));
      topFlown = false;
      api.setHint(HINTS.qrDrop);
    }
  }

  const axes = { x: false, y: true, z: false };
  let speed = 0.6;

  let simT = 0;
  function step(dt: number) {
    simT += dt; stateT += dt;
    const kTarget = mode === "cloud" ? 0 : 1;
    const qTarget = mode === "qr" ? 1 : 0;

    let qSum = 0, colorPass = leafColorsDirty;
    for (let i = 0; i < total; i++) {
      const v = voxels[i];
      if (stateT > v.delay) v.k += (kTarget - v.k) * Math.min(1, dt * 2.6);
      const k = smooth(Math.max(0, Math.min(1, v.k)));
      let hx = v.hx, hy = v.hy, hz = v.hz, exRot = 0, flat = 0;

      if (v.isLeaf) {
        const l = v.isLeaf;
        if (stateT > l.qDelay) l.q += (qTarget - l.q) * Math.min(1, dt / l.dur * 2.2);
        const q = smooth(Math.max(0, Math.min(1, l.q)));
        qSum += l.q;
        const wob = q * (1 - q);
        hx = l.cxp + (l.tx - l.cxp) * q + Math.sin(q * 7 + l.ph) * 0.5 * wob;
        hy = l.cyp + (l.ty - l.cyp) * q;
        hz = l.czp + (l.tz - l.czp) * q + Math.cos(q * 6 + l.ph) * 0.4 * wob;
        exRot = q * (1 - q);
        flat = q;
        if (colorPass || Math.abs(l.q - (l.cPainted || 0)) > 0.02) {
          C2.copy(leafVivid[v.i]).lerp(leafQR[v.i], q);
          canopy.setColorAt(v.i, C2);
          l.cPainted = l.q;
          colorPass = true;
        }
      }

      const bobAmt = (1 - k);
      V.set(
        v.sx + (hx - v.sx) * k + Math.sin(simT * v.sp + v.ph) * 0.18 * bobAmt,
        v.sy + (hy - v.sy) * k + Math.cos(simT * v.sp * 0.8 + v.ph) * 0.22 * bobAmt,
        v.sz + (hz - v.sz) * k
      );
      const spin = v.rot * (1 - k) + (v.isLeaf ? (v.isLeaf.rx * exRot * 2) : 0);
      E.set(v.ex + spin * 0.6, v.ey + spin + (v.isLeaf ? v.isLeaf.yaw * flat : 0), v.ez + spin * 0.3);
      Qt.setFromEuler(E);
      if (v.scaleY !== undefined) SC.set(1, v.scaleY + (1 - k) * 0.2, 1);
      else if (v.isLeaf) SC.set(1 - flat * 0.08, 1 - flat * 0.82, 1 - flat * 0.08);
      else if (v.isFiller) {
        const f = v.isFiller;
        const gT = mode === "qr" ? 0 : 1;
        if (stateT > f.delay) f.g += (gT - f.g) * Math.min(1, dt * 1.7);
        SC.setScalar(Math.max(0.0001, smooth(f.g)));
      }
      else SC.set(1, 1, 1);
      M.compose(V, Qt, SC);
      v.mesh.setMatrixAt(v.i, M);
    }
    trunk.instanceMatrix.needsUpdate = true;
    canopy.instanceMatrix.needsUpdate = true;
    filler.instanceMatrix.needsUpdate = true;
    grassBase.instanceMatrix.needsUpdate = true;
    blades.instanceMatrix.needsUpdate = true;
    rocks.instanceMatrix.needsUpdate = true;
    if (colorPass) { canopy.instanceColor!.needsUpdate = true; leafColorsDirty = false; }

    if (mode === "qr" && !topFlown && qSum / N_LEAF > 0.82) {
      topFlown = true;
      api.fly(0.5, 0, 30);
      api.setHint(HINTS.qrTop);
    }

    const soilTarget = mode !== "cloud" ? 1 : 0;
    soilMat.opacity += (soilTarget - soilMat.opacity) * Math.min(1, dt * 3);
    rimMat.opacity = soilMat.opacity;
    soil.visible = soilRim.visible = soilMat.opacity > 0.02;

    /* overhead whitening (emissive ramp → exact background white) */
    CV.copy(api.camera.position).sub(api.target);
    const polarDeg = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(CV.y / CV.length(), -1, 1)));
    const whiteTarget = THREE.MathUtils.clamp((38 - polarDeg) / 18, 0, 1);
    whiteT += (whiteTarget - whiteT) * Math.min(1, dt * 3);
    soilMat.color.copy(soilBase).multiplyScalar(1 - whiteT);
    soilMat.emissive.copy(WHITE).multiplyScalar(whiteT);
    rimMat.color.copy(rimBase).multiplyScalar(1 - whiteT);
    rimMat.emissive.copy(WHITE).multiplyScalar(whiteT);

    const shTarget = mode === "cloud" ? 0 : (1 - qSum / N_LEAF) * 0.15;
    shadowMat.opacity += (shTarget - shadowMat.opacity) * Math.min(1, dt * 2.5);
    treeShadow.visible = shadowMat.opacity > 0.012;

    const fallTarget = mode === "scene" ? 1 : 0;
    fallMat.opacity += (fallTarget - fallMat.opacity) * Math.min(1, dt * 3);
    falling.visible = fallMat.opacity > 0.02;
    if (falling.visible) {
      fallers.forEach((l, i) => {
        l.y -= l.sp * dt;
        l.x += Math.sin(simT * 1.6 + l.ph) * dt * 0.6;
        l.z += Math.cos(simT * 1.3 + l.ph) * dt * 0.45;
        if (l.y < 0.2) respawnFaller(l);
        V.set(l.x, l.y, l.z);
        E.set(simT * l.rx + l.ph, simT * l.ry, 0);
        Qt.setFromEuler(E);
        M.compose(V, Qt, SC.set(1, 1, 1));
        falling.setMatrixAt(i, M);
      });
      falling.instanceMatrix.needsUpdate = true;
    }

    fireflies.visible = mode === "scene";
    if (fireflies.visible) {
      flies.forEach((f, i) => {
        const a = simT * f.w + f.ph;
        const pulse = Math.max(0.12, 0.55 + 0.5 * Math.sin(simT * 2.3 + f.ph * 3));
        V.set(f.cx + Math.sin(a) * 1.6, f.cy + Math.sin(a * 1.7) * 0.9, f.cz + Math.cos(a * 1.3) * 1.6);
        Qt.setFromEuler(E.set(0, a, 0));
        M.compose(V, Qt, SC.set(pulse, pulse, pulse));
        fireflies.setMatrixAt(i, M);
      });
      fireflies.instanceMatrix.needsUpdate = true;
    }

    if (mode === "qr") {
      world.rotation.x += (0 - world.rotation.x) * Math.min(1, dt * 3);
      world.rotation.y += (0 - world.rotation.y) * Math.min(1, dt * 3);
      world.rotation.z += (0 - world.rotation.z) * Math.min(1, dt * 3);
    } else {
      if (axes.x) world.rotation.x += dt * speed * 0.18;
      if (axes.y) world.rotation.y += dt * speed * 0.3;
      if (axes.z) world.rotation.z += dt * speed * 0.18;
    }
  }

  return {
    id: "arbol",
    label: "Tree",
    svg: '<path d="M8 19a4 4 0 0 1-2.24-7.32A3.5 3.5 0 0 1 9 6.03V6a3 3 0 1 1 6 0v.04a3.5 3.5 0 0 1 3.24 5.65A4 4 0 0 1 16 19Z"/><path d="M12 19v3"/>',
    rig,
    target: new THREE.Vector3(0, 4.8, 0),
    minDistance: 9,
    maxDistance: 64,
    sceneView: [64, 35, 34],
    sceneLabel: total + " VOXELS · " + leafTargets.length + " MODULES WAIT FOR LEAVES · " + grassCells.length + " GRASS · " + rockCells.length + " ROCKS",
    viewNote: "Show QR first drops every leaf onto the code's dark squares, then flies the camera overhead",
    floorsTitle: "FLOOR",
    floors: [
      { key: "cement", label: "Cement", chip: 0xD2D2CC },
      { key: "grass", label: "Grass", chip: 0xBCCF9C },
      { key: "dirt", label: "Dirt", chip: 0xD8C7A4 }
    ],
    floorNote: "dark grass and rocks are always part of the code — fallen leaves complete it over the light floor",
    swatchTitle: "SEASON PALETTE",
    swatches: Object.entries(PALETTES).map(([name, cols]) => ({ name, chip: cols[0] })),
    shuffleLabel: "Shuffle season",

    getMode: () => mode,
    getFloor: () => floorKey,
    getSwatch: () => paletteName,
    getAxes: () => axes,
    getSpeed: () => speed,

    setMode,
    setFloor(key) {
      floorKey = key;
      soilBase.set(FLOORS[key]);
      rimBase.set(FLOORS[key]).multiplyScalar(0.84);
    },
    setSwatch(name) {
      paletteName = name;
      palette = PALETTES[name];
      paintLeaves();
      paintFiller();
      let s3 = 55;
      const r3 = () => (s3 = (s3 * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < NFALL; i++) { C.set(palette[(r3() * palette.length) | 0]); falling.setColorAt(i, C); }
      falling.instanceColor!.needsUpdate = true;
    },
    setAxis(ax, on) { axes[ax] = on; },
    setSpeed(v) { speed = v; },
    shuffle() {
      seed = ((Math.random() * 2147483646) | 0) + 1;
      for (let i = 0; i < N_LEAF; i++) {
        leafVivid[i].set(palette[(rnd() * palette.length) | 0]).multiplyScalar(0.8 + rnd() * 0.34);
        leafQR[i] = vividToQR(leafVivid[i]);
      }
      for (let i = 0; i < N_FILL; i++) {
        C.set(palette[(rnd() * palette.length) | 0]).multiplyScalar(0.85 + rnd() * 0.3);
        filler.setColorAt(i, C);
      }
      filler.instanceColor!.needsUpdate = true;
      leafColorsDirty = true;
    },
    dblclick() {},
    step,
    state: () => ({ mode, total, leaves: N_LEAF, targets: leafTargets.length,
      qAvg: +(leafs.reduce((a, l) => a + l.q, 0) / N_LEAF).toFixed(3), topFlown })
  };
}
