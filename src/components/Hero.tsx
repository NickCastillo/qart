import { ArrowRight } from "lucide-react";
import { Finder } from "./Finder";

const STATS = [
  { value: "03", label: "PROJECTS" },
  { value: "10", label: "PIECES" },
  { value: "100%", label: "SCANNABLE", accent: true },
];

export function Hero() {
  return (
    <>
      <section className="hero" id="top">
        <div className="hero-copy">
          <h1
            className="headline rise"
            style={{ "--d": "60ms" } as React.CSSProperties}
          >
            <span>QR codes</span>
            <span className="accent">made</span>
            <span className="accent">for fun.</span>
          </h1>
          <div
            className="hero-sub rise"
            style={{ "--d": "160ms" } as React.CSSProperties}
          >
            <p>
              Nobody asked for them and none of them sell anything. Just random
              projects built to see how far a QR code can go.
            </p>
            <a className="cta" href="#index">
              See the projects
              <ArrowRight size={17} />
            </a>
          </div>
        </div>
        <Finder />
      </section>
      <section className="stats">
        {STATS.map(({ value, label, accent }) => (
          <div className="stat" key={label}>
            <em className={accent ? "accent" : undefined}>{value}</em>
            <span>{label}</span>
          </div>
        ))}
      </section>
    </>
  );
}
