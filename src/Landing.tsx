import { useMemo, useState } from 'react'
import { addEntities, findByPattern, redact, withNameParts } from './lib/redact'
import { Badge, Icon, Link, Redacted, TopBar } from './ui'

/** A short excerpt of the built-in sample letter. Every detail in it is fictional. */
const EXCERPT = `Mr. Daniel Okafor
47 Linden Street, Apt 3B

Dear Mr. Okafor,

The property levy under taxpayer number 5520934417 has been underpaid by 412.60 EUR. Remit the balance no later than 14 December 2026 to IBAN GR16 0110 1250 0000 0001 2300 695.`

function Demo() {
  const [view, setView] = useState<'yours' | 'cloud'>('cloud')
  const [activeToken, setActiveToken] = useState<string | null>(null)

  // The exact same pipeline the app runs: regex patterns first, then Gemini Nano names & addresses.
  const redacted = useMemo(() => {
    const byPattern = addEntities([], findByPattern(EXCERPT), 'pattern')
    const all = addEntities(
      byPattern,
      withNameParts([
        { value: 'Daniel Okafor', type: 'NAME' },
        { value: '47 Linden Street, Apt 3B', type: 'ADDRESS' },
      ]),
      'model',
    )
    return redact(EXCERPT, all)
  }, [])

  return (
    <figure className="demo" aria-label="Interactive privacy comparison">
      <div className="demo-head">
        <div className="segmented" role="group" aria-label="Toggle document privacy view">
          <button
            type="button"
            aria-pressed={view === 'yours'}
            onClick={() => setView('yours')}
          >
            Your original letter
          </button>
          <button
            type="button"
            aria-pressed={view === 'cloud'}
            onClick={() => setView('cloud')}
          >
            What the cloud sees
          </button>
        </div>
        <Badge source={view === 'cloud' ? 'cloud' : 'device'} />
      </div>

      <pre className="letter" key={view}>
        {view === 'cloud' ? (
          <Redacted
            text={redacted}
            activeToken={activeToken}
            onHoverToken={setActiveToken}
          />
        ) : (
          EXCERPT
        )}
      </pre>

      <div className="demo-result">
        <div className="row between">
          <span className="demo-label">What Gemini returns to you</span>
          <span className="deadline-tag">
            <Icon name="file" size={12} />
            Due: 14 Dec 2026
          </span>
        </div>
        <p style={{ marginTop: '4px', fontSize: '0.94rem' }}>
          You underpaid your property levy by <strong>412.60 EUR</strong>. Remit payment or submit a written objection before the deadline.
        </p>
      </div>
      <figcaption className="hint">
        Live interactive demo with fictional details. The cloud receives only placeholders; your browser fills your real identity back in.
      </figcaption>
    </figure>
  )
}

const MODES: {
  feature: string
  source: 'device' | 'cloud' | 'hybrid'
  why: string
}[] = [
  {
    feature: 'Reading letter photos (OCR)',
    source: 'device',
    why: 'The original unredacted image never leaves your computer.',
  },
  {
    feature: 'Detecting names, addresses & IDs',
    source: 'device',
    why: 'The only model that ever inspects your identity runs locally inside Chrome (Gemini Nano).',
  },
  {
    feature: 'Explaining consequences & deadlines',
    source: 'cloud',
    why: 'Requires reasoning from Gemini 2.5 in the cloud, but receives only scrubbed placeholders.',
  },
  {
    feature: 'Drafting formal replies',
    source: 'cloud',
    why: 'Cloud composes the template with placeholders; your browser safely populates your real info.',
  },
  {
    feature: 'Simplifying complex legal jargon',
    source: 'hybrid',
    why: 'Instant and zero-cost on device; gracefully falls back to cloud if local model is unavailable.',
  },
]

