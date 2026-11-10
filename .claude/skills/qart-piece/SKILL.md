---
name: qart-piece
description: Domain knowledge for building or editing any 3D piece in public/3d/ (Beatles Codes, Living Scenes, Constellation) — piece anatomy, camera math, QR integrity rules, seeded-RNG discipline, debug hooks. Load BEFORE touching any public/3d/*.html file, fixing a camera/framing issue, changing a QR grid, or tuning a scene.
---

# QaRt 3D piece conventions

Every piece is a **standalone, self-contained HTML file** in `public/3d/`, served inside an
iframe at `#/p/<id>` (see `src/pieces.ts`). Pieces have no build step and no React. Duplication
of boilerplate ACROSS pieces is the convention, not a defect — never extract shared JS/CSS into
a common file.

## The three families

| Family | Where | Camera | QR grid | Shape |
|---|---|---|---|---|
| Beatles Codes | `public/3d/`: `perroqr3d`, `qart3d`, `cafe3d`, `react3d` (standalone HTML) | **fov 9** telephoto, `place(polar, azi, dist)`, Front `(90,0,~190)` / Top `(0.6,0,~260)` views | 25×25, `const QR = [` rows of `Q`/`.` | voxel sculpture: `const FRONT = [` (50-wide `#`/`.` drawing) × QR depth |
| Living Scenes (the **studio**) | `studio.html` + `src/studio/` — TS engine (`main.ts`, renderer/camera/controls/panel/travel) + one module per scene (`scenes/{nube,arbol,panal,cigarro}.ts`), three@0.160.0 from npm | fov 42, close scene | 25×25 (arbol 29×29) | scene objects living on a QR floor; "Show QR" completes the code; switching scenes morphs through the cloud in ONE canvas, no reload |
| Constellation | `public/3d/constelacion.html` (standalone HTML) | fov 9 telephoto, full QaRt page chrome | reuses Beatles data | one block cloud morphing between the four Beatles figures |

Studio scene modules implement the `StudioScene` contract in `src/studio/types.ts`
(factory `create(api)`; the engine owns render/tween/panel, the scene owns its seeded
build, mode machine and per-frame step). `npm run build` type-checks them (strict TS).
`*-v2.html` AND the standalone `*3d-v3.html` pages are the legacy generations — kept
served, never edit unless asked. `index2.html` at repo root is a legacy static mirror —
same rule.

## Critical invariants (break these and pieces fail silently)

1. **Constellation scrape contract**: `constelacion.html` fetches the four Beatles files and
   regex-extracts their data with `const QR = \[` / `const FRONT = \[`. In those four files,
   never rename those consts, change the `const NAME = [` formatting, or alter row string
   format (`Q`/`.` for QR, `#`/`.` for FRONT, FRONT rows 50 chars).
2. **QR scannability**: the three 7×7 finder squares stay solid dark (no accent sprinkle —
   see `isFinderCell` exclusion in constelacion); dark modules keep scanning contrast (dark
   accent tints allowed, light ones not); QR-mode flattening must produce grid-aligned,
   gap-closed modules. Never change a QR payload URL without explicit user approval —
   changing the payload means regenerating the whole grid.
3. **Seeded RNG order**: every piece uses a Lehmer LCG (`seed = (seed * 16807) % 2147483647`)
   and consumes `rnd()` in a fixed order. Inserting, removing, or reordering `rnd()` calls
   reshuffles every layout generated after that point. Changing constants inside existing
   calls is safe; changing the call count/order is a layout change — do it knowingly. Each
   piece has its own `let seed = <n>`; give a new piece its own seed.
4. **three pinned at 0.160.0** via the unpkg importmap, identical in all 13 pieces. Don't
   bump one piece alone.

## Camera physics (hard-won — don't relearn this)

- The block clouds are ~15 units deep. A wide lens up close (e.g. fov 30 at dist ~40) smears
  them with perspective parallax and a sculpture **never resolves, even face-on**. Sculpture
  pieces use a near-telephoto (fov 9) from far (~130–260) so the projection is near-orthographic.
- A FRONT-drawn figure only resolves **dead-on** (azimuth 0): at angle θ, depth smears
  sideways by ±(depth/2)·sinθ — several block-widths by ~6°. Keep idle sway arcs small.
- Full-chrome pieces (constelacion): the fixed bars (nav + header top, dock + footer bottom)
  eat a large fraction of the window. Fit math must target the **visible band**, not the full
  frustum (`bandFrac` pattern in constelacion), and compute distance per figure AND per
  viewport (aspect + band), never hardcode it.
- Fit distance = max(height-fit, width-fit/aspect); account for on-screen rotation (camera
  `up` roll rotates the QR's bounding box — use the rotated extents).

## Shared piece anatomy

- **Design tokens** (full-chrome pieces): `--bg:#EEF0F3; --ink:#0A0A0A; --acc:#FF3D00;
  --dim:#5C6066`; fonts Schibsted Grotesk (UI) + Geist Mono (meta/labels), loaded from Google
  Fonts. Stage-framed pieces (Living Scenes, Beatles) keep minimal chrome — the React shell
  provides the bar (see `ownChrome` in `src/pieces.ts`).
- **Debug hooks contract** — every piece MUST expose on `window`:
  - `__state()` → small JSON of mode/counters/frames (all 13 pieces have it),
  - `__step(dt)` → advance simulation + render one frame deterministically (needed because
    background-tab rAF throttling stalls animation during automated verification),
  - frame counter `__fr`, incremented in the rAF loop; `sizeViewport()` every 32 frames
    (`(window.__fr & 31) === 0`).
  Camera pieces also expose `__cam()`; constelacion adds `__figs`, `__selectFig`, `__setViewMode`.
  Never delete these hooks; add them to new pieces.
- **Motion/a11y**: respect `prefers-reduced-motion` (CSS `*{transition:none!important}` +
  disable auto-rotation); `:focus-visible` outlines in accent; `aria-pressed` on toggle buttons;
  tween pattern: ease (`easeOutQuint`/`smooth`) over ~1s, `tween = null` when done.
- **Copy**: all user-visible strings in English (translate Pencil comps at implementation
  time); identifiers/route keys stay Spanish (`arbol`, `panal`, …). Hint lines are lowercase,
  mono labels UPPERCASE — match the piece you're editing.

## After editing

1. Verify visually via the **scene-verifier** agent (it knows the dev-server + `__step`
   workflow) — don't burn main-context tokens on screenshots yourself.
2. For non-trivial edits, have the **piece-reviewer** agent check invariants.
3. If you touched piece metadata, it lives ONLY in `src/pieces.ts` — never duplicate it.
