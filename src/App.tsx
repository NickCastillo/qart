import { useEffect, useState } from 'react'
import { Nav } from './components/Nav.tsx'
import { Hero } from './components/Hero.tsx'
import { IndexSection } from './components/IndexSection.tsx'
import { Why } from './components/Why.tsx'
import { Footer } from './components/Footer.tsx'
import { StudioIndex } from './components/StudioIndex.tsx'
import { Piece } from './components/Piece.tsx'
import { PIECES } from './pieces.ts'

type View = { kind: 'home' } | { kind: 'studio' } | { kind: 'piece'; id: string }

const ANCHORS = ['#top', '#index', '#why']

function parseView(hash: string): View {
  const piece = hash.match(/^#\/p\/([\w-]+)$/)
  if (piece && PIECES[piece[1]]) return { kind: 'piece', id: piece[1] }
  if (hash === '#/3d-pixels') return { kind: 'studio' }
  return { kind: 'home' }
}

const viewKey = (v: View) => (v.kind === 'piece' ? `piece:${v.id}` : v.kind)

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

export function App() {
  const hash = useHashRoute()
  const [view, setView] = useState<View>(() => parseView(window.location.hash))
  const [leaving, setLeaving] = useState(false)

  /* page-load rise (motion spec: Page load) */
  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => document.body.classList.add('loaded')),
    )
    return () => cancelAnimationFrame(raf)
  }, [])

  /* route transitions (motion spec: exit fades 150ms, enter rises with stagger) */
  useEffect(() => {
    const target = parseView(hash)
    if (viewKey(target) === viewKey(view)) {
      const anchor = ANCHORS.includes(hash) ? document.getElementById(hash.slice(1)) : null
      if (anchor) {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        anchor.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
      }
      return
    }
    setLeaving(true)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = setTimeout(
      () => {
        setView(target)
        setLeaving(false)
        window.scrollTo(0, 0)
      },
      reduced ? 0 : 150,
    )
    return () => clearTimeout(t)
  }, [hash, view])

  /* scroll reveals */
  useEffect(() => {
    const els = document.querySelectorAll('.rv')
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0.15 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [view])

  return (
    <div className={`page view${leaving ? ' leaving' : ''}`} key={viewKey(view)}>
      {view.kind === 'piece' ? (
        <Piece pieceId={view.id} />
      ) : view.kind === 'studio' ? (
        <StudioIndex />
      ) : (
        <>
          <Nav />
          <Hero />
          <IndexSection />
          <Why />
          <Footer />
        </>
      )}
    </div>
  )
}
