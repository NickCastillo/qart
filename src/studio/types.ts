import * as THREE from "three";

export type Mode = "scene" | "qr" | "cloud";

export interface FloorSpec {
  key: string;
  label: string;
  chip: number; // swatch dot color in the panel
}

export interface SwatchSpec {
  name: string;
  chip: number;
}

/* What the engine provides to a scene. A scene only calls these while it is
   the active scene (the engine routes every event to the active scene only). */
export interface EngineApi {
  camera: THREE.PerspectiveCamera;
  /** live reference to controls.target — equals the active scene's target */
  target: THREE.Vector3;
  fly(polarDeg: number, aziDeg: number, dist: number): void;
  setHint(text: string): void;
  syncSegs(mode: Mode): void;
}

export interface StudioScene {
  id: string;
  label: string;
  /** inner SVG markup for the dock button icon */
  svg: string;
  /** static group: lights + the rotating `world` inside */
  rig: THREE.Group;
  target: THREE.Vector3;
  minDistance: number;
  maxDistance: number;
  sceneView: [number, number, number]; // polar, azi, dist
  sceneLabel: string;
  viewNote: string;
  floorsTitle: string;
  floors: FloorSpec[];
  floorNote: string;
  swatchTitle: string;
  swatches: SwatchSpec[];
  shuffleLabel: string;

  getMode(): Mode;
  getFloor(): string;
  getSwatch(): string;
  getAxes(): { x: boolean; y: boolean; z: boolean };
  getSpeed(): number;

  setMode(m: Mode): void;
  setFloor(key: string): void;
  setSwatch(name: string): void;
  setAxis(ax: "x" | "y" | "z", on: boolean): void;
  setSpeed(v: number): void;
  shuffle(): void;
  dblclick(): void;
  /** advance simulation + write instance matrices (no render, no tween) */
  step(dt: number): void;
  state(): Record<string, unknown>;
}
