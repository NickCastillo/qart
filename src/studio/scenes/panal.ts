import * as THREE from "three";
import type { EngineApi, Mode, StudioScene } from "../types.ts";

/* Beehive — ported verbatim from public/3d/panal3d-v3.html (legacy page).
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

interface Bee {
  sx: number; sy: number; sz: number;
  tx: number; ty: number; tz: number;
  bx: number; by: number; bz: number;
  q: number; fade: number; qDelay: number; dur: number;
  ph: number;
  cPainted?: number;
}
interface Vox {
  mesh: THREE.InstancedMesh; i: number;
  hx: number; hy: number; hz: number;
  ex: number; ey: number; ez: number;
  sx: number; sy: number; sz: number;
  rot: number; ph: number; sp: number; delay: number; k: number;
  scaleY?: number; scaleXZ?: number;
  isHive?: boolean; isBee?: Bee;
}

export function create(api: EngineApi): StudioScene {
  const N = 25, MSZ = 0.5;
  const cx = (c: number) => (c - 12) * MSZ, cz = (r: number) => (r - 12) * MSZ;
  const inFinder = (c: number, r: number) => (c < 8 && r < 8) || (c > 16 && r < 8) || (c < 8 && r > 16);

  let seed = 31;
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

  const voxels: Vox[] = [];
  function reg(mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number): Vox {
    const a = rnd() * Math.PI * 2, rr = 7 + rnd() * 7;
    const v: Vox = { mesh, i, hx: x, hy: y, hz: z, ex: 0, ey: 0, ez: 0,
      sx: Math.cos(a) * rr, sy: 2.5 + rnd() * 8, sz: Math.sin(a) * rr,
      rot: (rnd() - 0.5) * 5, ph: rnd() * 6.28, sp: 0.5 + rnd() * 0.7, delay: rnd() * 0.9, k: 1 };
    voxels.push(v);
    return v;
  }

  // ---- classification: permanent dried honey vs fresh bees ----
  const dripCells: [number, number][] = [], beeTargets: [number, number][] = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (QR[r][c] !== "Q") continue;
    const keep = inFinder(c, r) ? rnd() < 0.62 : rnd() < 0.22;
    if (keep) dripCells.push([c, r]);
    else beeTargets.push([c, r]);
  }

  // ---- floor: thick light slab ----
  const SOIL = 16;
  const FLOORS: Record<string, number> = { wood: 0xD9BC94, cement: 0xCFCFCA, grass: 0xBCCF9C };
  let floorKey = "wood";
  const soilMat = new THREE.MeshLambertMaterial({ color: FLOORS.wood, transparent: true, opacity: 1 });
  const soil = new THREE.Mesh(new THREE.BoxGeometry(SOIL, 0.85, SOIL), soilMat);
  soil.position.y = -0.425;
  world.add(soil);
  const lipMat = new THREE.MeshLambertMaterial({ color: 0xBCA178, transparent: true, opacity: 1 });
  const lip = new THREE.Mesh(new THREE.BoxGeometry(SOIL + 0.7, 0.32, SOIL + 0.7), lipMat);
  lip.position.y = -1.0;
  world.add(lip);

  const WHITE = new THREE.Color(0xFFFFFF);
  const soilBase = new THREE.Color(FLOORS.wood);
  const lipBase = new THREE.Color(0xBCA178);
  let whiteT = 0;
  const CV = new THREE.Vector3();

  // ---- dried honey drips: permanent, varied sizes ----
  const dripTones = [0xBB8C4B, 0xAF7F42, 0xC1965C, 0xA3773E];
  const dripGeo = new THREE.BoxGeometry(MSZ * 0.94, 1, MSZ * 0.94);
  dripGeo.translate(0, 0.5, 0);
  const drips = new THREE.InstancedMesh(dripGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), dripCells.length);
  dripCells.forEach(([c, r], i) => {
    const v = reg(drips, i, cx(c), 0.005, cz(r));
    v.scaleY = 0.03 + rnd() * rnd() * 0.14;
    v.scaleXZ = 0.82 + rnd() * 0.22;
    C.set(dripTones[(rnd() * dripTones.length) | 0]).multiplyScalar(0.85 + rnd() * 0.3);
    drips.setColorAt(i, C);
  });
  drips.instanceColor!.needsUpdate = true;
  world.add(drips);

  // ---- branch ----
  const CSW = 0.34;
  const woodCells: [number, number, number][] = [];
  const wset = new Set<string>();
  const addWood = (x: number, y: number, z: number) => {
    const gx = Math.round(x / CSW), gy = Math.round(y / CSW), gz = Math.round(z / CSW);
    const key = gx + ":" + gy + ":" + gz;
    if (wset.has(key)) return;
    wset.add(key);
    woodCells.push([gx * CSW, gy * CSW, gz * CSW]);
  };
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    addWood(0.2 + 6.4 * t, 9.8 + 2.4 * t * t, -1.3 * t);
    addWood(0.2 + 6.4 * t, 9.8 + 2.4 * t * t - CSW, -1.3 * t);
  }
  addWood(0, 9.8, 0); addWood(0, 9.46, 0);
  const woodMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const wood = new THREE.InstancedMesh(new THREE.BoxGeometry(CSW, CSW, CSW), woodMat, woodCells.length);
  woodCells.forEach(([x, y, z], i) => {
    reg(wood, i, x, y, z).isHive = true;
    const v = 0.85 + (rnd() - 0.5) * 0.2;
    C.setRGB(0.33 * v, 0.23 * v, 0.13 * v);
    wood.setColorAt(i, C);
  });
  wood.instanceColor!.needsUpdate = true;
  world.add(wood);

  // ---- hanging honeycomb: voxels aligned with honey tones ----
  const HONEYS: Record<string, number[]> = {
    golden: [0xF2B53A, 0xE8A62E, 0xD9952A, 0xF6C64A, 0xC9861F],
    amber: [0xD98E2B, 0xC97D22, 0xB86E1C, 0xE49F38, 0xA86018],
    light: [0xF6D27C, 0xEFC468, 0xE8B957, 0xFBDE92, 0xDEAC4E],
    dark: [0xA8741F, 0x966518, 0x855813, 0xB8822A, 0x744B0F],
    wax: [0xE8D9A8, 0xDECC94, 0xD4BF82, 0xF2E4BC, 0xC9B370],
    orange: [0xE8912E, 0xD97F24, 0xF2A444, 0xC96F1C, 0xB86014]
  };
  let honeyName = "golden";
  let honey = HONEYS.golden;
  const CS = 0.3;
  const PIVY = 9.5;
  const hiveCells: [number, number, number][] = [];
  const hiveEntr: boolean[] = [];
  for (let x = -2.85; x <= 2.85; x += CS)
  for (let y = 5.1; y <= 9.5; y += CS)
  for (let z = -2.85; z <= 2.85; z += CS) {
    const ringBulge = 1 + 0.08 * Math.sin((y - 5.0) * 4.2);
    const a = 2.5 * ringBulge, b = 2.3;
    const dy = (y - 7.3) / b;
    if ((x * x + z * z) / (a * a) + dy * dy > 1) continue;
    hiveCells.push([x, y, z]);
    hiveEntr.push(Math.abs(x) < 0.5 && Math.abs(y - 6.0) < 0.5 && z > 1.2);
  }
  const hiveGeo = new THREE.BoxGeometry(CS, CS, CS);
  const hiveMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
  const hive = new THREE.InstancedMesh(hiveGeo, hiveMat, hiveCells.length);
  function paintHive() {
    let s2 = 71;
    const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
    hiveCells.forEach(([, y], i) => {
      if (hiveEntr[i]) { C.setRGB(0.1, 0.06, 0.02); }
      else {
        const band = 0.82 + 0.18 * Math.sin((y - 5.0) * 4.2);
        C.set(honey[(r2() * honey.length) | 0]).multiplyScalar(band * (0.9 + r2() * 0.2));
      }
      hive.setColorAt(i, C);
    });
    hive.instanceColor!.needsUpdate = true;
  }
  hiveCells.forEach(([x, y, z], i) => {
    reg(hive, i, x, y, z).isHive = true;
  });
  paintHive();
  world.add(hive);

  const ENTR = new THREE.Vector3(0, 6.0, 2.3);
  const glow = new THREE.PointLight(0xffb545, 2.5, 4.5);
  glow.position.copy(ENTR);
  world.add(glow);

  // ---- pixelated shadow of the hive and the branch ----
  const SUN_DIR = [0.32, 0.2];
  const shCells = new Set<string>();
  const projectCell = (x: number, y: number, z: number) => {
    const gx = Math.round((x + y * SUN_DIR[0]) / MSZ), gz = Math.round((z + y * SUN_DIR[1]) / MSZ);
    if (Math.abs(gx * MSZ) < SOIL / 2 - 0.4 && Math.abs(gz * MSZ) < SOIL / 2 - 0.4) shCells.add(gx + ":" + gz);
  };
  hiveCells.forEach(([x, y, z]) => projectCell(x, y, z));
  woodCells.forEach(([x, y, z]) => projectCell(x, y, z));
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x26221C, transparent: true, opacity: 0.18, depthWrite: false });
  const shKeys = [...shCells];
  const hiveShadow = new THREE.InstancedMesh(new THREE.BoxGeometry(MSZ * 0.96, 0.02, MSZ * 0.96), shadowMat, shKeys.length);
  shKeys.forEach((key, i) => {
    const [gx, gz] = key.split(":").map(Number);
    M.makeTranslation(gx * MSZ, 0.03, gz * MSZ);
    hiveShadow.setMatrixAt(i, M);
  });
  hiveShadow.renderOrder = 5;
  world.add(hiveShadow);

  // ---- swarm: leaves the entrance and lands on the modules ----
  const N_BEE = Math.round(beeTargets.length * 1.3);
  const beeOrder = [...Array(N_BEE).keys()];
  for (let i = beeOrder.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [beeOrder[i], beeOrder[j]] = [beeOrder[j], beeOrder[i]]; }
  const beeStack = new Array(beeTargets.length).fill(0);
  const beeGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  const beeMesh = new THREE.InstancedMesh(beeGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), N_BEE);
  const beeGold = [0xF2B53A, 0xE8A62E, 0xD9952A, 0x3A2A10];
  const beeDark = new THREE.Color(0xB98346);
  const bees: Bee[] = [];
  const beeVivid: THREE.Color[] = [];
  for (let i = 0; i < N_BEE; i++) {
    const ti = i < beeTargets.length ? i : (rnd() * beeTargets.length) | 0;
    const [tc, tr] = beeTargets[ti];
    const n = Math.min(beeStack[ti]++, 2);
    const txv = cx(tc), tzv = cz(tr);
    bees.push({
      sx: ENTR.x + (rnd() - 0.5) * 0.4, sy: ENTR.y + (rnd() - 0.5) * 0.4, sz: ENTR.z + rnd() * 0.4,
      tx: txv, ty: 0.1 + n * 0.09, tz: tzv,
      bx: txv * 0.5 + (rnd() - 0.5) * 5, by: 2.6 + rnd() * 2.6, bz: tzv * 0.5 + (rnd() - 0.5) * 5,
      q: 0, fade: 1, qDelay: beeOrder[i] * 0.006 + rnd() * 0.3, dur: 1.0 + rnd() * 0.8,
      ph: rnd() * 6.28
    });
    const v = reg(beeMesh, i, bees[i].sx, bees[i].sy, bees[i].sz);
    v.isBee = bees[i];
    const col = new THREE.Color(beeGold[(rnd() * beeGold.length) | 0]);
    beeVivid.push(col);
    beeMesh.setColorAt(i, col);
  }
  beeMesh.instanceColor!.needsUpdate = true;
  world.add(beeMesh);

  // ---- ambient bees orbiting ----
  const NORB = 12;
  const orbMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
  const orbMesh = new THREE.InstancedMesh(beeGeo, orbMat, NORB);
  const orbs: { r: number; w: number; a0: number; yb: number; ph: number }[] = [];
  for (let i = 0; i < NORB; i++) {
    orbs.push({ r: 3.4 + rnd() * 1.3, w: (0.7 + rnd() * 0.8) * (rnd() < 0.5 ? -1 : 1), a0: rnd() * 6.28, yb: 5.8 + rnd() * 2.6, ph: rnd() * 6.28 });
    C.set(beeGold[(rnd() * beeGold.length) | 0]);
    orbMesh.setColorAt(i, C);
  }
  orbMesh.instanceColor!.needsUpdate = true;
  world.add(orbMesh);

  const total = voxels.length;

  let mode: Mode = "scene";
  let stateT = 10;
  let shakeT = 10;
  let topFlown = true;
  const HINTS = {
    scene: "the dried honey is already part of the code — double-click shakes the hive · Show QR releases the swarm",
    qrDrop: "the hive shakes — each bee flies off to land on a dark module…",
    qrTop: "TOP VIEW — the floor fades to white, dried honey + landed bees draw the QR · scan it",
    cloud: "the scene dissolves — every block drifts free · pick a view to rebuild it"
  };
  function setMode(m: Mode) {
    mode = m;
    stateT = 0;
    voxels.forEach(v => { v.delay = rnd() * 0.9; });
    api.syncSegs(m);
    if (m === "scene") { api.fly(64, 32, 28); topFlown = true; api.setHint(HINTS.scene); }
    if (m === "cloud") { api.fly(64, 20, 32); topFlown = true; api.setHint(HINTS.cloud); }
    if (m === "qr") {
      const TAU = Math.PI * 2;
      const norm = (a: number) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
      world.rotation.set(norm(world.rotation.x), norm(world.rotation.y), norm(world.rotation.z));
      topFlown = false;
      shakeT = 0;
      bees.forEach(l => { l.q = 0; l.fade = 1; });
      api.setHint(HINTS.qrDrop);
    }
  }

  const axes = { x: false, y: true, z: false };
  let speed = 0.6;

  let beeColorsDirty = true;
  let simT = 0;
  function step(dt: number) {
    simT += dt; stateT += dt;
    const kTarget = mode === "cloud" ? 0 : 1;

    shakeT += dt;
    const shake = shakeT < 1.6 ? Math.sin(shakeT * 30) * 0.08 * Math.exp(-shakeT * 2.4) : 0;
    const sway = Math.sin(simT * 0.55) * 0.022 + shake;
    const cosS = Math.cos(sway), sinS = Math.sin(sway);

    let qSum = 0;
    for (let i = 0; i < total; i++) {
      const v = voxels[i];
      if (stateT > v.delay) v.k += (kTarget - v.k) * Math.min(1, dt * 2.6);
      const k = smooth(Math.max(0, Math.min(1, v.k)));
      let hx = v.hx, hy = v.hy, hz = v.hz;

      if (v.isHive) {
        const dx = hx, dy = hy - PIVY;
        hx = dx * cosS - dy * sinS;
        hy = PIVY + dx * sinS + dy * cosS;
        const spin0 = v.rot * (1 - k);
        E.set(spin0 * 0.6, spin0, sway + spin0 * 0.3);
        Qt.setFromEuler(E);
        const bobA = (1 - k);
        V.set(
          v.sx + (hx - v.sx) * k + Math.sin(simT * v.sp + v.ph) * 0.18 * bobA,
          v.sy + (hy - v.sy) * k + Math.cos(simT * v.sp * 0.8 + v.ph) * 0.22 * bobA,
          v.sz + (hz - v.sz) * k
        );
        M.compose(V, Qt, SC.set(1, 1, 1));
        v.mesh.setMatrixAt(v.i, M);
        continue;
      }

      if (v.isBee) {
        const l = v.isBee;
        if (mode === "qr") {
          if (stateT > l.qDelay) l.q += (1 - l.q) * Math.min(1, dt / l.dur * 2.2);
        } else if (l.q > 0.001) {
          l.fade = Math.max(0, l.fade - dt * 1.5);
          if (l.fade === 0) l.q = 0;
        }
        const q = smooth(Math.max(0, Math.min(1, l.q)));
        qSum += l.q;
        const u = 1 - q;
        hx = u * u * l.sx + 2 * u * q * l.bx + q * q * l.tx + Math.sin(q * 16 + l.ph) * 0.3 * u * q;
        hy = u * u * l.sy + 2 * u * q * l.by + q * q * l.ty + Math.abs(Math.sin(q * 22 + l.ph)) * 0.25 * u * q;
        hz = u * u * l.sz + 2 * u * q * l.bz + q * q * l.tz + Math.cos(q * 14 + l.ph) * 0.3 * u * q;
        const settle = smooth(Math.max(0, (l.q - 0.8) / 0.2));
        let scl = Math.min(1, l.q * 9) * (mode === "qr" ? 1 : l.fade);
        if (l.q < 0.001) scl = 0;
        SC.set(scl * (1 + settle * 0.5), scl * (1 - settle * 0.45), scl * (1 + settle * 0.5));
        if (l.cPainted === undefined || Math.abs(settle - (l.cPainted || 0)) > 0.04) {
          C2.copy(beeVivid[v.i]).lerp(beeDark, settle);
          beeMesh.setColorAt(v.i, C2);
          l.cPainted = settle;
          beeColorsDirty = true;
        }
        const bobA = (1 - k);
        V.set(
          v.sx + (hx - v.sx) * k + Math.sin(simT * v.sp + v.ph) * 0.18 * bobA,
          v.sy + (hy - v.sy) * k + Math.cos(simT * v.sp * 0.8 + v.ph) * 0.22 * bobA,
          v.sz + (hz - v.sz) * k
        );
        Qt.identity();
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
      E.set(spin * 0.6, spin, spin * 0.3);
      Qt.setFromEuler(E);
      if (v.scaleY !== undefined) SC.set(v.scaleXZ || 1, v.scaleY + (1 - k) * 0.2, v.scaleXZ || 1);
      else SC.set(1, 1, 1);
      M.compose(V, Qt, SC);
      v.mesh.setMatrixAt(v.i, M);
    }
    drips.instanceMatrix.needsUpdate = true;
    wood.instanceMatrix.needsUpdate = true;
    hive.instanceMatrix.needsUpdate = true;
    beeMesh.instanceMatrix.needsUpdate = true;
    if (beeColorsDirty) { beeMesh.instanceColor!.needsUpdate = true; beeColorsDirty = false; }

    glow.intensity = mode === "scene" ? 3 + Math.sin(simT * 3.1) * 1.2 : 0;

    // the hive and the branch fade out in the overhead view
    const hiveFade = (mode === "qr" && topFlown) ? 0 : 1;
    hiveMat.opacity += (hiveFade - hiveMat.opacity) * Math.min(1, dt * 3);
    woodMat.opacity = hiveMat.opacity;
    hive.visible = wood.visible = hiveMat.opacity > 0.02;

    const shTarget = mode === "cloud" ? 0 : (1 - qSum / N_BEE) * 0.18 * hiveMat.opacity;
    shadowMat.opacity += (shTarget - shadowMat.opacity) * Math.min(1, dt * 3);
    hiveShadow.visible = shadowMat.opacity > 0.012;

    // ambient bees
    const orbTarget = mode === "scene" ? 1 : 0;
    orbMat.opacity += (orbTarget - orbMat.opacity) * Math.min(1, dt * 3);
    orbMesh.visible = orbMat.opacity > 0.02;
    if (orbMesh.visible) {
      orbs.forEach((o, i) => {
        const a = o.a0 + simT * o.w;
        V.set(Math.cos(a) * o.r, o.yb + Math.sin(simT * 2.2 + o.ph) * 0.3, Math.sin(a) * o.r);
        Qt.setFromEuler(E.set(0, -a, 0));
        M.compose(V, Qt, SC.set(1, 1, 1));
        orbMesh.setMatrixAt(i, M);
      });
      orbMesh.instanceMatrix.needsUpdate = true;
    }

    if (mode === "qr" && !topFlown && qSum / N_BEE > 0.82) {
      topFlown = true;
      api.fly(0.5, 0, 26);
      api.setHint(HINTS.qrTop);
    }

    const soilTarget = mode !== "cloud" ? 1 : 0;
    soilMat.opacity += (soilTarget - soilMat.opacity) * Math.min(1, dt * 3);
    lipMat.opacity = soilMat.opacity;
    soil.visible = lip.visible = soilMat.opacity > 0.02;

    /* overhead whitening (emissive ramp → exact background white) */
    CV.copy(api.camera.position).sub(api.target);
    const polarDeg = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(CV.y / CV.length(), -1, 1)));
    const whiteTarget = THREE.MathUtils.clamp((38 - polarDeg) / 18, 0, 1);
    whiteT += (whiteTarget - whiteT) * Math.min(1, dt * 3);
    soilMat.color.copy(soilBase).multiplyScalar(1 - whiteT);
    soilMat.emissive.copy(WHITE).multiplyScalar(whiteT);
    lipMat.color.copy(lipBase).multiplyScalar(1 - whiteT);
    lipMat.emissive.copy(WHITE).multiplyScalar(whiteT);

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
    id: "panal",
    label: "Hive",
    svg: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>',
    rig,
    target: new THREE.Vector3(0, 3.8, 0),
    minDistance: 7,
    maxDistance: 56,
    sceneView: [64, 32, 28],
    sceneLabel: total + " VOXELS · " + dripCells.length + " DRIED HONEY DRIPS · " + beeTargets.length + " MODULES WAIT FOR BEES",
    viewNote: "Show QR shakes the hive — the swarm pours out and each bee lands on a dark square",
    floorsTitle: "FLOOR",
    floors: [
      { key: "wood", label: "Wood", chip: 0xD9BC94 },
      { key: "cement", label: "Cement", chip: 0xCFCFCA },
      { key: "grass", label: "Grass", chip: 0xBCCF9C }
    ],
    floorNote: "dried honey drips are permanent modules — even the corners finish only when the bees settle",
    swatchTitle: "HONEY",
    swatches: Object.entries(HONEYS).map(([name, cols]) => ({ name, chip: cols[0] })),
    shuffleLabel: "Shuffle honey",

    getMode: () => mode,
    getFloor: () => floorKey,
    getSwatch: () => honeyName,
    getAxes: () => axes,
    getSpeed: () => speed,

    setMode,
    setFloor(key) {
      floorKey = key;
      soilBase.set(FLOORS[key]);
      lipBase.set(FLOORS[key]).multiplyScalar(0.84);
    },
    setSwatch(name) {
      honeyName = name;
      honey = HONEYS[name];
      paintHive();
    },
    setAxis(ax, on) { axes[ax] = on; },
    setSpeed(v) { speed = v; },
    shuffle() {
      seed = ((Math.random() * 2147483646) | 0) + 1;
      hiveCells.forEach(([, y], i) => {
        if (hiveEntr[i]) return;
        const band = 0.82 + 0.18 * Math.sin((y - 5.0) * 4.2);
        C.set(honey[(rnd() * honey.length) | 0]).multiplyScalar(band * (0.88 + rnd() * 0.24));
        hive.setColorAt(i, C);
      });
      hive.instanceColor!.needsUpdate = true;
    },
    dblclick() { if (mode === "scene") shakeT = 0; },
    step,
    state: () => ({ mode, total, bees: N_BEE, targets: beeTargets.length,
      qAvg: +(bees.reduce((a, l) => a + l.q, 0) / N_BEE).toFixed(3), topFlown })
  };
}
