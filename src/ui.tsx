import { useState, type ComponentProps, type MouseEvent, type ReactNode } from 'react'
import type { Source } from './lib/ai'
import { navigate } from './lib/nav'

/** A real link (crawlable, middle-clickable) that navigates in place on a plain click. */
export function Link({
  to,
  className,
  children,
  onClick: customOnClick,
}: {
  to: string
  className?: string
  children: ReactNode
  onClick?: () => void
}) {
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    customOnClick?.()
    navigate(to)
  }
  return (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  )
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      className="logo"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={true}
    >
      <rect x="4" y="2" width="24" height="28" rx="4" className="logo-page" />
      <path d="M8 8h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="logo-line" />
      <path d="M8 14h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="logo-accent" />
      <path d="M8 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="logo-line" />
      <rect x="18" y="18" width="10" height="12" rx="3" className="logo-shield-bg" />
      <path
        d="M23 21v3m-2-1.5h4"
        stroke="var(--device, #10b981)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function TopBar({
  children,
  deviceReady,
}: {
  children?: ReactNode
  deviceReady?: boolean
}) {
  return (
    <header className="topbar-wrapper">
      <nav className="topbar" aria-label="Main navigation">
        <Link to="/" className="brand">
          <Logo />
          <span className="brand-name">Paperwork Decoder</span>
          <span className="brand-pill">Hybrid AI</span>
        </Link>
        <div className="topbar-actions">
          {deviceReady !== undefined && (
            <div className="topbar-device-indicator">
              <span className={`status-dot ${deviceReady ? 'ready' : 'fallback'}`} />
              <span className="indicator-label">
                {deviceReady ? 'Gemini Nano Ready' : 'Pattern Redaction'}
              </span>
            </div>
          )}
          {children}
        </div>
      </nav>
    </header>
  )
}

export function Badge({
  source,
  size = 'md',
}: {
  source: Source | 'local' | 'hybrid'
  size?: 'sm' | 'md'
}) {
  let label = 'On this device'
  let kind = 'device'

  if (source === 'cloud') {
    label = 'Cloud · Gemini'
    kind = 'cloud'
  } else if (source === 'local') {
    label = 'Device · Rule-based'
    kind = 'local'
  } else if (source === 'hybrid') {
    label = 'Hybrid · On-Device First'
    kind = 'hybrid'
  } else {
    label = 'On this device · Gemini Nano'
    kind = 'device'
  }

  return (
    <span className={`badge badge-${kind} badge-${size}`}>
      <span className="badge-dot" aria-hidden={true} />
      <span className="badge-text">{label}</span>
    </span>
  )
}

/**
 * Shows redacted text with each placeholder as a clean, interactive entity chip.
 * Supports hover highlighting synced between text and entity list.
 */
export function Redacted({
  text,
  activeToken,
  onHoverToken,
}: {
  text: string
  activeToken?: string | null
  onHoverToken?: (token: string | null) => void
}) {
  const parts = text.split(/(\[[A-Z]+_\d+\])/)

  return (
    <>
      {parts.map((part, i) => {
        const isToken = /^\[[A-Z]+_\d+\]$/.test(part)
        if (!isToken) return <span key={i}>{part}</span>

        const rawType = part.slice(1, -1).split('_')[0]
        const isActive = activeToken === part

        return (
          <mark
            key={i}
            className={`entity-chip entity-${rawType.toLowerCase()} ${isActive ? 'is-active' : ''}`}
            data-token={part}
            onMouseEnter={() => onHoverToken?.(part)}
            onMouseLeave={() => onHoverToken?.(null)}
            title={`Hidden entity (${rawType}): ${part}`}
          >
            <span className="entity-type-badge">{rawType}</span>
            <span className="entity-tag">{part.slice(1, -1)}</span>
          </mark>
        )
      })}
    </>
  )
}

export function Icon({
  name,
  size = 16,
  className = '',
}: {
  name:
    | 'shield'
    | 'lock'
    | 'cpu'
    | 'cloud'
    | 'sparkles'
    | 'check'
    | 'copy'
    | 'arrowRight'
    | 'arrowLeft'
    | 'upload'
    | 'file'
    | 'info'
    | 'alert'
    | 'eye'
    | 'eyeOff'
    | 'plus'
    | 'trash'
  size?: number
  className?: string
}) {
  const props: ComponentProps<'svg'> = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: `icon ${className}`,
    'aria-hidden': true,
  }

  switch (name) {
    case 'shield':
      return (
        <svg {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      )
    case 'lock':
      return (
        <svg {...props}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      )
    case 'cpu':
      return (
        <svg {...props}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
        </svg>
      )
    case 'cloud':
      return (
        <svg {...props}>
          <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
        </svg>
      )
    case 'sparkles':
      return (
        <svg {...props}>
          <path d="M12 3l1.9 4.8L19 9.7l-4 3.7 1.2 5.3-4.2-2.6-4.2 2.6 1.2-5.3-4-3.7 5.1-1.9L12 3z" />
        </svg>
      )
    case 'check':
      return (
        <svg {...props}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )
    case 'copy':
      return (
        <svg {...props}>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )
    case 'arrowRight':
      return (
        <svg {...props}>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      )
    case 'arrowLeft':
      return (
        <svg {...props}>
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      )
    case 'upload':
      return (
        <svg {...props}>
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      )
    case 'file':
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    case 'info':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      )
    case 'alert':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )
    case 'eye':
      return (
        <svg {...props}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    case 'eyeOff':
      return (
        <svg {...props}>
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...props}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )
    case 'trash':
      return (
        <svg {...props}>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
      )
  }
}

/** Copy button with subtle check feedback */
export function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied!',
  className = '',
}: {
  text: string
  label?: string
  copiedLabel?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  return (
    <button
      type="button"
      className={`copy-btn ${copied ? 'copied' : ''} ${className}`}
      onClick={handleCopy}
      aria-label={label}
    >
      <Icon name={copied ? 'check' : 'copy'} size={14} />
      <span>{copied ? copiedLabel : label}</span>
    </button>
  )
}
