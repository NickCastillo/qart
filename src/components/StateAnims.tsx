import { useEffect, useRef } from "react";

/* Live "at rest" art for the landing project cards, ported from the designer's
   hover prototype (qr-designs.pen node d7H0Uk → hover-prototipos.html).
   Both run on the page background so they sit frameless, and both answer the
   card's HOVER hint: QRetro only plays while hovered; Constellation assembles
   the dog on hover and morphs into the QR as the pointer moves right. */

const INK = "#0a0a0a";
const ACC = "#ff3d00";
const BG = "#eef0f3";
const DPR = 2;
const REDUCE = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const lcg = (s: number) => () => (s = (s * 16807) % 2147483647) / 2147483647;

/* ---------- QRetro: black tetrominoes, orange snake, small food ---------- */

const CS = 16, COLS = 53, ROWS = 13, QW = 855, QH = 208, OX = (QW - COLS * CS) / 2;
type Shape = [number, number][];
const ORI: Record<string, Shape[]> = {
  I: [[[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [0, 2], [0, 3]]],
  O: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
  T: [[[1, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [1, 0], [2, 0], [1, 1]], [[0, 0], [0, 1], [1, 1], [0, 2]]],
  S: [[[1, 0], [2, 0], [0, 1], [1, 1]], [[0, 0], [0, 1], [1, 1], [1, 2]]],
  Z: [[[0, 0], [1, 0], [1, 1], [2, 1]], [[1, 0], [0, 1], [1, 1], [0, 2]]],
  J: [[[0, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [1, 0], [2, 0], [2, 1]]],
  L: [[[2, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [1, 0], [2, 0], [0, 1]]],
};
const KEYS = Object.keys(ORI);

export function QRetroAnim() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    cv.width = QW * DPR;
    cv.height = QH * DPR;
    const ctx = cv.getContext("2d")!;
    ctx.scale(DPR, DPR);
    const reduce = REDUCE();

    const rq = lcg(7);
    const stack: boolean[][] = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
    const fits = (sh: Shape, x: number, y: number) =>
      sh.every(([a, b]) => { const c = x + a, r = y + b; return c >= 0 && c < COLS && r < ROWS && (r < 0 || !stack[r][c]); });
    for (let t = 0, n = 0; t < 900 && n < 34; t++) {
      const sh = ORI[KEYS[(rq() * 7) | 0]][0], w = Math.max(...sh.map((p) => p[0])) + 1, x = (rq() * (COLS - w + 1)) | 0;
      let y = 0;
      if (!fits(sh, x, 0)) continue;
      while (fits(sh, x, y + 1)) y++;
      if (sh.some(([, b]) => y + b < 9)) continue;
      sh.forEach(([a, b]) => { stack[y + b][x + a] = true; });
      n++;
    }
    const spawn = (x: number, y: number) => ({ sh: ORI[KEYS[(rq() * 7) | 0]][0], x, y });
    const falling = [spawn(4, 1), spawn(15, 0), spawn(27, 2), spawn(38, 0), spawn(47, 1)];
    const loop: [number, number][] = [];
    for (let c = 0; c < COLS; c++) loop.push([c, 5]);
    loop.push([COLS - 1, 6]);
    for (let c = COLS - 1; c >= 0; c--) loop.push([c, 7]);
    loop.push([0, 6]);
    const SN = 14;
    let head = 20;
    // -1 = never food, 0 = food waiting, 1 = eaten
    const food: number[] = loop.map((_, i) => (i > head && (i - head) % 2 === 0 ? 0 : -1));

    function stepPieces() {
      for (const p of falling) {
        if (fits(p.sh, p.x, p.y + 1)) { p.y++; continue; }
        p.sh.forEach(([a, b]) => { const r = p.y + b; if (r >= 0) stack[r][p.x + a] = true; });
        const w = Math.max(...p.sh.map((q) => q[0])) + 1;
        Object.assign(p, spawn((rq() * (COLS - w + 1)) | 0, -2));
      }
      while (stack.slice(0, 9).some((row) => row.some(Boolean))) { stack.pop(); stack.unshift(new Array(COLS).fill(false)); }
    }
    function stepSnake() {
      head = (head + 1) % loop.length;
      if (food[head] === 0) food[head] = 1;
      const back = (head - SN - 20 + loop.length) % loop.length;
      if (food[back] === 1) food[back] = 0;
      const ahead = (head + 24) % loop.length;
      if (food[ahead] === -1 && ahead % 2 === 0) food[ahead] = 0;
    }
    function draw() {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, QW, QH);
      ctx.strokeStyle = "rgba(10,10,10,.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let c = 1; c < COLS; c++) { ctx.moveTo(OX + c * CS + 0.5, 0); ctx.lineTo(OX + c * CS + 0.5, QH); }
      for (let r = 1; r < ROWS; r++) { ctx.moveTo(0, r * CS + 0.5); ctx.lineTo(QW, r * CS + 0.5); }
      ctx.stroke();
      const cell = (c: number, r: number, inset: number, col: string) => {
        ctx.fillStyle = col;
        ctx.fillRect(OX + c * CS + inset, r * CS + inset, CS - inset * 2, CS - inset * 2);
      };
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (stack[r][c]) cell(c, r, 1.5, INK);
      for (const p of falling) p.sh.forEach(([a, b]) => { if (p.y + b >= 0) cell(p.x + a, p.y + b, 1.5, INK); });
      loop.forEach(([c, r], i) => {
        if (food[i] === 0) { ctx.fillStyle = INK; ctx.fillRect(OX + c * CS + 5.5, r * CS + 5.5, 5, 5); }
      });
      for (let s = SN - 1; s >= 0; s--) {
        const [c, r] = loop[(head - s + loop.length) % loop.length];
        cell(c, r, s === 0 ? 0.5 : 2, ACC);
      }
      const [hc, hr] = loop[head], [nc, nr] = loop[(head + 1) % loop.length], dx = nc - hc, dy = nr - hr;
      const cx = OX + hc * CS + 8, cy = hr * CS + 8, px = -dy, py = dx;
      ctx.fillStyle = INK;
      for (const sgn of [-1, 1]) ctx.fillRect(cx + dx * 3 + px * 3.5 * sgn - 1.3, cy + dy * 3 + py * 3.5 * sgn - 1.3, 2.6, 2.6);
    }

    let hover = false, k = 0, sAcc = 0, qAcc = 0, idle = false;
    const row = (cv.closest(".project-row") as HTMLElement | null) ?? cv;
    const enter = () => { hover = true; };
    const leave = () => { hover = false; };
    row.addEventListener("pointerenter", enter);
    row.addEventListener("pointerleave", leave);

    let raf = 0, last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      k += ((hover ? 1 : 0) - k) * Math.min(1, dt * 6);
      let stepped = false;
      if (!reduce) {
        sAcc += dt * k * 14;
        while (sAcc >= 1) { sAcc--; stepSnake(); stepped = true; }
        qAcc += dt * k * 7;
        while (qAcc >= 1) { qAcc--; stepPieces(); stepped = true; }
      }
      // at rest the scene is a still — skip repainting it every frame
      if (k < 0.001 && !stepped) {
        if (idle) return;
        idle = true;
      } else idle = false;
      draw();
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      row.removeEventListener("pointerenter", enter);
      row.removeEventListener("pointerleave", leave);
    };
  }, []);
  return <canvas ref={ref} style={{ width: "100%", height: "auto", maxWidth: 1028 }} aria-hidden="true" />;
}