export default function Landing() {
  return (
    <div className="landing">
      <TopBar>
        <a href="#how">How it works</a>
        <a href="#privacy">Privacy guarantee</a>
        <a href="#faq">FAQ</a>
        <Link to="/app" className="button primary small">
          Open App
        </Link>
      </TopBar>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <Icon name="shield" size={14} />
              Zero PII Cloud Architecture · Hybrid AI
            </span>
            <h1>Understand official letters without handing over your identity.</h1>
            <p className="lead">
              Paperwork Decoder redacts your name, address, tax IDs, and bank details right on your device using <strong>Gemini Nano</strong>, then asks <strong>Gemini in the cloud</strong> to decode what’s left: meanings, consequences, and deadlines.
            </p>
            <div className="row">
              <Link to="/app" className="button primary">
                <span>Decode a letter now</span>
                <Icon name="arrowRight" size={16} />
              </Link>
              <a href="#how" className="button secondary">
                How hybrid inference works
              </a>
            </div>
            <p className="hint">100% Free · No sign-up · No tracking · No data stored</p>
          </div>
          <Demo />
        </section>

        <section id="how" className="band">
          <div>
            <h2>How it works</h2>
            <p className="hint" style={{ marginTop: '4px' }}>
              Three steps separating private extraction from high-capability reasoning.
            </p>
          </div>
          <ol className="how-grid">
            <li className="how-card">
              <span className="how-card-num">1</span>
              <Badge source="device" size="sm" />
              <h3>Add your letter</h3>
              <p>
                Paste your official notice or upload a photo. Vision and parsing execute directly in your browser.
              </p>
            </li>
            <li className="how-card">
              <span className="how-card-num">2</span>
              <Badge source="device" size="sm" />
              <h3>Inspect what’s hidden</h3>
              <p>
                Identities, taxpayer IDs, and IBANs are transformed into tags like <mark className="entity-chip">NAME_1</mark>. You inspect the exact outbound payload before sending anything.
              </p>
            </li>
            <li className="how-card">
              <span className="how-card-num">3</span>
              <Badge source="cloud" size="sm" />
              <h3>Understand & act</h3>
              <p>
                The cloud model returns an executive summary, urgency rating, deadlines, and a drafted reply. Your device fills your real details back in.
              </p>
            </li>
          </ol>
        </section>

        <section className="band">
          <div>
            <h2>Two models, each doing the job it is best suited for</h2>
            <p className="hint" style={{ marginTop: '4px' }}>
              Built with Firebase AI Logic. Every operation explicitly displays its inference source badge.
            </p>
          </div>
          <ul className="modes-list">
            {MODES.map((m) => (
              <li key={m.feature} className="modes-item">
                <div style={{ fontWeight: 600 }}>{m.feature}</div>
                <Badge source={m.source} />
                <span className="why">{m.why}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="privacy" className="band">
          <div>
            <h2>The Privacy Ledger</h2>
            <p className="hint" style={{ marginTop: '4px' }}>
              Auditable security: what stays strictly offline versus what is transmitted.
            </p>
          </div>
          <div className="ledger-grid">
            <div className="ledger-card">
              <div className="row" style={{ marginBottom: '8px' }}>
                <Icon name="lock" size={16} />
                <h3>Stays on your device</h3>
              </div>
              <ul>
                <li>Your full name and any named family members</li>
                <li>Physical home addresses, emails, and phone numbers</li>
                <li>Tax registration, case numbers, and customer references</li>
                <li>Bank account numbers (IBANs / routing)</li>
                <li>Original unprocessed images and document text</li>
              </ul>
            </div>
            <div className="ledger-card">
              <div className="row" style={{ marginBottom: '8px' }}>
                <Icon name="cloud" size={16} />
                <h3>Sent to the cloud (Scrubbed)</h3>
              </div>
              <ul>
                <li>The letter with all PII replaced by anonymized placeholders</li>
                <li>Payment amounts, currency, and deadline dates (essential for explanations)</li>
                <li>The issuing agency or authority name (e.g. tax office)</li>
                <li>Your chosen explanation language</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="faq" className="band">
          <div>
            <h2>Frequently Asked Questions</h2>
          </div>
          <div className="faq-grid">
            <details>
              <summary>Which browsers support on-device Gemini Nano?</summary>
              <p>
                Google Chrome (desktop version 139+) with Chrome Built-in AI flags enabled. On browsers without local AI, Paperwork Decoder transparently relies on regex patterns for emails, phone numbers, and IBANs, prompting you to review names manually before transmission.
              </p>
            </details>
            <details>
              <summary>How are surname leaks prevented?</summary>
              <p>
                When a full name like &ldquo;Daniel Okafor&rdquo; is detected, our redaction engine splits individual components and redacts &ldquo;Okafor&rdquo; everywhere it occurs (such as &ldquo;Dear Mr. Okafor&rdquo;), preventing partial surname leakage.
              </p>
            </details>
            <details>
              <summary>Are my documents stored on any server?</summary>
              <p>
                No. There is no database, no user account, and zero server storage. Data exists in browser memory only while the tab remains open.
              </p>
            </details>
            <details>
              <summary>Does this provide certified legal counsel?</summary>
              <p>
                No. Paperwork Decoder demystifies administrative language into plain terms and prepares actionable questions, but does not substitute for qualified legal or financial counsel.
              </p>
            </details>
          </div>
        </section>

        <section className="cta">
          <h2>Have an intimidating letter sitting on your desk?</h2>
          <p className="lead" style={{ textAlign: 'center' }}>
            Decode it privately in seconds without sharing your identity.
          </p>
          <Link to="/app" className="button primary">
            <span>Decode a letter</span>
            <Icon name="arrowRight" size={16} />
          </Link>
        </section>
      </main>

      <footer>
        Paperwork Decoder · Built for Google Chrome Built-in AI & Firebase AI Logic · Open Source under Apache-2.0
      </footer>
    </div>
  )
}
