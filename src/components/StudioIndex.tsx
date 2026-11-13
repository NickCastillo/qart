import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Nav } from './Nav.tsx'
import { Footer } from './Footer.tsx'
import { STUDIO_SCENES } from '../pieces.ts'

const STATS = [
  { value: '04', label: 'SCENES' },
  { value: '01', label: 'STUDIO' },
  { value: '100%', label: 'SCANNABLE FROM ABOVE', accent: true },
]

const STUDIO_CONTROLS = ['SCENE', 'VIEW', 'FLOOR', 'MATERIAL', 'ROTATION', 'SHUFFLE']

export function StudioIndex() {
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
            Living Scene <span className="accent">Studio</span>
          </h1>
          <p>
            Four scenes, one place to play with them. Switch, rotate, and ask for the QR
            whenever you want.
          </p>
        </div>
      </header>
      {/* stats--rows: these labels are too long to sit under their numbers on
          a phone, so they stack into rows there (comp HqXL6) */}
      <section className="stats stats--rows">
        {STATS.map(({ value, label, accent }) => (
          <div className="stat" key={label}>
            <em className={accent ? 'accent' : undefined}>{value}</em>
            <span>{label}</span>
          </div>
        ))}
      </section>
      <section className="index studio-grid">
        {STUDIO_SCENES.map((s) => (
          <a className="scene-row" href={`#/p/${s.id}`} key={s.id}>
            <div className="project-meta">
              <span className="project-num">{s.number}</span>
              <span className="project-tag">{s.meta}</span>
            </div>
            <h3 className="scene-row-name">{s.name}</h3>
            <div className="scene-images">
              <div className="scene-visual scene-visual-escena">
                <img src={s.escenaSrc} alt={`${s.name} scene`} />
              </div>
              <div className="scene-visual scene-visual-qr">
                <img src={s.qrSrc} alt={`${s.name} as a scannable QR`} />
              </div>
            </div>
            <div className="project-foot">
              <p>{s.description}</p>
              <span className="project-link">
                Open in the studio
                <ArrowRight size={19} />
              </span>
            </div>
          </a>
        ))}
      </section>
      <section className="studio-band">
        <div className="studio-band-card">
          <span className="why-eyebrow">THE STUDIO</span>
          <h2 className="studio-band-title">
            <span>Four scenes.</span>
            <span>One studio.</span>
          </h2>
          <div className="studio-band-action">
            <p>
              There's no separate page. Each scene opens the same studio, and from inside you can
              jump to the other three.
            </p>
            <a className="cta" href="#/p/arbol">
              Open the studio
              <ArrowRight size={17} />
            </a>
          </div>
          <div className="studio-band-controls">
            {STUDIO_CONTROLS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </>
  )
}