/* ---- Constellation: loose pixels that assemble the dog, pointer morphs the QR ---- */

const DOG = ["......##......................................####", ".....####....................................####.", ".....#####..................................####..", "....#######................................####...", "...########...............................####....", "..##########..............................###.....", "..###########............................####.....", "..####..#####............................###......", "######..#####...........................####......", "##############..........................###.......", "##############..........................###.......", ".##############........................####.......", "..###############.....................#####.......", "...#########################################......", ".....#######################################......", "......#####################################.......", ".......####################################.......", ".......####################################.......", ".......####################################.......", ".......####################################.......", ".......####################################.......", "........###################################.......", "........###################################.......", "........############............###########.......", "........#####..#####.............#####.#####......", ".........####...####..............####..####......", ".........####...####..............####..####......", ".........####...####..............####..####......", ".........####...####..............####..####......", ".........####...####..............####..####......", "........#####..#####.............#####.#####......", ".......######.######............############......"];
const PQ = ["QQQQQQQ...Q.......QQQQQQQ", "Q.....Q.QQQ...QQ..Q.....Q", "Q.QQQ.Q.Q.....QQ..Q.QQQ.Q", "Q.QQQ.Q..Q....Q...Q.QQQ.Q", "Q.QQQ.Q.QQQ.QQQQ..Q.QQQ.Q", "Q.....Q.Q.Q.QQ.QQ.Q.....Q", "QQQQQQQ.Q.Q.Q.Q.Q.QQQQQQQ", "........Q.QQ..QQ.........", "QQ.Q..QQ.....QQ.Q.QQQ.QQ.", "..QQ....QQ.QQ...QQQ.....Q", "Q...Q.QQ.....Q...Q..Q..QQ", "Q....Q.QQQQ.QQQ..QQQ.....", "Q..QQQQ...Q.Q...QQQQ.Q.QQ", ".QQ..Q.Q.Q..Q.....QQ.QQ.Q", "Q.QQQ.Q.Q.QQQ.Q.Q.QQQ.Q.Q", ".Q..Q...Q...QQ..Q...Q..Q.", "QQ...QQQ.Q..Q..QQQQQQQQ..", "........QQQ.QQ.QQ...QQ..Q", "QQQQQQQ.QQ...QQQQ.Q.QQ.QQ", "Q.....Q...QQ...QQ...QQQQ.", "Q.QQQ.Q..Q.QQ.Q.QQQQQQ...", "Q.QQQ.Q.Q...Q.Q....QQQQ..", "Q.QQQ.Q..QQ...QQ.Q.QQ.Q.Q", "Q.....Q.QQQ..QQ.QQ...Q...", "QQQQQQQ.QQ...QQQQ.QQ...QQ"];

