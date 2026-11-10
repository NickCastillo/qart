# qr-world — QaRt

QaRt is a creative portfolio of **QR code art** — interactive three.js scenes and sculptures
where the artwork and a scannable QR code are the same object. A small React shell frames
standalone 3D pieces; "for fun", but the QR codes must actually scan.

## Primary project

This repo root (`/Users/nick/Code/qart`) _is_ the Vite + React app — `src/`, `public/`,
`index.html`, `package.json`, etc. all live here directly (there is no nested `qart/`
subfolder anymore; it was flattened into the repo root). Always implement and edit here.

`index2.html` is a legacy pre-React static mirror; don't touch it unless explicitly asked
to sync, and never treat it as the thing being shipped. Its relative `3d/*.html` links are
stale (that local `3d/` folder was removed as a duplicate of `public/3d/`) — leave that as
is unless asked to fix it.

## Architecture map

- **Stack**: Vite 7 + React 19 + TypeScript (strict, `noUnusedLocals`). Deps: `lucide-react`,
  `qrcode-generator`. No backend, no database, no tests, no linter, no CI. `npm run dev`
  (port 5173) / `npm run build` (`tsc -b && vite build`).
- **Shell** (`src/`, ~2k lines): hash routing in `App.tsx` (`#/p/<id>` → piece iframe,
  `#/3d-pixels` → studio page, else landing). All piece/project/scene metadata lives ONLY in
  `src/pieces.ts` (`PIECES`, `PROJECTS`, `STUDIO_SCENES`, `GLYPHS`). `Finder.tsx` is the hero
  QR animation (generates a real QR from payload URLs with `qrcode-generator`).
- **Pieces**: three families. *Beatles Codes* sculptures and *Constellation* are standalone
  three.js HTML files in `public/3d/` (importmap-pinned three@0.160.0, no build step), shown
  in iframes. The *Living Scenes* live together in the **studio**: `studio.html` (Vite MPA
  entry) + `src/studio/` (TS engine + one module per scene, three@0.160.0 from npm), ONE
  WebGL canvas, scene switching morphs in-page via the cloud with no reload. The old
  `/3d/*3d-v2.html` and `/3d/*3d-v3.html` standalone pages are legacy (served, not linked).
  Full anatomy and conventions: load the **`qart-piece` skill**.
- **Design source**: Pencil comps in `qr-designs.pen` (read only via Pencil MCP tools,
  never Read/Grep — the file is encrypted).

## Critical invariants — never change without explicit user approval

1. **QR payloads and grids**: changing what a QR encodes, or hand-editing grid rows.
2. **Constellation scrape contract**: `constelacion.html` regex-scrapes
   `const QR = [` / `const FRONT = [` from `perroqr3d/qart3d/cafe3d/react3d.html` at runtime.
   Those consts' names, formatting, and row formats are load-bearing across files.
3. **Finder squares stay solid dark** in every QR rendering (scannability).
4. **Seeded RNG call order** inside a piece or studio scene module: adding/removing/
   reordering `rnd()` calls silently reshuffles layouts. Do it only as a deliberate
   layout change.
5. **three@0.160.0** everywhere — the importmap in standalone pieces AND the pinned npm
   dependency used by the studio. Never bump one alone.
6. `index2.html`, `*-v2.html` and the standalone `*3d-v3.html` pages are legacy — edit
   only on explicit request (the live Living Scenes are `src/studio/scenes/*.ts`).
7. Commits/pushes only when asked.

## Design skills — load before designing

Before writing or editing any visible UI (new sections, redesigns, component styling,
layout/motion changes), load all three:

- `design-taste-frontend` (Taste)
- `impeccable`
- `emil-design-eng` (Emil Kowalski's polish/motion/detail philosophy)

Pencil comps in `qr-designs.pen` are the content/structure/copy source — they are not a
license to skip these skills' bar on hierarchy, restraint, and interaction detail.

## Language

All qart UI copy ships in **English**, always — even when the Pencil source has Spanish
labels/copy. Translate at implementation time; don't mirror the comp's language verbatim.
Internal identifiers (route keys like `arbol`/`panal`/`cigarro`, file names, CSS classes)
stay as-is — only user-visible strings get translated. Only switch language on explicit
request.

## Specialized agents & skills — who does what

| Task | Use |
|---|---|
| Edit/fix any `public/3d/*.html` piece | load **`qart-piece` skill** first, work in main thread |
| Add a brand-new piece/artwork | load **`new-piece` skill** (it chains `qart-piece`) |
| Verify a visual/behavioral claim in the browser | **`scene-verifier` agent** (keeps screenshots out of main context) |
| Check invariants after a non-trivial piece/registry change | **`piece-reviewer` agent** |
| Shell/React UI work | main thread + the three design skills above |
| Generic bug-hunting review | `/code-review` (piece-reviewer is invariants-only) |

**Coordination rules**
- Implement in the main thread; delegate *verification* and *review*, not creation.
- After a piece change: `scene-verifier` and `piece-reviewer` are independent — run them in
  parallel. Act on their reports only after checking each finding against the code yourself;
  neither agent's word is final.
- Sequential when dependent: implement → verify → fix → re-verify only what changed.
- Trivial edits (copy tweak, constant tune) don't need either agent — one targeted check
  in the main thread is enough. Don't delegate for the sake of it.
- Agents never edit code: `scene-verifier` and `piece-reviewer` report; the main thread fixes.
- Needs user approval first: anything under *Critical invariants*, adding dependencies,
  changing the piece dock/landing structure, deleting files.

## Verification workflow (pieces)

Dev server on 5173 (`lsof -nP -iTCP:5173 -sTCP:LISTEN` before starting another). Pieces at
`/3d/<file>.html`, shell at `/#/...`. In background tabs rAF is throttled — drive animation
deterministically via each piece's `window.__step(dt)` loop instead of waiting; read state via
`__state()`/`__cam()`. Screenshots only for genuinely visual judgments. Real-phone scan is the
only true scannability test — recommend it after QR-affecting changes.

## Token-efficiency rules

- Read Pencil nodes with a `Get(id, visitor, {depth: N})` that prints compact one-line
  rows (name/fontSize/fill), not full JSON subtree dumps.
- Piece metadata (name, tag, src, description) lives only in `src/pieces.ts` —
  extend that registry; never hardcode duplicate piece data inside components.
- Check `public/3d/` before copying `3d/*.html` piece files into it — don't re-copy
  what's already there.
- Skip canvas/browser screenshots unless verifying a specific visual claim; prefer
  `javascript_tool` DOM/console checks, which are far cheaper than image captures.
- After Write/Edit, don't paste the file back — the tool call confirms success.
- Prefer `Edit` over `Write` for existing files; reserve `Write` for new files or full
  rewrites.
