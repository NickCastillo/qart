# qr-world — QaRt

## Primary project

This repo root (`/Users/nick/Code/qart`) *is* the Vite + React app — `src/`, `public/`,
`index.html`, `package.json`, etc. all live here directly (there is no nested `qart/`
subfolder anymore; it was flattened into the repo root). Always implement and edit here.

`index2.html` is a legacy pre-React static mirror; don't touch it unless explicitly asked
to sync, and never treat it as the thing being shipped. Its relative `3d/*.html` links are
stale (that local `3d/` folder was removed as a duplicate of `public/3d/`) — leave that as
is unless asked to fix it.

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
