import { Wordmark } from './Wordmark.tsx'

const NAV_LINKS = [
  { label: 'Projects', href: '#index' },
  { label: 'Why', href: '#why' },
]

export function Nav() {
  return (
    <nav className="nav">
      <a className="logo" href="#top" aria-label="QaRt home">
        <Wordmark size="nav" />
      </a>
      <div className="nav-links">
        {NAV_LINKS.map(({ label, href }) => (
          <a key={label} className="nav-link" href={href}>
            {label}
          </a>
        ))}
      </div>
    </nav>
  )
}
