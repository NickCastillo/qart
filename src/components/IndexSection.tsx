import { useMemo } from 'react'
import { ArrowRight, MousePointer2 } from 'lucide-react'
import { GLYPHS, PROJECTS, type IndexProject } from '../pieces.ts'
import { ConstelAnim, QRetroAnim } from './StateAnims.tsx'

function Glyph({ pattern }: { pattern: string[] }) {
  /* per-pixel scatter offsets for the hover gesture, matching the old
     Studios strip's "brand gesture" */
  const cells = useMemo(
    () =>
      pattern.flatMap((row, r) =>
        row.split('').map((ch, c) => ({
          key: `${r}-${c}`,
          on: ch === '#',
          gx: ((Math.random() - 0.5) * 4).toFixed(1),
          gy: ((Math.random() - 0.5) * 4).toFixed(1),
        })),
      ),
    [pattern],
  )
  return (
    <span className="glyph" aria-hidden="true">
      {cells.map((cell) =>
        cell.on ? (
          <b
            key={cell.key}
            className="on"
            style={{ '--gx': `${cell.gx}px`, '--gy': `${cell.gy}px` } as React.CSSProperties}
          />
        ) : (
          <b key={cell.key} />
        ),
      )}
    </span>
  )
}

function ScenesStrip({ scenes }: { scenes: NonNullable<IndexProject['scenes']> }) {
  return (
    <div className="scenes-strip">
      {scenes.map((s) => (
        <a className="scene-tile" key={s.id} href={`#/p/${s.id}`}>
          <Glyph pattern={GLYPHS[s.id]} />
          <span className="scene-name">{s.label}</span>
          <span className="scene-cap">{s.sceneLabel}</span>
        </a>
      ))}
    </div>
  )
}

function States({ states }: { states: NonNullable<IndexProject['states']> }) {
  return (
    <div className="project-states">
      {states.map((s) => (
        <img key={s.src} src={s.src} alt={s.alt} />
      ))}
    </div>
  )
}

function StateAnim({ anim }: { anim: NonNullable<IndexProject['anim']> }) {
  return (
    <div className="project-states project-anim">
      {anim.kind === 'qretro' ? <QRetroAnim /> : <ConstelAnim />}
      <span className={`state-hint state-hint-${anim.hint}`} aria-hidden="true">
        <MousePointer2 size={12} />
        HOVER
      </span>
    </div>
  )
}

function ProjectRow({ project }: { project: IndexProject }) {
  const body = (
    <>
      <div className="project-meta">
        <span className="project-num">{project.number}</span>
        <span className="project-tag">{project.meta}</span>
      </div>
      <div className="project-name">
        <h3>{project.name}</h3>
        {project.states && <States states={project.states} />}
        {project.anim && <StateAnim anim={project.anim} />}
      </div>
      {/* the scenes strip is its own section, not a "state" of the row —
          it sits between the title and the description, full width */}
      {project.scenes && <ScenesStrip scenes={project.scenes} />}
      <div className="project-foot">
        <p>{project.description}</p>
        {/* the scenes strip already nests its own links, so this row can't
            also be one big <a> — only rows without it wrap the whole row */}
        {project.scenes ? (
          project.href ? (
            <a className="project-link" href={project.href}>
              {project.linkLabel}
              <ArrowRight size={19} />
            </a>
          ) : (
            <span className="project-link soon">{project.linkLabel}</span>
          )
        ) : (
          <span className={`project-link${project.href ? '' : ' soon'}`}>
            {project.linkLabel}
            {project.href && <ArrowRight size={19} />}
          </span>
        )}
      </div>
    </>
  )
  if (project.scenes) {
    return <div className="project-row has-scenes">{body}</div>
  }
  return project.href ? (
    <a className="project-row" href={project.href}>
      {body}
    </a>
  ) : (
    <div className="project-row soon">{body}</div>
  )
}

export function IndexSection() {
  return (
    <section className="index rv" id="index">
      {PROJECTS.map((p) => (
        <ProjectRow project={p} key={p.number} />
      ))}
    </section>
  )
}
