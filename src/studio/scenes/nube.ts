import * as THREE from "three";
import type { EngineApi, Mode, StudioScene } from "../types.ts";

/* Rain Cloud — ported verbatim from public/3d/nube3d-v3.html (legacy page).
   The seed and every rnd() call keep their original order so the generated
   layout is identical to the standalone page. */

const QR = [
"QQQQQQQ...Q.Q..QQ.QQQQQQQ",
"Q.....Q.Q...QQQ.Q.Q.....Q",
"Q.QQQ.Q.QQQ..Q.Q..Q.QQQ.Q",
"Q.QQQ.Q.Q.Q.....Q.Q.QQQ.Q",
"Q.QQQ.Q...Q.Q..QQ.Q.QQQ.Q",
"Q.....Q..QQ.Q..Q..Q.....Q",
"QQQQQQQ.Q.Q.Q.Q.Q.QQQQQQQ",
"........Q.....QQQ........",
"Q.....Q.Q..Q.....QQ..QQQ.",
".....Q.Q..QQQQ..Q..QQQQQ.",
".Q..QQQ..QQQQQQQ.QQ..Q.QQ",
"..QQ.Q.QQQ.Q.Q.QQQQ..Q..Q",
"Q.Q.QQQ.QQ.QQQ.Q..Q.....Q",
"QQQQQ..QQ.Q....QQ..Q...Q.",
"Q.....Q.Q..QQ..QQQ.QQQ.QQ",
"Q.QQ....QQ.Q.......Q.QQ.Q",
"Q.Q.QQQ.Q..Q...QQQQQQ.Q..",
"........Q...QQQ.Q...Q....",
"QQQQQQQ...QQ....Q.Q.Q...Q",
"Q.....Q..Q..QQ.QQ...Q..Q.",
"Q.QQQ.Q..QQ.Q.QQQQQQQ.QQ.",
"Q.QQQ.Q..Q....Q.Q.Q.....Q",
"Q.QQQ.Q..Q.QQ........QQ.Q",
"Q.....Q...QQ..Q.QQ.QQ...Q",
"QQQQQQQ.QQQ..QQ.QQ...Q..Q"];

interface Drop {
  sx: number; sy: number; sz: number;
  tx: number; ty: number; tz: number;
  q: number; fade: number; qDelay: number; dur: number;
  ph: number; yaw: number;
  cPainted?: number;
}
interface Vox {
  mesh: THREE.InstancedMesh; i: number;
  hx: number; hy: number; hz: number;
  ex: number; ey: number; ez: number;
  sx: number; sy: number; sz: number;
  rot: number; ph: number; sp: number; delay: number; k: number;
  scaleY?: number; scaleXZ?: number;
  isCloud?: boolean; isDrop?: Drop;
}

