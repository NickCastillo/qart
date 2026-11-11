import { ArrowLeft } from "lucide-react";
import { Nav } from "./Nav.tsx";
import { Footer } from "./Footer.tsx";

const GAMES = [
  {
    num: "01",
    name: "Tetris",
    src: "/qretro/tetris-qr.html",
    description:
      "Real tetrominoes, many at a time and fast, until the QR is built. At the end, a line clear.",
  },
  {
    num: "02",
    name: "Snake",
    src: "/qretro/snake-qr.html",
    description:
      "Five snakes eat the coins and crash into a finder. That's where the code stays.",
  },
];

const STATS = [
  { value: "2", label: "GAMES" },
  { value: "0", label: "CONTROLS", accent: true },
  { value: "3", label: "CODES ON LOOP" },
];

export function QRetro() {
  return (
    <>
      <Nav />
      <header className="studio-header">
        <a className="back-link" href="#/">
          <ArrowLeft size={16} />
          HOME
        </a>
        <div className="studio-title-row">
          <h1 className="studio-title">
            QRetro <span className="accent">Games</span>
          </h1>
          <p>
            Two classics that build a QR: in Tetris the pieces fall into place,
            in Snake five snakes eat coins until they crash.
          </p>
        </div>
      </header>
      <section className="qretro-animations">
        <div className="qretro-anims-inner">
          <div className="qretro-label-row">
            <span>THE ANIMATIONS</span>
            <span>THEY PLAY THEMSELVES · ON LOOP</span>
          </div>
          <div className="qretro-games">
            {GAMES.map((g) => (
              <article className="qretro-game rv" key={g.name}>
                <div className="qretro-screen">
                  <iframe
                    src={g.src}
                    title={`${g.name} building a QR, playing itself`}
                    loading="lazy"
                  />
                </div>
                <div className="qretro-game-text">
                  <div className="qretro-game-name">
                    <h3>{g.name}</h3>
                    <span>{g.num}</span>
                  </div>
                  <p>{g.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="stats">
        {STATS.map(({ value, label, accent }) => (
          <div className="stat" key={label}>
            <em className={accent ? "accent" : undefined}>{value}</em>
            <span>{label}</span>
          </div>
        ))}
      </section>
      <Footer />
    </>
  );
}
