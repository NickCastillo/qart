---
name: new-piece
description: End-to-end checklist for adding a NEW artwork/piece to QaRt — new public/3d/*.html file, QR grid generation, registry wiring in src/pieces.ts, landing integration, verification. Use when asked to add a new piece, scene, game (e.g. QRetro), or sculpture to the site.
---

# Adding a new QaRt piece

Load the `qart-piece` skill first (piece anatomy, invariants). If the piece has designed UI,
also load the three design skills mandated in CLAUDE.md. Pencil comps in `qr-designs.pen` are
the content/structure source when they exist for the piece.

## 1. Decide the shape

- **Which family** (or a new one): Beatles Code sculpture, Living Scene, or something new.
  Start from the closest existing piece as the structural reference — pieces are standalone
  by convention, so adapting a sibling file is correct, not a smell.
- **Confirm with the user**: the QR payload URL, the piece's working name/route key
  (Spanish key, English display name), and whether it appears on the landing or is only
  routable at `#/p/<id>`.

## 2. Generate the QR grid

Payload → grid using `qrcode-generator` (already a dependency). Scratch script (run with
`node scratch.mjs`, don't commit it):

```js
import qrcode from 'qrcode-generator';
const qr = qrcode(0, 'M');        // 0 = auto version; 25×25 = v2, 29×29 = v3
qr.addData('https://the-confirmed-payload');
qr.make();
const n = qr.getModuleCount();
for (let r = 0; r < n; r++)
  console.log('"' + Array.from({length: n}, (_, c) => qr.isDark(r, c) ? 'Q' : '.').join('') + '",');
```

Sanity-check the output: three `QQQQQQQ` finder corners, square grid. Embed as
`const QR = [ ... ];` rows exactly in that format.

## 3. Build the piece file

- New file `public/3d/<key>3d.html` (match sibling naming). Pin three@0.160.0 importmap.
- Unique `let seed = <n>` (don't reuse a sibling's seed).
- Ship the debug hooks: `__state()`, `__step(dt)`, `__fr` counter (contract in `qart-piece`).
- English copy; reduced-motion handling; `:focus-visible`; tokens per family.

## 4. Wire the registry (single source of metadata)

In `src/pieces.ts` only:
- Add to `PIECES` (id, src, name, tag; `ownChrome: true` only if the file renders full QaRt
  page chrome — otherwise the React stage bar frames it).
- Landing exposure, only if requested: `PROJECTS` entry (needs stills in `public/images/`,
  named `<key>-escena.png` / `<key>-qr.png` style) and/or `GLYPHS`/`STUDIO_SCENES` for a
  Living Scene. Glyphs are 7-wide pixel rows.
- Routes need no changes — `#/p/<id>` resolves from `PIECES` automatically.

## 5. Constellation integration — only on explicit request

Adding a figure to `constelacion.html` requires the FRONT+QR data contract AND changes the
4-column dock grid (`repeat(4,1fr)`) and the "4 FIGURES" copy. Treat it as its own task.

## 6. Verify before declaring done

1. `scene-verifier` agent: loads, resolves, QR mode reads as a crisp grid, framing clears
   the chrome, hooks respond.
2. `piece-reviewer` agent: invariants pass.
3. `npm run build` still passes (registry is TS-checked).
4. Recommend to the user a **real phone scan** of the QR view — automation can't prove
   scannability.
