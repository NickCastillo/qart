# QaRt — QR code art

**Live at → [qart.nicolas-castillosaez.workers.dev](https://qart.nicolas-castillosaez.workers.dev/)**

QaRt is a small creative playground where **the artwork and a scannable QR code are the same
object**. Interactive three.js scenes, sculptures and tiny games that look like art first —
until you point your phone at them and they actually scan.

Made just for fun in my free time, and very much an **ongoing project**: new pieces and
ideas get added whenever one is fun enough to build.

## The pieces

| Piece                   | What it does                                                                                                                                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Living Scene Studio** | Four scenes — _Cloud_, _Tree_, _Hive_, _Cigar_ — sharing one WebGL canvas. Whatever falls or grows in each scene (rain stains, leaves, honey, ash) ends up forming the dark modules of the code. Switching scenes morphs in-page, no reload. |
| **Constellation**       | A cloud of floating blocks that reorders itself into a dog, a coffee, the React logo… each arrangement a working QR sculpture.                                                                                                               |
| **QRetro Games**        | Two classics that _build_ a QR as they play: Tetris pieces fall into place as modules, and five snakes eat coins until they crash into the finished code.                                                                                    |

Every piece encodes a real payload. The non-negotiable rule of the whole project: **it has
to scan**. (The game animations are stylized builds; the final QR views are the actual scan
surfaces.)

## How it's built

- **Vite 7 + React 19 + TypeScript (strict)** for the shell — hash routing, a piece
  registry, and a hero component that generates its QR live with `qrcode-generator`.
- **three.js 0.160** for the 3D work: standalone importmap pieces (no build step) and a
  TypeScript studio engine where the four living scenes share a single canvas.
- **Seeded RNG everywhere** so every "random" scene is deterministic and reproducible —
  layouts are stable across reloads and across the files that scrape them.
- **No backend, no database.** Static build deployed on **Cloudflare Workers**.

## Built with AI, designed by a human in the loop

All the ideas here are my own — the process of building them is where it gets interesting.
Most of the code was written with AI agents (Claude Code), with me acting as a very
hands-on human in the loop: art direction and QR layout decisions.

The repo ships its own custom agents to keep that workflow honest:

- `scene-verifier` — drives a real browser against the dev server and checks visual and
  behavioral claims (framing, QR crispness, scene transitions) using deterministic debug
  hooks (`window.__step(dt)`) baked into every piece, instead of flaky screenshot-waiting.
- `piece-reviewer` — a read-only **QR health** reviewer that audits every non-trivial
  change against the project's invariants: payload integrity, solid finder squares,
  seeded-RNG call order, and the cross-file contracts between pieces.

The final scannability test is still the oldest tool there is: pointing an actual phone at
the screen.

## Running locally

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # tsc -b && vite build → dist/
```

## Credits & license

Everything here is **MIT-licensed and free to use** — if you build something with it,
credit is appreciated. The _Tree_ scene was inspired by the work of **Abdou Yaackoubi**.

Made for fun by [Nicolás Castillo](https://www.linkedin.com/in/nicolas-castillo-saez/).
