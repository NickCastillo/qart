import * as THREE from "three";
import type { EngineApi, Mode, StudioScene } from "../types.ts";

/* Cigar & Ashtray — ported verbatim from public/3d/cigarro3d-v3.html (legacy
   page). The seed and every rnd() call keep their original order so the
   generated layout is identical to the standalone page. */

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

interface Flake {
  sx: number; sy: number; sz: number;
  tx: number; ty: number; tz: number;
  bx: number; by: number; bz: number;
  q: number; fade: number; qDelay: number; dur: number;
  ph: number; rx: number; yaw: number;
}
interface Vox {
  mesh: THREE.InstancedMesh; i: number;
  hx: number; hy: number; hz: number;
  ex: number; ey: number; ez: number;
  sx: number; sy: number; sz: number;
  rot: number; ph: number; sp: number; delay: number; k: number;
  scaleY?: number; scaleXZ?: number;
  isCig?: boolean; isFlake?: Flake;
}

export function create(api: EngineApi): StudioScene {
  const N = 25, MSZ = 0.5;
  const cx = (c: number) => (c - 12) * MSZ, cz = (r: number) => (r - 12) * MSZ;
  const inFinder = (c: number, r: number) => (c < 8 && r < 8) || (c > 16 && r < 8) || (c < 8 && r > 16);

  let seed = 41;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const smooth = (p: number) => p * p * (3 - 2 * p);

  const rig = new THREE.Group();
  rig.add(new THREE.HemisphereLight(0xfffaf0, 0x8a8578, 1.3));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.15);
  sun.position.set(-5.1, 16, -3.2);
  rig.add(sun);

  const world = new THREE.Group();
  rig.add(world);

  const M = new THREE.Matrix4(), C = new THREE.Color();
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

  // ---- classification: permanent glaze vs ash ----
  const glazeCells: [number, number][] = [], ashTargets: [number, number][] = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (QR[r][c] !== "Q") continue;
    const keep = inFinder(c, r) ? rnd() < 0.62 : rnd() < 0.22;
    if (keep) glazeCells.push([c, r]);
    else ashTargets.push([c, r]);
  }

  // ---- ashtray: thick tray + rims, light material ----
  const TRAY = 16;
  const FLOORS: Record<string, number> = { ceramic: 0xD9D9D4, glass: 0xC9D5DA, clay: 0xD8C7A4 };
  let floorKey = "ceramic";
  const trayMat = new THREE.MeshLambertMaterial({ color: FLOORS.ceramic, transparent: true, opacity: 1 });
  const tray = new THREE.Mesh(new THREE.BoxGeometry(TRAY, 0.85, TRAY), trayMat);
  tray.position.y = -0.425;
  world.add(tray);
  const lipMat = new THREE.MeshLambertMaterial({ color: 0xB9B9B2, transparent: true, opacity: 1 });
  const lip = new THREE.Mesh(new THREE.BoxGeometry(TRAY + 0.7, 0.32, TRAY + 0.7), lipMat);
  lip.position.y = -1.0;
  world.add(lip);
  const rims: THREE.Mesh[] = [];
  const RIMH = 1.3, RIMT = 0.85;
  ([[0, -TRAY / 2 + RIMT / 2], [0, TRAY / 2 - RIMT / 2], [-TRAY / 2 + RIMT / 2, 0], [TRAY / 2 - RIMT / 2, 0]] as const).forEach(([x, z], i) => {
    const g = i < 2 ? new THREE.BoxGeometry(TRAY, RIMH, RIMT) : new THREE.BoxGeometry(RIMT, RIMH, TRAY - RIMT * 2);
    const m = new THREE.Mesh(g, trayMat);
    m.position.set(x, RIMH / 2, z);
    world.add(m);
    rims.push(m);
  });

  const WHITE = new THREE.Color(0xFFFFFF);
  const trayBase = new THREE.Color(FLOORS.ceramic);
  const lipBase = new THREE.Color(0xB9B9B2);
  let whiteT = 0;
  const CV = new THREE.Vector3();

  // ---- old ash: permanent piles of different sizes ----
  const glazeTones = [0x55534E, 0x4A4843, 0x5F5D57, 0x514F49, 0x45443F];
  const glazeGeo = new THREE.BoxGeometry(MSZ * 0.92, 1, MSZ * 0.92);
  glazeGeo.translate(0, 0.5, 0);
  const glazeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const glaze = new THREE.InstancedMesh(glazeGeo, glazeMat, glazeCells.length);
  glazeCells.forEach(([c, r], i) => {
    const v = reg(glaze, i, cx(c) + (rnd() - 0.5) * 0.05, 0.01, cz(r) + (rnd() - 0.5) * 0.05, E.set(0, (rnd() - 0.5) * 0.35, 0).clone());
    v.scaleY = 0.06 + rnd() * rnd() * 0.34;
    v.scaleXZ = 0.8 + rnd() * 0.24;
    C.set(glazeTones[(rnd() * glazeTones.length) | 0]).multiplyScalar(0.85 + rnd() * 0.3);
    glaze.setColorAt(i, C);
  });
  glaze.instanceColor!.needsUpdate = true;
  world.add(glaze);

  // ---- cigar: spans the whole tray, resting on the rims ----
  const WRAPPERS: Record<string, number[]> = {
    claro: [0xC68E5A, 0xBD8450, 0xD09A66],
    colorado: [0xA65E2E, 0x9A5428, 0xB36836],
    maduro: [0x6B3E22, 0x61371D, 0x774628],
    oscuro: [0x452918, 0x3D2414, 0x4F2F1C],
    candela: [0x7A8B4C, 0x6F8043, 0x859655],
    crema: [0xD9B98C, 0xCFAF80, 0xE2C398]
  };
  let wrapperName = "claro";
  let wrapper = WRAPPERS.claro;
  const CS = 0.22;
  const CIGY = 6.2;
  const TILT = -0.09;
  const PIVX = -9.5, PIVY = CIGY;
  const bodyCells: [number, number, number, number][] = [];   // [x,y,z,kind] 0=filter 1=band 2=paper 3=ash
  const emberCells: [number, number, number][] = [];
  for (let x = -9.5; x <= 0.0; x += CS)
  for (let y = -0.62; y <= 0.62; y += CS)
  for (let z = -0.62; z <= 0.62; z += CS) {
    if (y * y + z * z > 0.36) continue;
    if (x > -0.5) emberCells.push([x, CIGY + y, z]);
    else if (x > -1.1) bodyCells.push([x, CIGY + y, z, 3]);
    else if (x > -6.7) bodyCells.push([x, CIGY + y, z, 2]);
    else if (x > -7.0) bodyCells.push([x, CIGY + y, z, 1]);
    else bodyCells.push([x, CIGY + y, z, 0]);
  }
  const voxGeo = new THREE.BoxGeometry(CS * 0.98, CS * 0.98, CS * 0.98);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
  const body = new THREE.InstancedMesh(voxGeo, bodyMat, bodyCells.length);
  function paintBody() {
    let s2 = 77;
    const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
    bodyCells.forEach(([, , , kind], i) => {
      const v = 0.9 + (r2() - 0.5) * 0.12;
      if (kind === 0) { C.set(wrapper[(r2() * wrapper.length) | 0]).multiplyScalar(v); }
      else if (kind === 1) { C.setRGB(0.72 * v, 0.44 * v, 0.16 * v); }
      else if (kind === 2) { C.setRGB(0.93 * v, 0.93 * v, 0.9 * v); }
      else { C.setRGB(0.42 * v, 0.41 * v, 0.42 * v); }
      body.setColorAt(i, C);
    });
    body.instanceColor!.needsUpdate = true;
  }
  bodyCells.forEach(([x, y, z], i) => { reg(body, i, x, y, z).isCig = true; });
  paintBody();
  world.add(body);

  const emberMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xff3c00, emissiveIntensity: 0.8, transparent: true, opacity: 1 });
  const ember = new THREE.InstancedMesh(voxGeo, emberMat, emberCells.length);
  const emberCols = [0xff6a1e, 0xff3c00, 0xffb347, 0xd92800];
  emberCells.forEach(([x, y, z], i) => {
    reg(ember, i, x, y, z).isCig = true;
    C.set(emberCols[(rnd() * emberCols.length) | 0]);
    ember.setColorAt(i, C);
  });
  ember.instanceColor!.needsUpdate = true;
  world.add(ember);

  const TIPREST = new THREE.Vector3(0, CIGY, 0);
  const TIP = TIPREST.clone();
  const emberLight = new THREE.PointLight(0xff5a1e, 10, 10);
  emberLight.position.copy(TIP);
  world.add(emberLight);

  // ---- pixelated shadow cast by the ember's fire ----
  const shCells = new Set<string>();
  const projectFire = (x: number, _y: number, z: number) => {
    const spread = 1.3 + (TIPREST.x - x) * 0.07;
    const gx = Math.round((x * 0.72 - 0.5) / MSZ);
    const gz = Math.round((z * spread) / MSZ);
    if (Math.abs(gx * MSZ) < TRAY / 2 - RIMT - 0.1 && Math.abs(gz * MSZ) < TRAY / 2 - RIMT - 0.1) shCells.add(gx + ":" + gz);
  };
  bodyCells.forEach(([x, y, z]) => projectFire(x, y, z));
  emberCells.forEach(([x, y, z]) => projectFire(x, y, z));
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x26221C, transparent: true, opacity: 0.15, depthWrite: false });
  const shKeys = [...shCells];
  const fireShadow = new THREE.InstancedMesh(new THREE.BoxGeometry(MSZ * 0.96, 0.02, MSZ * 0.96), shadowMat, shKeys.length);
  shKeys.forEach((key, i) => {
    const [gx, gz] = key.split(":").map(Number);
    M.makeTranslation(gx * MSZ, 0.09, gz * MSZ);
    fireShadow.setMatrixAt(i, M);
  });
  fireShadow.renderOrder = 5;
  world.add(fireShadow);

  // ---- ash: falls from the cigar's underside and completes the QR ----
  const N_ASH = Math.round(ashTargets.length * 1.5);
  const ashOrder = [...Array(N_ASH).keys()];
  for (let i = ashOrder.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [ashOrder[i], ashOrder[j]] = [ashOrder[j], ashOrder[i]]; }
  const ashStack = new Array(ashTargets.length).fill(0);
  const ashGeo = new THREE.BoxGeometry(MSZ * 0.92, MSZ * 0.92, MSZ * 0.92);
  const ashMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const ashMesh = new THREE.InstancedMesh(ashGeo, ashMat, N_ASH);
  const ashGrays = [0x54524D, 0x484641, 0x5E5C56, 0x4D4B46];
  const flakes: Flake[] = [];
  for (let i = 0; i < N_ASH; i++) {
    const ti = i < ashTargets.length ? i : (rnd() * ashTargets.length) | 0;
    const [tc, tr] = ashTargets[ti];
    const n = Math.min(ashStack[ti]++, 4);
    const jit = n === 0 ? 0.02 : 0.05;
    /* flakes detach from the UNDERSIDE of the (tilted) cigar */
    const sx = -1.4 + rnd() * 1.1, syJit = rnd() * 0.25, szJit = (rnd() - 0.5) * 0.7;
    const underY = PIVY + (sx - PIVX) * Math.sin(TILT) - 0.62;
    const txv = cx(tc) + (rnd() - 0.5) * jit, tzv = cz(tr) + (rnd() - 0.5) * jit;
    flakes.push({
      sx, sy: underY - syJit, sz: szJit,
      tx: txv, ty: 0.12 + n * 0.095, tz: tzv,
      bx: (sx + txv) / 2 + (rnd() - 0.5) * 2.2, by: underY - 1.0 - rnd() * 1.2, bz: (tzv) / 2 + (rnd() - 0.5) * 2.2,
      q: 0, fade: 1, qDelay: ashOrder[i] * 0.004 + rnd() * 0.25, dur: 0.8 + rnd() * 0.8,
      ph: rnd() * 6.28, rx: rnd() * 5 - 2.5, yaw: (rnd() - 0.5) * 0.9
    });
    const v = reg(ashMesh, i, sx, flakes[i].sy, 0);
    v.isFlake = flakes[i];
    C.set(ashGrays[(rnd() * ashGrays.length) | 0]);
    ashMesh.setColorAt(i, C);
  }
  ashMesh.instanceColor!.needsUpdate = true;
  world.add(ashMesh);

  // ---- smoke ----
  const NSMOKE = 90;
  const smokeMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
  const smoke = new THREE.InstancedMesh(new THREE.BoxGeometry(0.17, 0.17, 0.17), smokeMat, NSMOKE);
  const puffs: { age: number; life: number; rise: number; dx: number; dz: number; ph: number; sc: number }[] = [];
  for (let i = 0; i < NSMOKE; i++) {
    puffs.push({ age: rnd() * 4, life: 3 + rnd() * 2, rise: 1.1 + rnd() * 0.8, dx: (rnd() - 0.5) * 0.5, dz: (rnd() - 0.5) * 0.5, ph: rnd() * 6.28, sc: 0.7 + rnd() * 0.9 });
    const v = 0.55 + rnd() * 0.25;
    C.setRGB(v, v, v * 1.02);
    smoke.setColorAt(i, C);
  }
  smoke.instanceColor!.needsUpdate = true;
  world.add(smoke);

  const total = voxels.length;

  let mode: Mode = "scene";
  let stateT = 10;
  let shakeT = 10;
  let topFlown = true;
  const HINTS = {
    scene: "the old ash in the tray is part of the code — double-click shakes the cigar · Show QR completes it",
    qrDrop: "a little tap — the fresh ash falls and finishes building the code…",
    qrTop: "TOP VIEW — the tray fades to white, old ash + fresh ash draw the QR · scan it",
    cloud: "the scene dissolves — every block drifts free · pick a view to rebuild it"
  };
  function setMode(m: Mode) {
    mode = m;
    stateT = 0;
    voxels.forEach(v => { v.delay = rnd() * 0.9; });
    api.syncSegs(m);
    if (m === "scene") { api.fly(64, 32, 27); topFlown = true; api.setHint(HINTS.scene); }
    if (m === "cloud") { api.fly(64, 20, 30); topFlown = true; api.setHint(HINTS.cloud); }
    if (m === "qr") {
      const TAU = Math.PI * 2;
      const norm = (a: number) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
      world.rotation.set(norm(world.rotation.x), norm(world.rotation.y), norm(world.rotation.z));
      topFlown = false;
      shakeT = 0;
      flakes.forEach(l => { l.q = 0; l.fade = 1; });
      api.setHint(HINTS.qrDrop);
    }
  }

  const axes = { x: false, y: true, z: false };
  let speed = 0.6;

  let simT = 0;
  function step(dt: number) {
    simT += dt; stateT += dt;
    const kTarget = mode === "cloud" ? 0 : 1;

    shakeT += dt;
    const shake = shakeT < 1.6 ? Math.sin(shakeT * 34) * 0.11 * Math.exp(-shakeT * 2.6) : 0;
    const cigTheta = TILT + Math.sin(simT * 0.6) * 0.012 + shake;
    const cosT = Math.cos(cigTheta), sinT = Math.sin(cigTheta);
    const cigBob = Math.sin(simT * 0.8) * 0.1;
    const tdx = TIPREST.x - PIVX, tdy = TIPREST.y - PIVY;
    TIP.set(PIVX + tdx * cosT - tdy * sinT, PIVY + tdx * sinT + tdy * cosT + cigBob, 0);
    emberLight.position.copy(TIP);

    let qSum = 0;
    for (let i = 0; i < total; i++) {
      const v = voxels[i];
      if (stateT > v.delay) v.k += (kTarget - v.k) * Math.min(1, dt * 2.6);
      const k = smooth(Math.max(0, Math.min(1, v.k)));
      let hx = v.hx, hy = v.hy, hz = v.hz, exRot = 0, scl = 1;

      if (v.isCig) {
        const dx = hx - PIVX, dy = hy - PIVY;
        hx = PIVX + dx * cosT - dy * sinT;
        hy = PIVY + dx * sinT + dy * cosT + cigBob;
        const spin0 = v.rot * (1 - k);
        E.set(v.ex + spin0 * 0.6, v.ey + spin0, cigTheta + spin0 * 0.3);
        Qt.setFromEuler(E);
        const bobAmt0 = (1 - k);
        V.set(
          v.sx + (hx - v.sx) * k + Math.sin(simT * v.sp + v.ph) * 0.18 * bobAmt0,
          v.sy + (hy - v.sy) * k + Math.cos(simT * v.sp * 0.8 + v.ph) * 0.22 * bobAmt0,
          v.sz + (hz - v.sz) * k
        );
        M.compose(V, Qt, SC.set(1, 1, 1));
        v.mesh.setMatrixAt(v.i, M);
        continue;
      }

      if (v.isFlake) {
        const l = v.isFlake;
        if (mode === "qr") {
          if (stateT > l.qDelay) l.q += (1 - l.q) * Math.min(1, dt / l.dur * 2.2);
        } else if (l.q > 0.001) {
          l.fade = Math.max(0, l.fade - dt * 1.5);
          if (l.fade === 0) l.q = 0;
        }
        const q = smooth(Math.max(0, Math.min(1, l.q)));
        qSum += l.q;
        const u = 1 - q;
        hx = u * u * l.sx + 2 * u * q * l.bx + q * q * l.tx + Math.sin(q * 14 + l.ph) * 0.1 * u;
        hy = u * u * l.sy + 2 * u * q * l.by + q * q * l.ty;
        hz = u * u * l.sz + 2 * u * q * l.bz + q * q * l.tz + Math.cos(q * 12 + l.ph) * 0.1 * u;
        exRot = q * (1 - q);
        scl = Math.min(1, l.q * 7) * (mode === "qr" ? 1 : l.fade);
        if (l.q < 0.001) scl = 0;
        SC.set(scl, scl * (1 - q * 0.78), scl);
      }

      const bobAmt = (1 - k);
      V.set(
        v.sx + (hx - v.sx) * k + Math.sin(simT * v.sp + v.ph) * 0.18 * bobAmt,
        v.sy + (hy - v.sy) * k + Math.cos(simT * v.sp * 0.8 + v.ph) * 0.22 * bobAmt,
        v.sz + (hz - v.sz) * k
      );
      const spin = v.rot * (1 - k) + (v.isFlake ? v.isFlake.rx * exRot * 2 : 0);
      E.set(v.ex + spin * 0.6, v.ey + spin + (v.isFlake ? v.isFlake.yaw * smooth(Math.min(1, v.isFlake.q)) : 0), v.ez + spin * 0.3);
      Qt.setFromEuler(E);
      if (!v.isFlake) {
        if (v.scaleY !== undefined) SC.set(v.scaleXZ || 1, v.scaleY + (1 - k) * 0.2, v.scaleXZ || 1);
        else SC.set(1, 1, 1);
      }
      M.compose(V, Qt, SC);
      v.mesh.setMatrixAt(v.i, M);
    }
    glaze.instanceMatrix.needsUpdate = true;
    body.instanceMatrix.needsUpdate = true;
    ember.instanceMatrix.needsUpdate = true;
    ashMesh.instanceMatrix.needsUpdate = true;

    // ember that flickers + light
    const flick = 0.75 + Math.sin(simT * 7.3) * 0.2 + Math.sin(simT * 13.1 + 1.7) * 0.12;
    emberMat.emissiveIntensity = flick;
    emberLight.intensity = mode === "scene" ? 7 + flick * 5 : 0;

    // fire shadow: flickers with the ember, fades with the ash
    const shBase = mode === "cloud" ? 0 : (1 - qSum / N_ASH) * 0.15;
    const shTarget = shBase * (0.8 + flick * 0.25);
    shadowMat.opacity += (shTarget - shadowMat.opacity) * Math.min(1, dt * 4);
    fireShadow.visible = shadowMat.opacity > 0.012;

    // the cigar fades out as the camera rises in QR view
    bodyMat.opacity += ((mode === "qr" && topFlown ? 0 : 1) - bodyMat.opacity) * Math.min(1, dt * 3);
    emberMat.opacity = bodyMat.opacity;
    body.visible = ember.visible = bodyMat.opacity > 0.02;

    const smokeTarget = mode === "scene" ? 1 : 0;
    smokeMat.opacity += (smokeTarget - smokeMat.opacity) * Math.min(1, dt * 3);
    smoke.visible = smokeMat.opacity > 0.02;
    if (smoke.visible) {
      puffs.forEach((s, i) => {
        s.age += dt;
        if (s.age > s.life) { s.age = 0; s.life = 3 + rnd() * 2; s.rise = 1.1 + rnd() * 0.8; s.dx = (rnd() - 0.5) * 0.5; s.dz = (rnd() - 0.5) * 0.5; s.ph = rnd() * 6.28; s.sc = 0.7 + rnd() * 0.9; }
        const a = s.age, n = a / s.life;
        V.set(
          TIP.x + s.dx * a + Math.sin(a * 1.6 + s.ph) * 0.35 * n,
          TIP.y + 0.5 + s.rise * a,
          TIP.z + s.dz * a + Math.cos(a * 1.4 + s.ph) * 0.35 * n
        );
        const sk = Math.sin(Math.PI * Math.min(n, 1)) * s.sc;
        E.set(a * 0.8 + s.ph, a * 0.6, 0);
        Qt.setFromEuler(E);
        M.compose(V, Qt, SC.set(sk, sk, sk));
        smoke.setMatrixAt(i, M);
      });
      smoke.instanceMatrix.needsUpdate = true;
    }

    if (mode === "qr" && !topFlown && qSum / N_ASH > 0.82) {
      topFlown = true;
      api.fly(0.5, 0, 26);
      api.setHint(HINTS.qrTop);
    }

    const trayTarget = mode !== "cloud" ? 1 : 0;
    trayMat.opacity += (trayTarget - trayMat.opacity) * Math.min(1, dt * 3);
    lipMat.opacity = trayMat.opacity;
    tray.visible = lip.visible = trayMat.opacity > 0.02;
    rims.forEach(r => { r.visible = tray.visible; });

    /* overhead whitening (emissive ramp → exact background white; the rims
       share trayMat so their vertical faces whiten too) */
    CV.copy(api.camera.position).sub(api.target);
    const polarDeg = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(CV.y / CV.length(), -1, 1)));
    const whiteTarget = THREE.MathUtils.clamp((38 - polarDeg) / 18, 0, 1);
    whiteT += (whiteTarget - whiteT) * Math.min(1, dt * 3);
    trayMat.color.copy(trayBase).multiplyScalar(1 - whiteT);
    trayMat.emissive.copy(WHITE).multiplyScalar(whiteT);
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
    id: "cigarro",
    label: "Cigar",
    svg: '<path d="M18 12H2v4h16"/><path d="M22 12v4"/><path d="M7 12v4"/>',
    rig,
    target: new THREE.Vector3(0, 2.8, 0),
    minDistance: 7,
    maxDistance: 56,
    sceneView: [64, 32, 24],
    sceneLabel: total + " VOXELS · " + glazeCells.length + " OLD ASH PILES · " + ashTargets.length + " MODULES WAIT FOR FRESH ASH",
    viewNote: "Show QR shakes the ash onto the code's dark squares, then flies the camera overhead",
    floorsTitle: "ASHTRAY",
    floors: [
      { key: "ceramic", label: "Ceramic", chip: 0xD9D9D4 },
      { key: "glass", label: "Glass", chip: 0xC9D5DA },
      { key: "clay", label: "Clay", chip: 0xD8C7A4 }
    ],
    floorNote: "the old ash resting in the tray is permanent — even the corners finish only when the cigar sheds fresh ash",
    swatchTitle: "FILTER",
    swatches: Object.entries(WRAPPERS).map(([name, cols]) => ({ name, chip: cols[0] })),
    shuffleLabel: "Shuffle wrapper",

    getMode: () => mode,
    getFloor: () => floorKey,
    getSwatch: () => wrapperName,
    getAxes: () => axes,
    getSpeed: () => speed,

    setMode,
    setFloor(key) {
      floorKey = key;
      trayBase.set(FLOORS[key]);
      lipBase.set(FLOORS[key]).multiplyScalar(0.84);
    },
    setSwatch(name) {
      wrapperName = name;
      wrapper = WRAPPERS[name];
      paintBody();
    },
    setAxis(ax, on) { axes[ax] = on; },
    setSpeed(v) { speed = v; },
    shuffle() {
      seed = ((Math.random() * 2147483646) | 0) + 1;
      bodyCells.forEach(([, , , kind], i) => {
        const v = 0.9 + (rnd() - 0.5) * 0.14;
        if (kind === 0) { C.set(wrapper[(rnd() * wrapper.length) | 0]).multiplyScalar(v); body.setColorAt(i, C); }
      });
      body.instanceColor!.needsUpdate = true;
    },
    dblclick() { if (mode === "scene") shakeT = 0; },
    step,
    state: () => ({ mode, total, flakes: N_ASH, targets: ashTargets.length,
      qAvg: +(flakes.reduce((a, l) => a + l.q, 0) / N_ASH).toFixed(3), topFlown })
  };
}
