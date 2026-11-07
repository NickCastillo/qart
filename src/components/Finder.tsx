import { useEffect, useMemo, useRef } from "react";
import qrcode from "qrcode-generator";

const URL_A = "https://www.instagram.com/_nickcamera";
const URL_B = "https://www.youtube.com/watch?v=FvOpPeKSf_4";
const URLS = [URL_A, URL_B];

const BG = "#0A0A0A";
const CREAM = "#EEF0F3";
const ACCENT = "#FF3D00";
const SZ = 380;
const DUR = { hold: 3, out: 0.9, swarm: 0.85, in: 1.1 };

type TypeNumber = Parameters<typeof qrcode>[0];

interface Mod {
  c: number;
  r: number;
  fin: boolean;
}

interface Fly {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  hx: number;
  hy: number;
  c1: number;
  c2: number;
  w1: number;
  w2: number;
  w3: number;
  w4: number;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  A1: number;
  A2: number;
  A3: number;
  A4: number;
  dOut: number;
  kOut: number;
  dIn: number;
  kIn: number;
  ghostA: boolean;
  ghostB: boolean;
  finder: boolean;
}

function minimalVersion(url: string): TypeNumber {
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  return ((qr.getModuleCount() - 17) / 4) as TypeNumber;
}

function buildGrid(url: string, version: TypeNumber, n: number): Mod[] {
  const qr = qrcode(version, "M");
  qr.addData(url);
  qr.make();
  const isFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const out: Mod[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) out.push({ c, r, fin: isFinder(r, c) });
    }
  }
  return out;
}

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a: number[], b: number[], t: number) =>
  "#" +
  [0, 1, 2]
    .map((i) => Math.round(a[i] + (b[i] - a[i]) * t).toString(16).padStart(2, "0"))
    .join("");
const RAMP = Array.from({ length: 17 }, (_, i) => mixHex(hex(CREAM), hex(ACCENT), i / 16));
const warm = (t: number) => RAMP[Math.round(Math.max(0, Math.min(1, t)) * 16)];

const clamp01 = (p: number) => (p < 0 ? 0 : p > 1 ? 1 : p);
const smooth = (p: number) => p * p * (3 - 2 * p);
const outQuint = (p: number) => 1 - Math.pow(1 - p, 5);

/* Port of makeNucleo() from node zPFjV (hero-animations.html): every module
   flies a quadratic bezier out to a random swarm anchor, wanders there on 4
   sinusoids, then bezier-lands on its next slot — finders ride the exact
   same flight, staying gold throughout, landing on the position they'd
   occupy after a 90°-CW rotation of the grid (still a valid, scannable
   QR — finder detection is orientation-agnostic). Nothing ever renders
   outside the canvas square (clampC). Generalized from the prototype's
   fixed 25x25 grid to whatever shared module count our two real URLs need,
   and from 4 decorative codes to the 2 real ones, looping forever. */
