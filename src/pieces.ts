export interface Piece {
  id: string;
  src: string;
  name: string;
  tag: string;
  /* piece's own HTML renders full site chrome (nav, back link) already —
     skip the generic Piece wrapper's "← HOME" bar to avoid stacking two navs */
  ownChrome?: boolean;
}

/* every standalone 3D piece — still reachable at #/p/<id> even if a piece
   (Beatles Codes, the old 3D Pixels v2 set) has no entry point in the
   current nav per the I5uBO6/wbMwE redesign. */
export const PIECES: Record<string, Piece> = {
  /* the four living scenes share ONE page (studio.html + src/studio/) so
     switching scenes morphs inside the same canvas instead of reloading;
     the old standalone /3d/*3d-v3.html files are kept as legacy */
  arbol: {
    id: "arbol",
    src: "/studio.html?scene=arbol",
    name: "Tree",
    tag: "LIVING SCENE",
    ownChrome: true,
  },
  nube: {
    id: "nube",
    src: "/studio.html?scene=nube",
    name: "Cloud",
    tag: "LIVING SCENE",
    ownChrome: true,
  },
  panal: {
    id: "panal",
    src: "/studio.html?scene=panal",
    name: "Hive",
    tag: "LIVING SCENE",
    ownChrome: true,
  },
  cigarro: {
    id: "cigarro",
    src: "/studio.html?scene=cigarro",
    name: "Cigar",
    tag: "LIVING SCENE",
    ownChrome: true,
  },
  constelacion: {
    id: "constelacion",
    src: "/3d/constelacion.html",
    name: "Constellation",
    tag: "BLOCK SCULPTURE",
    ownChrome: true,
  },
  perro: {
    id: "perro",
    src: "/3d/perroqr3d.html",
    name: "Dog",
    tag: "BEATLES CODE",
  },
  logo: {
    id: "logo",
    src: "/3d/qart3d.html",
    name: "QaRt wordmark",
    tag: "BEATLES CODE",
  },
  cafe: {
    id: "cafe",
    src: "/3d/cafe3d.html",
    name: "Coffee",
    tag: "BEATLES CODE",
  },
  react: {
    id: "react",
    src: "/3d/react3d.html",
    name: "React",
    tag: "BEATLES CODE",
  },
};

/* 7×6 pixel glyphs for the Living Scene Studio index row */
export const GLYPHS: Record<string, string[]> = {
  nube: ["..###..", ".#####.", "#######", ".......", "#.#.#.#", ".#.#.#."],
  arbol: ["..###..", ".#####.", "#######", "...#...", "...#...", "..###.."],
  panal: ["##.##..", "##.##..", ".......", ".##.##.", ".##.##.", "......."],
  cigarro: ["...#...", "....#..", ".......", "#######", "#######", ".....#."],
};

export interface IndexProject {
  number: string;
  name: string;
  meta: string;
  description: string;
  linkLabel: string;
  href?: string;
  scenes?: { id: string; label: string; sceneLabel: string }[];
  states?: { src: string; alt: string }[];
  /* live canvas art in the states slot (see StateAnims.tsx); the hint chip
     position matches where the comp placed it inside the drawing */
  anim?: { kind: "constelacion" | "qretro"; hint: "tl" | "br" };
}

/* the landing's 3-project Índice (node I5uBO6) */
export const PROJECTS: IndexProject[] = [
  {
    number: "01",
    name: "Living Scene Studio",
    meta: "STUDIO · 4 SCENES",
    description:
      "Cloud, Tree, Hive and Cigar: whatever falls in each scene ends up forming the code.",
    linkLabel: "Open",
    href: "#/3d-pixels",
    scenes: [
      { id: "nube", label: "Cloud", sceneLabel: "SCENE 1 OF 4" },
      { id: "arbol", label: "Tree", sceneLabel: "SCENE 2 OF 4" },
      { id: "panal", label: "Hive", sceneLabel: "SCENE 3 OF 4" },
      { id: "cigarro", label: "Cigar", sceneLabel: "SCENE 4 OF 4" },
    ],
  },
  {
    number: "02",
    name: "Constellation",
    meta: "BLOCK SCULPTURE",
    description:
      "One cloud of blocks that reorders itself into a dog, a car, a coffee or React.",
    linkLabel: "Open",
    href: "#/p/constelacion",
    anim: { kind: "constelacion", hint: "br" },
  },
  {
    number: "03",
    name: "QRetro Games",
    meta: "2 GAMES · ANIMATION",
    description:
      "Two classics that build a QR: in Tetris the pieces fall into place, in Snake five snakes eat coins until they crash.",
    linkLabel: "Open",
    href: "#/qretro",
    anim: { kind: "qretro", hint: "tl" },
  },
];

export interface StudioScene {
  number: string;
  id: string;
  name: string;
  meta: string;
  description: string;
  escenaSrc: string;
  qrSrc: string;
}

/* the "3D Pixels" studio sub-page (node wbMwE) — same 4 living scenes,
   new branding. escena/qr are real rendered stills (photo placeholders
   per the brief); the live scene itself is at #/p/<id>. */
export const STUDIO_SCENES: StudioScene[] = [
  {
    number: "01",
    id: "nube",
    name: "Cloud",
    meta: "FLOOR · CLOUD",
    description:
      "The damp patches are already part of the code. Show QR makes it rain, and the cloud waters the rest.",
    escenaSrc: "/images/nube-escena.png",
    qrSrc: "/images/nube-qr.png",
  },
  {
    number: "02",
    id: "arbol",
    name: "Tree",
    meta: "FLOOR · SEASON PALETTE",
    description:
      "Fallen leaves, dark grass and rocks sit on the dark modules. Show QR completes the code.",
    escenaSrc: "/images/arbol-escena.png",
    qrSrc: "/images/arbol-qr.png",
  },
  {
    number: "03",
    id: "panal",
    name: "Hive",
    meta: "FLOOR · HONEY",
    description:
      "The dried honey is already part of the code. Double-click shakes the hive; Show QR releases the swarm.",
    escenaSrc: "/images/panal-escena.png",
    qrSrc: "/images/panal-qr.png",
  },
  {
    number: "04",
    id: "cigarro",
    name: "Cigar",
    meta: "ASHTRAY · FILTER",
    description:
      "The old ash in the tray is part of the code. Double-click shakes the cigar; Show QR completes it.",
    escenaSrc: "/images/cigarro-escena.png",
    qrSrc: "/images/cigarro-qr.png",
  },
];