const CW = 542, CH = 250, CX = 271, CY = 120;

export function ConstelAnim() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    cv.width = CW * DPR;
    cv.height = CH * DPR;
    const ctx = cv.getContext("2d")!;
    ctx.scale(DPR, DPR);
    const reduce = REDUCE();

    const rc = lcg(13);
    const dogCells: [number, number][] = [], qrCells: [number, number][] = [];
    DOG.forEach((row, r) => { for (let c = 0; c < 50; c++) if (row[c] === "#") dogCells.push([CX + (c - 24.5) * 6, CY + (r - 15.5) * 6]); });
    PQ.forEach((row, r) => { for (let c = 0; c < 25; c++) if (row[c] === "Q") qrCells.push([CX - 100 + c * 8 + 4, CY + 5 - 100 + r * 8 + 4]); });
    for (let i = dogCells.length - 1; i > 0; i--) { const j = (rc() * (i + 1)) | 0; [dogCells[i], dogCells[j]] = [dogCells[j], dogCells[i]]; }
    const dogT = dogCells.slice(0, qrCells.length).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const qrT = qrCells.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const pts = dogT.map((d, i) => ({ dx: d[0], dy: d[1], qx: qrT[i][0], qy: qrT[i][1], z: (rc() - 0.5) * 260, a: (rc() - 0.5) * 1.6, ph: rc() * 6.28, sp: 0.6 + rc() * 0.7, acc: rc() < 0.14 }));

    let hover = false, k = 0, q = 0, px = 0, tC = 0;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const sm = (t: number) => t * t * (3 - 2 * t);
    const row = (cv.closest(".project-row") as HTMLElement | null) ?? cv;
    const trackX = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      px = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    };
    const enter = (e: PointerEvent) => { hover = true; trackX(e); };
    const leave = () => { hover = false; };
    row.addEventListener("pointerenter", enter);
    row.addEventListener("pointermove", trackX);
    row.addEventListener("pointerleave", leave);

    function draw() {
      const e1 = sm(k), e2 = sm(q);
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, CW, CH);
      const yaw = (1 - e1) * 1.15, cs = Math.cos(yaw), sn = Math.sin(yaw);
      const list = e1 < 0.999 && e2 < 0.001
        ? pts.slice().sort((a, b) => ((b.dx - CX) * sn + b.z * cs) - ((a.dx - CX) * sn + a.z * cs))
        : pts;
      for (const p of list) {
        const loose = (1 - e1) * (1 - e2);
        const xa = CX + (p.dx - CX) * cs - p.z * sn, ya = p.dy + Math.sin(tC * p.sp + p.ph) * 5 * loose;
        const x = lerp(xa, p.qx, e2), y = lerp(ya, p.qy, e2);
        const s = lerp(lerp(5.8, 4.6, e1), 7, e2), ang = p.a * loose;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.fillStyle = p.acc && e2 < 0.5 ? ACC : INK;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      }
    }

    let raf = 0, last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      k += ((hover ? 1 : 0) - k) * Math.min(1, dt * (reduce ? 60 : 3));
      const qTarget = hover ? Math.max(0, Math.min(1, (px - 0.3) / 0.4)) : 0;
      q += (qTarget - q) * Math.min(1, dt * (reduce ? 60 : 4));
      if (!reduce) tC += dt;
      draw();
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      row.removeEventListener("pointerenter", enter);
      row.removeEventListener("pointermove", trackX);
      row.removeEventListener("pointerleave", leave);
    };
  }, []);
  return <canvas ref={ref} style={{ width: "100%", height: "auto", maxWidth: 542 }} aria-hidden="true" />;
}
