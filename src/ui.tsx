import type { MouseEvent, ReactNode } from 'react'
import type { Source } from './lib/ai'

/** Client-side navigation without a router dependency. */
export function navigate(to: string) {
  history.pushState(null, '', to)
  dispatchEvent(new PopStateEvent('popstate'))
  scrollTo(0, 0)
}

/** A real link (crawlable, middle-clickable) that navigates in place on a plain click. */
export function Link({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  function onClick(e: MouseEvent) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(to)
  }
  return (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  )
}

export function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <rect x="5" y="2" width="22" height="28" rx="3" className="logo-page" />
      <rect x="9" y="8" width="14" height="3" rx="1.5" className="logo-line" />
      <rect x="9" y="14.5" width="9" height="3" rx="1.5" className="logo-accent" />
      <rect x="9" y="21" width="12" height="3" rx="1.5" className="logo-line" />
    </svg>
  )
}

export function TopBar({ children }: { children?: ReactNode }) {
  return (
    <nav className="topbar" aria-label="Main">
      <Link to="/" className="brand">
        <Logo />
        Paperwork Decoder
      </Link>
      <div className="topbar-actions">{children}</div>
    </nav>
  )
}

export function Badge({ source }: { source: Source | 'local' }) {
  const label = source === 'cloud' ? 'Cloud' : source === 'device' ? 'On this device' : 'On this device · no AI'
  return <span className={`badge ${source === 'cloud' ? 'cloud' : 'device'}`}>{label}</span>
}

/** Shows redacted text with each placeholder as a visible chip. */
export function Redacted({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[A-Z]+_\d+\])/).map((part, i) =>
        /^\[[A-Z]+_\d+\]$/.test(part) ? <mark key={i}>{part.slice(1, -1)}</mark> : part,
      )}
    </>
  )
}