export function Finder() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  const { n, grids } = useMemo(() => {
    const version = Math.max(minimalVersion(URL_A), minimalVersion(URL_B)) as TypeNumber;
    const gridN = version * 4 + 17;
    return { n: gridN, grids: [buildGrid(URL_A, version, gridN), buildGrid(URL_B, version, gridN)] };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = SZ * dpr;
    canvas.height = SZ * dpr;
    ctx.scale(dpr, dpr);

    const CELL = SZ / (n + 4);
    const OFF = CELL * 2;
    const BOX = CELL - Math.max(1, CELL * 0.11);
    const H = BOX / 2;
    const px = (c: number) => OFF + c * CELL;
    const py = (r: number) => OFF + r * CELL;
    /* keep every drawn module's box fully inside the canvas square */
    const clampC = (v: number) => Math.min(Math.max(v, H), SZ - H);

    const mod = (x: number, y: number, s: number, col: string, a = 1) => {
      if (a <= 0.004 || s <= 0.004) return;
      ctx.globalAlpha = a > 1 ? 1 : a;
      ctx.fillStyle = col;
      const w = BOX * s;
      ctx.fillRect(x + (BOX - w) / 2, y + (BOX - w) / 2, w, w);
      ctx.globalAlpha = 1;
    };
    const clear = (a = 1) => {
      ctx.globalAlpha = a;
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, SZ, SZ);
      ctx.globalAlpha = 1;
    };

    const setLink = (qi: number) => {
      if (linkRef.current) linkRef.current.href = URLS[qi];
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      let qi = 0;
      const draw = () => {
        clear(1);
        for (const m of grids[qi]) mod(px(m.c), py(m.r), 1, m.fin ? ACCENT : CREAM, 1);
        setLink(qi);
      };
      draw();
      const id = window.setInterval(() => {
        qi = (qi + 1) % 2;
        draw();
      }, DUR.hold * 1000);
      return () => window.clearInterval(id);
    }

    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    const PAD = H + CELL * 0.3;
    /* TL, TR, BR, BL — a QR always occupies 3 of these 4; which one is
       empty depends on how many quarter-turns it's rotated. */
    const CORNERS: [number, number][] = [
      [0, 0],
      [n - 7, 0],
      [n - 7, n - 7],
      [0, n - 7],
    ];
    const cornerBoxes = (steps: number) =>
      CORNERS.filter((_, i) => i !== (2 + steps) % 4).map(([c, r]) => {
        const x0 = px(c) - PAD;
        const y0 = py(r) - PAD;
        const x1 = px(c) + 6 * CELL + BOX + PAD;
        const y1 = py(r) + 6 * CELL + BOX + PAD;
        return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, hx: (x1 - x0) / 2, hy: (y1 - y0) / 2 };
      });
    /* exclusion zone for data modules: union of the finders' current corners
       and the corners they're rotating into, recomputed per build(). */
    let BOXES = cornerBoxes(0);
    const isFree = (x: number, y: number) =>
      !BOXES.some((b) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1);

    let EX = 0;
    let EY = 0;
    const evict = (x: number, y: number) => {
      for (const b of BOXES) {
        if (x <= b.x0 || x >= b.x1 || y <= b.y0 || y >= b.y1) continue;
        let dx = x - b.cx;
        const dy = y - b.cy;
        if (dx === 0 && dy === 0) dx = 1e-3;
        const k = Math.min(b.hx / Math.max(Math.abs(dx), 1e-6), b.hy / Math.max(Math.abs(dy), 1e-6));
        x = b.cx + dx * k;
        y = b.cy + dy * k;
      }
      EX = clampC(x);
      EY = clampC(y);
    };

    const LO = BOX * 0.7;
    const HI = SZ - BOX * 0.7;
    const anchor = (ox: number, oy: number): [number, number] => {
      for (let k = 0; k < 60; k++) {
        const a = rnd() * 6.283;
        const r = CELL * (2.4 + rnd() * 5.2);
        const x = ox + Math.cos(a) * r;
        const y = oy + Math.sin(a) * r;
        if (x < LO || x > HI || y < LO || y > HI || !isFree(x, y)) continue;
        return [x, y];
      }
      for (let k = 0; k < 60; k++) {
        const x = LO + rnd() * (HI - LO);
        const y = LO + rnd() * (HI - LO);
        if (isFree(x, y)) return [x, y];
      }
      return [ox, oy];
    };

    const mid = (n - 1) / 2;
    const maxR = Math.hypot(mid, mid);

    /* 90°-CW grid-index rotation: a QR rotated like this is still a valid,
       scannable code — finder detection is orientation-agnostic. */
    const rotateMod = (m: Mod, steps: number): Mod => {
      let c = m.c;
      let r = m.r;
      for (let k = 0; k < steps; k++) {
        const nc = n - 1 - r;
        const nr = c;
        c = nc;
        r = nr;
      }
      return { c, r, fin: m.fin };
    };
    const rotateGrid = (grid: Mod[], steps: number) => grid.map((m) => rotateMod(m, steps));

    let qi = 0;
    let phase: "hold" | "out" | "swarm" | "in" = "hold";
    let pt = 0;
    let rotationSteps = 0;
    let fly: Fly[] = [];

    const bend = () => (rnd() < 0.5 ? -1 : 1) * CELL * (1.8 + rnd() * 5.4);
    /* one module's full out→swarm→in flight descriptor, from its current
       cell (a) to its next one (b) — finders ride the exact same erratic
       bezier+swarm dance as data, just rendered gold the whole way and
       landing on the ROTATED corner instead of a canonical one. */
    const makeFly = (a: Mod, b: Mod, finder: boolean): Fly => {
      const ax = px(a.c) + H;
      const ay = py(a.r) + H;
      const [hx, hy] = anchor(ax, ay);
      const rA = Math.hypot(a.c - mid, a.r - mid) / maxR;
      const rB = Math.hypot(b.c - mid, b.r - mid) / maxR;
      const dOut = ((1 - rA) * 0.45 + rnd() * 0.55) * 0.42 * DUR.out;
      const dIn = (rB * 0.45 + rnd() * 0.55) * 0.42 * DUR.in;
      return {
        ax, ay, bx: px(b.c) + H, by: py(b.r) + H,
        hx, hy, c1: bend(), c2: bend(),
        w1: 1.2 + rnd() * 2, w2: 1.2 + rnd() * 2,
        w3: 0.25 + rnd() * 0.55, w4: 0.25 + rnd() * 0.55,
        p1: rnd() * 6.283, p2: rnd() * 6.283, p3: rnd() * 6.283, p4: rnd() * 6.283,
        A1: CELL * (0.18 + rnd() * 0.57), A2: CELL * (0.18 + rnd() * 0.57),
        A3: CELL * (0.5 + rnd() * 1.2), A4: CELL * (0.5 + rnd() * 1.2),
        dOut, kOut: (DUR.out - dOut) * (0.7 + rnd() * 0.3),
        dIn, kIn: (DUR.in - dIn) * (0.7 + rnd() * 0.3),
        ghostA: false, ghostB: false, finder,
      };
    };

    const build = () => {
      seed = 131 + qi * 17;
      const stepsA = rotationSteps;
      const stepsB = (rotationSteps + 1) % 4;
      const A = rotateGrid(grids[qi], stepsA);
      const B = rotateGrid(grids[(qi + 1) % 2], stepsB);
      BOXES = [...cornerBoxes(stepsA), ...cornerBoxes(stepsB)];

      /* finders occupy the same 49 coordinates in any QR of this size, so
         pairing A's and B's finder lists by plain index always matches the
         same physical slot — no ghosts needed, counts are always equal. */
      const finA = A.filter((m) => m.fin);
      const finB = B.filter((m) => m.fin);
      fly = finA.map((a, i) => makeFly(a, finB[i], true));

      const ang = (m: Mod) => Math.atan2(m.r - mid, m.c - mid);
      const da = A.filter((m) => !m.fin).sort((a, b) => ang(a) - ang(b));
      const db = B.filter((m) => !m.fin).sort((a, b) => ang(a) - ang(b));
      const total = Math.max(da.length, db.length);
      for (let i = 0; i < total; i++) {
        const f = makeFly(da[i % da.length], db[i % db.length], false);
        f.ghostA = i >= da.length;
        f.ghostB = i >= db.length;
        fly.push(f);
      }
    };
    build();
    setLink(qi);

    let AX = 0;
    let AY = 0;
    const swarmAt = (f: Fly, tt: number, k: number) => {
      AX = f.hx + (f.A1 * Math.sin(tt * f.w1 + f.p1) + f.A3 * Math.sin(tt * f.w3 + f.p3)) * k;
      AY = f.hy + (f.A2 * Math.sin(tt * f.w2 + f.p2) + f.A4 * Math.sin(tt * f.w4 + f.p4)) * k;
    };
    const bez = (p0: number, c: number, p1: number, t: number) => {
      const u = 1 - t;
      return u * u * p0 + 2 * u * t * c + t * t * p1;
    };

    let raf = 0;
    let last = performance.now();
    let tt = 0;

    (window as unknown as { __qr?: () => object; __qrStep?: (now: number) => void }).__qr = () => ({
      phase,
      pt: +pt.toFixed(2),
      qi,
      tt: +tt.toFixed(2),
    });
    (window as unknown as { __qrStep?: (now: number) => void }).__qrStep = (now: number) => frame(now);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      tt += dt;
      pt += dt;

      if (pt >= DUR[phase]) {
        pt -= DUR[phase];
        phase = phase === "hold" ? "out" : phase === "out" ? "swarm" : phase === "swarm" ? "in" : "hold";
        if (phase === "hold") {
          qi = (qi + 1) % 2;
          rotationSteps = (rotationSteps + 1) % 4;
          build();
          setLink(qi);
        }
      }

      const still = phase === "hold";
      clear(still ? 1 : 0.32);

      for (const f of fly) {
        if (still) {
          if (!f.ghostA) mod(f.ax - H, f.ay - H, 1, f.finder ? ACCENT : CREAM, 1);
          continue;
        }
        let x: number;
        let y: number;
        let s: number;
        let tone = 0;
        let al = 1;
        if (phase === "out") {
          const e = outQuint(clamp01((pt - f.dOut) / f.kOut));
          swarmAt(f, tt, e);
          if (f.ghostA) {
            x = AX; y = AY; s = 0.62 * e; al = e;
          } else {
            const vx = AX - f.ax;
            const vy = AY - f.ay;
            const L = Math.hypot(vx, vy) || 1;
            x = bez(f.ax, (f.ax + AX) / 2 - (vy / L) * f.c1, AX, e);
            y = bez(f.ay, (f.ay + AY) / 2 + (vx / L) * f.c1, AY, e);
            s = 1 - 0.38 * e;
          }
          tone = e * 0.6;
        } else if (phase === "swarm") {
          swarmAt(f, tt, 1);
          x = AX; y = AY;
          s = 0.62 + 0.1 * Math.sin(tt * 2.4 + f.p1);
          tone = 0.6;
        } else {
          const e = smooth(clamp01((pt - f.dIn) / f.kIn));
          swarmAt(f, tt, 1 - e);
          const vx = f.bx - AX;
          const vy = f.by - AY;
          const L = Math.hypot(vx, vy) || 1;
          x = bez(AX, (AX + f.bx) / 2 - (vy / L) * f.c2, f.bx, e);
          y = bez(AY, (AY + f.by) / 2 + (vx / L) * f.c2, f.by, e);
          s = 0.62 + 0.38 * e;
          tone = 0.6 * (1 - e);
          if (f.ghostB) {
            al = 1 - e;
            s = 0.62 * (1 - e);
          }
        }
        if (f.finder) {
          EX = clampC(x);
          EY = clampC(y);
        } else {
          evict(x, y);
        }
        mod(EX - H, EY - H, s, f.finder ? ACCENT : warm(tone), al);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [n, grids]);

  return (
    <figure className="finder rise" style={{ "--d": "220ms" } as React.CSSProperties}>
      <a
        ref={linkRef}
        className="finder-canvas-link"
        href={URL_A}
        target="_blank"
        rel="noreferrer"
        aria-label="Scan or open this QaRt link"
      >
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
      </a>
      <figcaption className="finder-caption">Real QR, feel free to scan.</figcaption>
    </figure>
  );
}
