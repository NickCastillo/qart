import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { EngineApi, Mode, StudioScene } from "./types.ts";
import { create as createNube } from "./scenes/nube.ts";
import { create as createArbol } from "./scenes/arbol.ts";
import { create as createPanal } from "./scenes/panal.ts";
import { create as createCigarro } from "./scenes/cigarro.ts";

/* Living Scene Studio — all four scenes live in ONE page and ONE WebGL
   canvas, so switching scenes is a morph inside the same studio (dissolve to
   the free cloud, swap worlds while everything is scattered, reassemble),
   with no page load and no flicker. */

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const vp = $("vp"), hintEl = $("hint"), sceneLabelEl = $("sceneLabel");
const sceneTagEl = $("sceneTag"), dataLineEl = $("dataLine");
const dockEl = $("dock"), viewNoteEl = $("viewNote");
const floorsTitleEl = $("floorsTitle"), floorOptsEl = $("floorOpts"), floorNoteEl = $("floorNote");
const swatchTitleEl = $("swatchTitle"), swatchesEl = $("swatches");
const shuffleLabelEl = $("shuffleLabel");
const spd = $<HTMLInputElement>("spd"), spdV = $("spdV");

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xFFFFFF);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 160);
let vpW = 0, vpH = 0;
function sizeViewport() {
  const w = vp.clientWidth || 880, h = vp.clientHeight || 760;
  if (w === vpW && h === vpH) return;
  vpW = w; vpH = h;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
vp.prepend(renderer.domElement);
sizeViewport();
/* on a phone #vp is sized by the bottom sheet's CSS, and dvh moves as the
   browser chrome collapses — track the box instead of guessing when */
new ResizeObserver(() => sizeViewport()).observe(vp);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
const EMBED = document.documentElement.classList.contains("embed");
if (EMBED) {
  controls.enabled = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.2;
}

/* the orbit target can glide (scene swaps move it smoothly instead of
   cutting); camera flights aim at where the target WILL be (targetEnd), so a
   simultaneous camera+target tween lands coherently */
const targetEnd = new THREE.Vector3();
let tTween: { s: THREE.Vector3; e: THREE.Vector3; t: number } | null = null;
function setTargetNow(v: THREE.Vector3) {
  tTween = null;
  targetEnd.copy(v);
  controls.target.copy(v);
}
function glideTargetTo(v: THREE.Vector3) {
  targetEnd.copy(v);
  tTween = { s: controls.target.clone(), e: v.clone(), t: 0 };
}
const place = (polarDeg: number, aziDeg: number, dist: number) => {
  /* every scene's view distances are tuned on the wide desktop viewport,
     where height limits the shot; on a portrait viewport (the phone layout's
     near-square canvas) width limits it instead, so back off until the shot
     covers the same extent sideways that it was tuned to cover vertically */
  const d = camera.aspect < 1 ? dist / Math.max(camera.aspect, 0.5) : dist;
  const p = THREE.MathUtils.degToRad(polarDeg), a = THREE.MathUtils.degToRad(aziDeg);
  const t = targetEnd;
  return new THREE.Vector3(
    t.x + d * Math.sin(p) * Math.sin(a),
    t.y + d * Math.cos(p),
    t.z + d * Math.sin(p) * Math.cos(a));
};
let tween: { s: THREE.Vector3; e: THREE.Vector3; t: number } | null = null;
const api: EngineApi = {
  camera,
  target: controls.target,
  fly(p, a, d) { tween = { s: camera.position.clone(), e: place(p, a, d), t: 0 }; },
  setHint(t) { hintEl.textContent = t; },
  syncSegs(m: Mode) {
    document.querySelectorAll<HTMLButtonElement>(".seg").forEach(b => b.classList.toggle("active", b.dataset.mode === m));
  }
};
const jump = (p: number, a: number, d: number) => {
  tween = null;
  camera.position.copy(place(p, a, d));
  camera.lookAt(controls.target);
};

// ---- build all four scenes up front (each has its own seed; order-independent) ----
const sceneList: StudioScene[] = [createNube(api), createArbol(api), createPanal(api), createCigarro(api)];
const scenes: Record<string, StudioScene> = {};
sceneList.forEach(s => { scenes[s.id] = s; });

const params = new URLSearchParams(location.search);
const startId = params.get("scene") && scenes[params.get("scene")!] ? params.get("scene")! : "nube";
let active = scenes[startId];
scene.add(active.rig);

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

function applySceneToControls(s: StudioScene) {
  controls.minDistance = s.minDistance;
  controls.maxDistance = s.maxDistance;
}

function updateURL(id: string) {
  history.replaceState(null, "", location.pathname + "?scene=" + id + (EMBED ? "&embed" : ""));
}

// ---- panel ----
function buildDock() {
  dockEl.innerHTML = "";
  sceneList.forEach(s => {
    const d = document.createElement("div");
    d.className = "scene" + (s === active ? " active" : " link");
    d.dataset.scene = s.id;
    d.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2">' + s.svg + "</svg>" + s.label;
    if (s !== active) d.addEventListener("click", () => travel(s.id));
    dockEl.appendChild(d);
  });
}
function buildPanel(s: StudioScene) {
  buildDock();
  viewNoteEl.textContent = s.viewNote;
  floorsTitleEl.textContent = s.floorsTitle;
  floorOptsEl.innerHTML = "";
  s.floors.forEach(f => {
    const b = document.createElement("button");
    b.className = "fop" + (f.key === s.getFloor() ? " active" : "");
    b.dataset.floor = f.key;
    b.innerHTML = '<i style="background:#' + f.chip.toString(16).padStart(6, "0") + '"></i>' + f.label;
    b.addEventListener("click", () => {
      s.setFloor(f.key);
      floorOptsEl.querySelectorAll(".fop").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
    });
    floorOptsEl.appendChild(b);
  });
  floorNoteEl.textContent = s.floorNote;
  swatchTitleEl.textContent = s.swatchTitle;
  swatchesEl.innerHTML = "";
  s.swatches.forEach(sw => {
    const b = document.createElement("button");
    b.className = "psw" + (sw.name === s.getSwatch() ? " active" : "");
    b.innerHTML = '<i style="background:#' + sw.chip.toString(16).padStart(6, "0") + '"></i>';
    b.title = sw.name;
    b.addEventListener("click", () => {
      s.setSwatch(sw.name);
      swatchesEl.querySelectorAll(".psw").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
    });
    swatchesEl.appendChild(b);
  });
  shuffleLabelEl.textContent = s.shuffleLabel;
  const axes = s.getAxes();
  document.querySelectorAll<HTMLButtonElement>(".chip").forEach(ch => {
    ch.classList.toggle("on", axes[ch.dataset.ax as "x" | "y" | "z"]);
  });
  spd.value = String(s.getSpeed());
  spdV.textContent = s.getSpeed().toFixed(1) + "×";
  spd.style.setProperty("--fill", (s.getSpeed() / 2 * 100) + "%");
  sceneLabelEl.textContent = s.sceneLabel;
  /* the phone layout splits that overlay line in two: a short scene tag in
     the nav, and the voxel stats at the end of the sheet's scroll */
  sceneTagEl.textContent = "0" + (sceneList.indexOf(s) + 1) + " · " + s.label.toUpperCase();
  dataLineEl.textContent = s.sceneLabel;
  api.syncSegs(s.getMode());
}

document.querySelectorAll<HTMLButtonElement>(".seg").forEach(b =>
  b.addEventListener("click", () => active.setMode(b.dataset.mode as Mode)));
document.querySelectorAll<HTMLButtonElement>(".chip").forEach(ch =>
  ch.addEventListener("click", () => {
    const ax = ch.dataset.ax as "x" | "y" | "z";
    const on = !active.getAxes()[ax];
    active.setAxis(ax, on);
    ch.classList.toggle("on", on);
  }));
spd.addEventListener("input", () => {
  const v = parseFloat(spd.value);
  active.setSpeed(v);
  spdV.textContent = v.toFixed(1) + "×";
  spd.style.setProperty("--fill", (v / 2 * 100) + "%");
});
$("shuffle").addEventListener("click", () => active.shuffle());
renderer.domElement.addEventListener("dblclick", () => active.dblclick());

// ---- switching scenes: one canvas, direct swap, gliding camera ----
/* the worlds swap in place (no page load, no cloud ceremony) while the
   camera and the orbit target glide from wherever they are to the new
   scene's own view, landing on the exact framing of a direct load */
function swapTo(next: StudioScene) {
  scene.remove(active.rig);
  active = next;
  scene.add(next.rig);
  applySceneToControls(next);
  buildPanel(next);
  updateURL(next.id);
}
function travel(id: string) {
  if (id === active.id) return;
  const next = scenes[id];
  swapTo(next);
  if (REDUCED) {
    setTargetNow(next.target);
    next.setMode("scene");
    jump(...next.sceneView);
    return;
  }
  glideTargetTo(next.target);
  next.setMode("scene"); // flies to the new scene's view as the target glides
}

// ---- boot ----
applySceneToControls(active);
setTargetNow(active.target);
jump(...active.sceneView);
buildPanel(active);
active.setMode("scene");
jump(...active.sceneView); // setMode starts a fly; first paint should already sit at the scene view
updateURL(active.id);

// ---- debug hooks (same contract as the standalone pieces) ----
declare global {
  interface Window {
    __state: () => Record<string, unknown>;
    __cam: () => Record<string, unknown>;
    __step: (dt: number) => void;
    __travel: (id: string) => void;
    __fr: number;
    setView: (p: number, a: number, d?: number) => void;
  }
}
window.__state = () => ({ scene: active.id, frames: window.__fr || 0, ...active.state() });
window.__cam = () => ({
  pos: camera.position.toArray().map(v => +v.toFixed(3)),
  target: controls.target.toArray().map(v => +v.toFixed(3)),
});
window.__travel = travel;
window.setView = (p, a, d = 28) => { jump(p, a, d); };

const clock = new THREE.Clock();
function step(dt: number) {
  active.step(dt);
  if (tween) {
    tween.t += dt / 1.2;
    const p = Math.min(1, tween.t);
    camera.position.lerpVectors(tween.s, tween.e, p * p * (3 - 2 * p));
    if (tween.t >= 1) tween = null;
  }
  if (tTween) {
    tTween.t += dt / 1.2;
    const p = Math.min(1, tTween.t);
    controls.target.lerpVectors(tTween.s, tTween.e, p * p * (3 - 2 * p));
    if (tTween.t >= 1) tTween = null;
  }
  controls.update();
  renderer.render(scene, camera);
}
window.__step = step;
function animate() {
  window.__fr = (window.__fr || 0) + 1;
  requestAnimationFrame(animate);
  if ((window.__fr & 31) === 0) sizeViewport();
  step(Math.min(clock.getDelta(), 0.05));
}
animate();

addEventListener("resize", sizeViewport);