export function create(api: EngineApi): StudioScene {
  const N = 25, MSZ = 0.5;
  const cx = (c: number) => (c - 12) * MSZ, cz = (r: number) => (r - 12) * MSZ;
  const inFinder = (c: number, r: number) => (c < 8 && r < 8) || (c > 16 && r < 8) || (c < 8 && r > 16);

  let seed = 59;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const smooth = (p: number) => p * p * (3 - 2 * p);

  const rig = new THREE.Group();
  rig.add(new THREE.HemisphereLight(0xf2f4f8, 0x7e7e76, 1.25));
  const sun = new THREE.DirectionalLight(0xf4f2e8, 0.95);
  sun.position.set(-5.1, 16, -3.2);
  rig.add(sun);

  const world = new THREE.Group();
  rig.add(world);

  const M = new THREE.Matrix4(), C = new THREE.Color(), C2 = new THREE.Color();
  const V = new THREE.Vector3(), SC = new THREE.Vector3(1, 1, 1);
  const Qt = new THREE.Quaternion(), E = new THREE.Euler();

  const voxels: Vox[] = [];
  function reg(mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, baseE?: THREE.Euler): Vox {
    const a = rnd() * Math.PI * 2, rr = 7 + rnd() * 7;
    const v: Vox = { mesh, i, hx: x, hy: y, hz: z, ex: baseE ? baseE.x : 0, ey: baseE ? baseE.y : 0, ez: baseE ? baseE.z : 0,
      sx: Math.cos(a) * rr, sy: 2.5 + rnd() * 8, sz: Math.sin(a) * rr,
      rot: (rnd() - 0.5) * 5, ph: rnd() * 6.28, sp: 0.5 + rnd() * 0.7, delay: rnd() * 0.9, k: 1 };
    voxels.push(v);
    return v;
  }

  // ---- classification: permanent damp / grass / rocks vs fresh rain ----
  const stainCells: [number, number][] = [], grassCells: [number, number][] = [],
    rockCells: [number, number][] = [], rainTargets: [number, number][] = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (QR[r][c] !== "Q") continue;
    const keep = inFinder(c, r) ? rnd() < 0.62 : rnd() < 0.22;
    if (!keep) { rainTargets.push([c, r]); continue; }
    const t = rnd();
    if (t < 0.55) stainCells.push([c, r]);
    else if (t < 0.8) grassCells.push([c, r]);
    else rockCells.push([c, r]);
  }

  // ---- floor: thick slab, just wider than the QR ----
  const SOIL = 16;
  const FLOORS: Record<string, { dry: number; wet: number }> = {
    cement: { dry: 0xCFCFCA, wet: 0x467CB9 },
    brick: { dry: 0xD2A188, wet: 0xC1715C },
    grass: { dry: 0xBCCF9C, wet: 0x68A33E }
  };
  let floorKey = "cement";
  const soilMat = new THREE.MeshLambertMaterial({ color: FLOORS.cement.dry, transparent: true, opacity: 1 });
  const soil = new THREE.Mesh(new THREE.BoxGeometry(SOIL, 0.85, SOIL), soilMat);
  soil.position.y = -0.425;
  world.add(soil);
  const lipMat = new THREE.MeshLambertMaterial({ color: 0xADADA6, transparent: true, opacity: 1 });
  const lip = new THREE.Mesh(new THREE.BoxGeometry(SOIL + 0.7, 0.32, SOIL + 0.7), lipMat);
  lip.position.y = -1.0;
  world.add(lip);

  /* the floor fades to paper white whenever the camera looks down at the code */
  const WHITE = new THREE.Color(0xFFFFFF);
  const soilBase = new THREE.Color(FLOORS.cement.dry);
  const lipBase = new THREE.Color(0xADADA6);
  let whiteT = 0;
  const CV = new THREE.Vector3();

  // ---- permanent damp patches: varied sizes ----
  const stainGeo = new THREE.BoxGeometry(MSZ * 0.94, 1, MSZ * 0.94);
  stainGeo.translate(0, 0.5, 0);
  const stainMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const stains = new THREE.InstancedMesh(stainGeo, stainMat, stainCells.length);
  const stainVar: number[] = [];
  stainCells.forEach(([c, r], i) => {
    const v = reg(stains, i, cx(c) + (rnd() - 0.5) * 0.04, 0.005, cz(r) + (rnd() - 0.5) * 0.04, E.set(0, (rnd() - 0.5) * 0.3, 0).clone());
    v.scaleY = 0.025 + rnd() * 0.05;
    v.scaleXZ = 0.84 + rnd() * 0.2;
    stainVar.push(0.85 + rnd() * 0.3);
  });
  function paintStains() {
    for (let i = 0; i < stainCells.length; i++) {
      C.set(FLOORS[floorKey].wet).multiplyScalar(stainVar[i]);
      stains.setColorAt(i, C);
    }
    stains.instanceColor!.needsUpdate = true;
  }
  paintStains();
  world.add(stains);

  // ---- dark grass ----
  const grassBaseGeo = new THREE.BoxGeometry(MSZ * 0.88, 0.14, MSZ * 0.88);
  const grassBase = new THREE.InstancedMesh(grassBaseGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), grassCells.length);
  const bladeDefs: [number, number, number, number, number][] = [];
  grassCells.forEach(([c, r], i) => {
    reg(grassBase, i, cx(c), 0.07, cz(r));
    C.set(rnd() < 0.5 ? 0x7EC15C : 0x5FA33E).multiplyScalar(0.85 + rnd() * 0.3);
    grassBase.setColorAt(i, C);
    const nb = 2 + ((rnd() * 2) | 0);
    for (let k = 0; k < nb; k++) bladeDefs.push([cx(c) + (rnd() - 0.5) * 0.24, 0.14, cz(r) + (rnd() - 0.5) * 0.24, 0.26 + rnd() * 0.24, (rnd() - 0.5) * 0.4]);
  });
  grassBase.instanceColor!.needsUpdate = true;
  world.add(grassBase);
  const bladeGeo = new THREE.BoxGeometry(0.055, 1, 0.055);
  bladeGeo.translate(0, 0.5, 0);
  const blades = new THREE.InstancedMesh(bladeGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), bladeDefs.length);
  bladeDefs.forEach(([x, y, z, h, tilt], i) => {
    reg(blades, i, x, y, z, E.set(tilt, rnd() * Math.PI, tilt * 0.6).clone()).scaleY = h;
    C.set(rnd() < 0.5 ? 0x76C15C : 0x53A33E).multiplyScalar(0.85 + rnd() * 0.3);
    blades.setColorAt(i, C);
  });
  blades.instanceColor!.needsUpdate = true;
  world.add(blades);

  // ---- rocks of different sizes ----
  const rockGeo = new THREE.BoxGeometry(MSZ * 0.84, 1, MSZ * 0.8);
  const rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), rockCells.length);
  rockCells.forEach(([c, r], i) => {
    const v = reg(rocks, i, cx(c) + (rnd() - 0.5) * 0.05, 0.005, cz(r) + (rnd() - 0.5) * 0.05, E.set(0, (rnd() - 0.5) * 0.2, (rnd() - 0.5) * 0.1).clone());
    v.scaleY = 0.1 + rnd() * rnd() * 0.42;
    v.scaleXZ = 0.86 + rnd() * 0.18;
    C.set(0x467CB9).multiplyScalar(0.8 + rnd() * 0.4);
    rocks.setColorAt(i, C);
  });
  rocks.instanceColor!.needsUpdate = true;
  world.add(rocks);
  rockGeo.translate(0, 0.5, 0);

  // ---- voxel cloud ----
  const CLOUDS: Record<string, number[]> = {
    storm: [0xDADDE0, 0xC4C9CE, 0xAEB4BB, 0x9BA2AB, 0x8C939C],
    white: [0xFFFFFF, 0xF2F4F6, 0xE4E8EC, 0xD8DDE2, 0xECEFF2],
    sunset: [0xF2C4A0, 0xE8A87C, 0xDE8E66, 0xF4D4B8, 0xD2795A],
    night: [0x5A6478, 0x49536A, 0x6A7488, 0x3E4858, 0x7A8498],
    gold: [0xEFD58C, 0xE4C469, 0xD7B557, 0xF4E2AC, 0xC9A64B],
    lilac: [0xC8BEDC, 0xB4A8CE, 0xD8D0E8, 0xA094BE, 0xE4DEF0]
  };
  let cloudName = "storm";
  let cloudTones = CLOUDS.storm;
  const lumps = [
    [0, 8.5, 0, 3.4], [-3.7, 8.1, 1.2, 2.7], [3.6, 8.3, -0.9, 2.8],
    [1.5, 9.5, 2.1, 2.4], [-2.1, 9.5, -2.2, 2.3], [2.8, 7.9, 3.1, 2.3],
    [-3.3, 8.7, -3.2, 2.3], [-1.1, 8.0, 3.6, 2.3], [3.6, 8.8, 3.2, 2.1],
    [-4.5, 8.4, 2.6, 2.1], [4.4, 8.2, 1.8, 2.1], [-2.6, 7.9, -4.2, 2.1], [1.8, 8.6, -3.9, 2.2]
  ];
  const N_CLOUD = 880;
  const cloudGeo = new THREE.BoxGeometry(0.44, 0.44, 0.44);
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
  const cloud = new THREE.InstancedMesh(cloudGeo, cloudMat, N_CLOUD);
  const cloudPts: [number, number, number][] = [];
  for (let i = 0; i < N_CLOUD; i++) {
    let x, y, z;
    do { x = rnd() * 2 - 1; y = rnd() * 2 - 1; z = rnd() * 2 - 1; } while (x * x + y * y + z * z > 1);
    const b = lumps[(rnd() * lumps.length) | 0];
    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    const sh = 0.5 + 0.5 * Math.pow(rnd(), 0.45);
    const px = b[0] + x / len * sh * b[3], py = b[1] + y / len * sh * b[3] * 0.72, pz = b[2] + z / len * sh * b[3];
    const v = reg(cloud, i, px, py, pz, E.set((rnd() - 0.5) * 0.3, rnd() * Math.PI, (rnd() - 0.5) * 0.3).clone());
    v.isCloud = true;
    cloudPts.push([px, py, pz]);
  }
  function paintCloud() {
    let s2 = 33;
    const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < N_CLOUD; i++) {
      C.set(cloudTones[(r2() * cloudTones.length) | 0]).multiplyScalar(0.9 + r2() * 0.18);
      cloud.setColorAt(i, C);
    }
    cloud.instanceColor!.needsUpdate = true;
  }
  paintCloud();
  world.add(cloud);

  // ---- pixelated cloud shadow ----
  const shCells = new Set<string>();
  cloudPts.forEach(([x, , z]) => {
    const gx = Math.round((x + 0.5) / MSZ), gz = Math.round((z + 0.35) / MSZ);
    if (Math.abs(gx * MSZ) < SOIL / 2 - 0.4 && Math.abs(gz * MSZ) < SOIL / 2 - 0.4) shCells.add(gx + ":" + gz);
  });
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x33332E, transparent: true, opacity: 0.13, depthWrite: false });
  const shKeys = [...shCells];
  const cloudShadow = new THREE.InstancedMesh(new THREE.BoxGeometry(MSZ * 0.96, 0.02, MSZ * 0.96), shadowMat, shKeys.length);
  shKeys.forEach((key, i) => {
    const [gx, gz] = key.split(":").map(Number);
    M.makeTranslation(gx * MSZ, 0.1, gz * MSZ);
    cloudShadow.setMatrixAt(i, M);
  });
  cloudShadow.renderOrder = 5;
  world.add(cloudShadow);

  // ---- drops: rain onto the modules and leave them wet ----
  const N_DROP = Math.round(rainTargets.length * 1.25);
  const dropOrder = [...Array(N_DROP).keys()];
  for (let i = dropOrder.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [dropOrder[i], dropOrder[j]] = [dropOrder[j], dropOrder[i]]; }
  const dropStack = new Array(rainTargets.length).fill(0);
  const dropGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const dropMesh = new THREE.InstancedMesh(dropGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), N_DROP);
  const drops: Drop[] = [];
  const dropVar: number[] = [];
  for (let i = 0; i < N_DROP; i++) {
    const ti = i < rainTargets.length ? i : (rnd() * rainTargets.length) | 0;
    const [tc, tr] = rainTargets[ti];
    const n = Math.min(dropStack[ti]++, 2);
    const txv = cx(tc) + (rnd() - 0.5) * 0.03, tzv = cz(tr) + (rnd() - 0.5) * 0.03;
    let best = cloudPts[0], bd = 1e9;
    for (let t = 0; t < 60; t++) {
      const p = cloudPts[(rnd() * cloudPts.length) | 0];
      const d = (p[0] - txv) * (p[0] - txv) + (p[2] - tzv) * (p[2] - tzv) + (p[1] - 7.4) * (p[1] - 7.4) * 0.3;
      if (d < bd) { bd = d; best = p; }
    }
    drops.push({
      sx: best[0] + (rnd() - 0.5) * 0.15,
      sy: best[1] - 0.15,
      sz: best[2] + (rnd() - 0.5) * 0.15,
      tx: txv, ty: 0.03 + n * 0.012, tz: tzv,
      q: 0, fade: 1, qDelay: dropOrder[i] * 0.004 + rnd() * 0.3, dur: 0.55 + rnd() * 0.5,
      ph: rnd() * 6.28, yaw: (rnd() - 0.5) * 0.4
    });
    const v = reg(dropMesh, i, drops[i].sx, drops[i].sy, drops[i].sz);
    v.isDrop = drops[i];
    dropVar.push(0.88 + rnd() * 0.24);
  }
  const dropBlue = new THREE.Color(0x9FC2DC);
  const dropDarks: THREE.Color[] = [];
  function paintDropTargets() {
    dropDarks.length = 0;
    for (let i = 0; i < N_DROP; i++) dropDarks.push(new THREE.Color(FLOORS[floorKey].wet).multiplyScalar(dropVar[i]));
    drops.forEach(l => { l.cPainted = -1; });
  }
  paintDropTargets();
  for (let i = 0; i < N_DROP; i++) dropMesh.setColorAt(i, dropBlue);
  dropMesh.instanceColor!.needsUpdate = true;
  world.add(dropMesh);

  // ---- ambient rain ----
  const NRAIN = 70;
  const rainMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
  const rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.5, 0.07), rainMat, NRAIN);
  const rains: { x: number; y: number; z: number; sp: number }[] = [];
  const rainSpawn = (l: { x: number; y: number; z: number; sp: number }) => {
    const p = cloudPts[(rnd() * cloudPts.length) | 0];
    l.x = p[0]; l.y = p[1] - 0.4; l.z = p[2]; l.sp = 7 + rnd() * 4;
  };
  for (let i = 0; i < NRAIN; i++) {
    const l = { x: 0, y: 0, z: 0, sp: 0 };
    rainSpawn(l);
    l.y = rnd() * l.y;
    rains.push(l);
    C.set(0x9FC2DC).multiplyScalar(0.85 + rnd() * 0.3);
    rain.setColorAt(i, C);
  }
  rain.instanceColor!.needsUpdate = true;
  world.add(rain);

  const total = voxels.length;

  let mode: Mode = "scene";
  let stateT = 10;
  let topFlown = true;
  const HINTS = {
    scene: "the damp patches, the grass and the rocks are already part of the code — Show QR: the cloud waters the rest",
    qrDrop: "it rains — each drop wets a dark module of the code…",
    qrTop: "TOP VIEW — the floor fades to white, the wet modules draw the QR · scan it",
    cloud: "the scene dissolves — every block drifts free · pick a view to rebuild it"
  };
  function setMode(m: Mode) {
    mode = m;
    stateT = 0;
    voxels.forEach(v => { v.delay = rnd() * 0.9; });
    api.syncSegs(m);
    if (m === "scene") { api.fly(64, 32, 28); topFlown = true; api.setHint(HINTS.scene); }
    if (m === "cloud") { api.fly(64, 20, 30); topFlown = true; api.setHint(HINTS.cloud); }
    if (m === "qr") {
      const TAU = Math.PI * 2;
      const norm = (a: number) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
      world.rotation.set(norm(world.rotation.x), norm(world.rotation.y), norm(world.rotation.z));
      topFlown = false;
      drops.forEach(l => { l.q = 0; l.fade = 1; });
      api.setHint(HINTS.qrDrop);
    }
  }

  const axes = { x: false, y: true, z: false };
  let speed = 0.6;

  let dropColorsDirty = true;
  let simT = 0;
  function step(dt: number) {
    simT += dt; stateT += dt;
    const kTarget = mode === "cloud" ? 0 : 1;

    let qSum = 0;
    for (let i = 0; i < total; i++) {
      const v = voxels[i];
      if (stateT > v.delay) v.k += (kTarget - v.k) * Math.min(1, dt * 2.6);
      const k = smooth(Math.max(0, Math.min(1, v.k)));
      let hx = v.hx, hy = v.hy, hz = v.hz;

      if (v.isCloud) {
        hy += Math.sin(simT * 0.7 + v.ph) * 0.14;
        hx += Math.sin(simT * 0.4 + v.ph) * 0.08;
      }

      if (v.isDrop) {
        const l = v.isDrop;
        if (mode === "qr") {
          if (stateT > l.qDelay) l.q += (1 - l.q) * Math.min(1, dt / l.dur * 2.2);
        } else if (l.q > 0.001) {
          l.fade = Math.max(0, l.fade - dt * 1.4);
          if (l.fade === 0) l.q = 0;
        }
        const q = smooth(Math.max(0, Math.min(1, l.q)));
        qSum += l.q;
        const e = q * q;
        hx = l.sx + (l.tx - l.sx) * q;
        hy = l.sy + (l.ty - l.sy) * e;
        hz = l.sz + (l.tz - l.sz) * q;
        const settle = smooth(Math.max(0, (l.q - 0.78) / 0.22));
        let scl = Math.min(1, l.q * 9) * (mode === "qr" ? 1 : l.fade);
        if (l.q < 0.001) scl = 0;
        SC.set(scl * (0.5 + settle * 1.95), scl * (1.5 - settle * 1.36), scl * (0.5 + settle * 1.95));
        if (l.cPainted === undefined || Math.abs(settle - (l.cPainted || 0)) > 0.04) {
          C2.copy(dropBlue).lerp(dropDarks[v.i], settle);
          dropMesh.setColorAt(v.i, C2);
          l.cPainted = settle;
          dropColorsDirty = true;
        }
        const bobA = (1 - k);
        V.set(
          v.sx + (hx - v.sx) * k + Math.sin(simT * v.sp + v.ph) * 0.18 * bobA,
          v.sy + (hy - v.sy) * k + Math.cos(simT * v.sp * 0.8 + v.ph) * 0.22 * bobA,
          v.sz + (hz - v.sz) * k
        );
        E.set(0, l.yaw * settle, 0);
        Qt.setFromEuler(E);
        M.compose(V, Qt, SC);
        v.mesh.setMatrixAt(v.i, M);
        continue;
      }

      const bobAmt = (1 - k);
      V.set(
        v.sx + (hx - v.sx) * k + Math.sin(simT * v.sp + v.ph) * 0.18 * bobAmt,
        v.sy + (hy - v.sy) * k + Math.cos(simT * v.sp * 0.8 + v.ph) * 0.22 * bobAmt,
        v.sz + (hz - v.sz) * k
      );
      const spin = v.rot * (1 - k);
      E.set(v.ex + spin * 0.6, v.ey + spin, v.ez + spin * 0.3);
      Qt.setFromEuler(E);
      if (v.scaleY !== undefined) SC.set(v.scaleXZ || 1, v.scaleY + (1 - k) * 0.2, v.scaleXZ || 1);
      else SC.set(1, 1, 1);
      M.compose(V, Qt, SC);
      v.mesh.setMatrixAt(v.i, M);
    }
    stains.instanceMatrix.needsUpdate = true;
    grassBase.instanceMatrix.needsUpdate = true;
    blades.instanceMatrix.needsUpdate = true;
    rocks.instanceMatrix.needsUpdate = true;
    cloud.instanceMatrix.needsUpdate = true;
    dropMesh.instanceMatrix.needsUpdate = true;
    if (dropColorsDirty) { dropMesh.instanceColor!.needsUpdate = true; dropColorsDirty = false; }

    // the cloud fades out in the overhead view
    const cloudFade = (mode === "qr" && topFlown) ? 0 : 1;
    cloudMat.opacity += (cloudFade - cloudMat.opacity) * Math.min(1, dt * 3);
    cloud.visible = cloudMat.opacity > 0.02;

    // cloud shadow: fades with the rain and with the cloud
    const shTarget = mode === "cloud" ? 0 : (1 - qSum / N_DROP) * 0.13 * cloudMat.opacity;
    shadowMat.opacity += (shTarget - shadowMat.opacity) * Math.min(1, dt * 3);
    cloudShadow.visible = shadowMat.opacity > 0.012;

    // ambient rain in scene mode
    const rainTarget = mode === "scene" ? 1 : 0;
    rainMat.opacity += (rainTarget - rainMat.opacity) * Math.min(1, dt * 3);
    rain.visible = rainMat.opacity > 0.02;
    if (rain.visible) {
      rains.forEach((l, i) => {
        l.y -= l.sp * dt;
        if (l.y < 0.3) rainSpawn(l);
        V.set(l.x, l.y, l.z);
        Qt.identity();
        M.compose(V, Qt, SC.set(1, 1, 1));
        rain.setMatrixAt(i, M);
      });
      rain.instanceMatrix.needsUpdate = true;
    }

    if (mode === "qr" && !topFlown && qSum / N_DROP > 0.82) {
      topFlown = true;
      api.fly(0.5, 0, 26);
      api.setHint(HINTS.qrTop);
    }

    const soilTarget = mode !== "cloud" ? 1 : 0;
    soilMat.opacity += (soilTarget - soilMat.opacity) * Math.min(1, dt * 3);
    lipMat.opacity = soilMat.opacity;

    /* overhead whitening: below 38° polar the floor starts fading, flat paper
       white by 20° — emissive ramp so the pixels hit exact background white */
    CV.copy(api.camera.position).sub(api.target);
    const polarDeg = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(CV.y / CV.length(), -1, 1)));
    const whiteTarget = THREE.MathUtils.clamp((38 - polarDeg) / 18, 0, 1);
    whiteT += (whiteTarget - whiteT) * Math.min(1, dt * 3);
    soilMat.color.copy(soilBase).multiplyScalar(1 - whiteT);
    soilMat.emissive.copy(WHITE).multiplyScalar(whiteT);
    lipMat.color.copy(lipBase).multiplyScalar(1 - whiteT);
    lipMat.emissive.copy(WHITE).multiplyScalar(whiteT);
    soil.visible = lip.visible = soilMat.opacity > 0.02;

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
    id: "nube",
    label: "Cloud",
    svg: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    rig,
    target: new THREE.Vector3(0, 3, 0),
    minDistance: 7,
    maxDistance: 56,
    sceneView: [64, 32, 28],
    sceneLabel: total + " VOXELS · " + (stainCells.length + grassCells.length + rockCells.length) + " WET / GRASS / ROCK MODULES · " + rainTargets.length + " WAIT FOR RAIN",
    viewNote: "Show QR makes it rain — each drop wets a dark square, then the camera flies overhead",
    floorsTitle: "FLOOR",
    floors: [
      { key: "cement", label: "Cement", chip: 0xCFCFCA },
      { key: "brick", label: "Bricks", chip: 0xD2A188 },
      { key: "grass", label: "Grass", chip: 0xBCCF9C }
    ],
    floorNote: "dry floor stays light, rained-on squares turn dark — together they draw the code, with rocks and grass pitching in",
    swatchTitle: "CLOUD",
    swatches: Object.entries(CLOUDS).map(([name, cols]) => ({ name, chip: cols[1] })),
    shuffleLabel: "Shuffle cloud",

    getMode: () => mode,
    getFloor: () => floorKey,
    getSwatch: () => cloudName,
    getAxes: () => axes,
    getSpeed: () => speed,

    setMode,
    setFloor(key) {
      floorKey = key;
      soilBase.set(FLOORS[floorKey].dry);
      lipBase.set(FLOORS[floorKey].dry).multiplyScalar(0.82);
      paintStains();
      paintDropTargets();
    },
    setSwatch(name) {
      cloudName = name;
      cloudTones = CLOUDS[name];
      paintCloud();
    },
    setAxis(ax, on) { axes[ax] = on; },
    setSpeed(v) { speed = v; },
    shuffle() {
      seed = ((Math.random() * 2147483646) | 0) + 1;
      for (let i = 0; i < N_CLOUD; i++) {
        C.set(cloudTones[(rnd() * cloudTones.length) | 0]).multiplyScalar(0.88 + rnd() * 0.2);
        cloud.setColorAt(i, C);
      }
      cloud.instanceColor!.needsUpdate = true;
    },
    dblclick() {},
    step,
    state: () => ({ mode, total, drops: N_DROP, targets: rainTargets.length,
      qAvg: +(drops.reduce((a, l) => a + l.q, 0) / N_DROP).toFixed(3), topFlown })
  };
}
