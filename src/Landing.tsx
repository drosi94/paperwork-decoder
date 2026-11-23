import { useMemo, useState } from 'react'
import { addEntities, findByPattern, redact, withNameParts } from './lib/redact'
import { Badge, Icon, Link, Redacted, TopBar } from './ui'

interface SampleDoc {
  id: string
  title: string
  docType: string
  refId: string
  text: string
  names: { value: string; type: 'NAME' }[]
  addresses: { value: string; type: 'ADDRESS' }[]
  takeaway: string
  highlightAmount: string
  deadline: string
  urgency: 'Action required' | 'Review required'
  tokenMap: Record<string, { original: string; label: string; desc: string }>
}

const SAMPLES: SampleDoc[] = [
  {
    id: 'tax',
    title: 'Munich Property Tax Notice',
    docType: 'Underpayment Notice',
    refId: 'TX-2026-884213',
    text: `Mr. Daniel Okafor
47 Linden Street, Apt 3B

Dear Mr. Okafor,

The property levy under taxpayer number 5520934417 has been underpaid by 412.60 EUR. Remit the balance no later than 14 December 2026 to IBAN GR16 0110 1250 0000 0001 2300 695.`,
    names: [{ value: 'Daniel Okafor', type: 'NAME' }],
    addresses: [{ value: '47 Linden Street, Apt 3B', type: 'ADDRESS' }],
    takeaway: 'You underpaid your property levy by 412.60 EUR. Remit payment or submit a written objection before the deadline.',
    highlightAmount: '412.60 EUR',
    deadline: '14 Dec 2026',
    urgency: 'Action required',
    tokenMap: {
      '[NAME_1]': {
        original: 'Mr. Daniel Okafor',
        label: 'Debtor Name',
        desc: 'Protected on device by Gemini Nano; surname split prevents partial leaks.',
      },
      '[ADDRESS_1]': {
        original: '47 Linden Street, Apt 3B',
        label: 'Residential Domicile',
        desc: 'Physical address never transmitted across the network.',
      },
      '[TAX_ID_1]': {
        original: '5520934417',
        label: 'Tax Reference',
        desc: '10-digit municipal tax identifier scrubbed on device.',
      },
      '[IBAN_1]': {
        original: 'GR16 0110 1250 0000 0001 2300 695',
        label: 'Banking IBAN',
        desc: 'Financial account digits shielded from cloud training.',
      },
    },
  },
  {
    id: 'rent',
    title: 'Tenancy Rent Increase',
    docType: 'Civil Code Section 558 Notice',
    refId: 'LK-89412-B',
    text: `Ms. Elena Rostova
Kaiserstraße 14, Whg 4

Dear Ms. Rostova,

In accordance with Section 558 of the Civil Code, your monthly rent under lease LK-89412-B will adjust from 820.00 EUR to 945.00 EUR effective 01 February 2027.`,
    names: [{ value: 'Elena Rostova', type: 'NAME' }],
    addresses: [{ value: 'Kaiserstraße 14, Whg 4', type: 'ADDRESS' }],
    takeaway: 'Your net rent is increasing by 125.00 EUR (+15.2%). Verify with local rent index (Mietspiegel) before consenting.',
    highlightAmount: '+125.00 EUR',
    deadline: '31 Jan 2027',
    urgency: 'Review required',
    tokenMap: {
      '[NAME_1]': {
        original: 'Ms. Elena Rostova',
        label: 'Tenant Name',
        desc: 'Protected on device by Gemini Nano.',
      },
      '[ADDRESS_1]': {
        original: 'Kaiserstraße 14, Whg 4',
        label: 'Apartment Address',
        desc: 'Kept private in local browser memory.',
      },
      '[CASE_ID_1]': {
        original: 'LK-89412-B',
        label: 'Lease Agreement',
        desc: 'Private lease reference shielded.',
      },
    },
  },
]

function Demo() {
  const [selectedSample, setSelectedSample] = useState<string>('tax')
  const [view, setView] = useState<'yours' | 'cloud'>('cloud')
  const [activeToken, setActiveToken] = useState<string | null>(null)

  const activeDoc = SAMPLES.find((s) => s.id === selectedSample) || SAMPLES[0]

  // The exact same pipeline the app runs: regex patterns first, then Gemini Nano names & addresses.
  const redacted = useMemo(() => {
    const byPattern = addEntities([], findByPattern(activeDoc.text), 'pattern')
    const all = addEntities(
      byPattern,
      withNameParts([...activeDoc.names, ...activeDoc.addresses]),
      'model',
    )
    return redact(activeDoc.text, all)
  }, [activeDoc])

  const inspectedInfo = activeToken ? activeDoc.tokenMap[activeToken] : null

  return (
    <figure className="demo" aria-label="Interactive privacy comparison">
      {/* Top Document Header & Model Pill */}
      <div className="demo-top-nav">
        <div className="demo-sample-switcher" role="tablist" aria-label="Select sample letter">
          {SAMPLES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              role="tab"
              aria-selected={selectedSample === sample.id}
              className={`demo-sample-btn ${selectedSample === sample.id ? 'is-active' : ''}`}
              onClick={() => {
                setSelectedSample(sample.id)
                setActiveToken(null)
              }}
            >
              {sample.title}
            </button>
          ))}
        </div>
        <Badge source={view === 'cloud' ? 'cloud' : 'device'} size="sm" />
      </div>

      {/* Main Viewport Container */}
      <div className="demo-viewport">
        {/* Document Header Bar */}
        <div className="demo-viewport-bar">
          <div className="demo-window-controls" aria-hidden="true">
            <span className="dot dot-close" />
            <span className="dot dot-min" />
            <span className="dot dot-expand" />
          </div>
          <span className="demo-doc-title">
            {activeDoc.docType} · Ref {activeDoc.refId}
          </span>
          <span className="demo-privacy-tag">
            {view === 'cloud' ? 'Details hidden' : 'Raw Document'}
          </span>
        </div>

        {/* View Toggle (Segmented control with constant weights to prevent layout shift) */}
        <div className="demo-toggle-row">
          <div className="segmented demo-segmented" role="group" aria-label="Toggle document privacy view">
            <button
              type="button"
              aria-pressed={view === 'yours'}
              onClick={() => setView('yours')}
              className={view === 'yours' ? 'is-selected' : ''}
            >
              Your original letter
            </button>
            <button
              type="button"
              aria-pressed={view === 'cloud'}
              onClick={() => setView('cloud')}
              className={view === 'cloud' ? 'is-selected' : ''}
            >
              What the cloud sees
            </button>
          </div>
        </div>

        {/* Letter Text Viewport */}
        <pre className="letter demo-letter-body" key={`${selectedSample}-${view}`}>
          {view === 'cloud' ? (
            <Redacted
              text={redacted}
              activeToken={activeToken}
              onHoverToken={setActiveToken}
            />
          ) : (
            activeDoc.text
          )}
        </pre>

        {/* Interactive PII Inspector Bar */}
        <div className={`demo-inspector-strip ${activeToken ? 'is-inspecting' : ''}`}>
          {inspectedInfo ? (
            <div className="inspector-content">
              <span className="inspector-badge">
                <Icon name="lock" size={12} />
                {activeToken}
              </span>
              <div className="inspector-details">
                <span className="inspector-original">
                  Kept offline: <strong>&ldquo;{inspectedInfo.original}&rdquo;</strong>
                </span>
                <span className="inspector-note">{inspectedInfo.desc}</span>
              </div>
            </div>
          ) : (
            <div className="inspector-hint">
              <span className="hint-pulse-dot" aria-hidden="true" />
              <span>
                {view === 'cloud'
                  ? 'Hover or tap any entity chip above to inspect on-device isolation.'
                  : 'Gemini Nano detects identity fields on-device before any network request.'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Result Dossier Returned by Gemini in the Cloud */}
      <div className="demo-result">
        <div className="row between demo-result-header">
          <div className="demo-result-source">
            <Icon name="sparkles" size={14} className="sparkle-icon" />
            <span className="demo-label">Cloud explanation · Gemini</span>
          </div>
          <span className="deadline-tag">
            <Icon name="file" size={12} />
            Due: {activeDoc.deadline}
          </span>
        </div>
        <p className="demo-result-text">
          {activeDoc.takeaway}
        </p>
        <div className="demo-rehydration-note">
          <Icon name="shield" size={12} />
          <span>
            <strong>Local Re-hydration:</strong> Dispute responses are drafted using placeholders; your browser fills in the real details locally.
          </span>
        </div>
      </div>

      <figcaption className="hint demo-caption">
        Live interactive demo with fictional records. In the app you review exactly what will be sent before anything leaves your browser.
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
    why: 'Needs a stronger Gemini model in the cloud. It receives the redacted text you approved.',
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
        <a href="#privacy">Privacy</a>
        <a href="#faq">FAQ</a>
        <Link to="/app" className="button primary small">
          Open App
        </Link>
      </TopBar>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <span className="pulse-indicator" aria-hidden="true" />
              <span>Redacted on your device first · Firebase AI Logic</span>
            </div>
            <h1 className="hero-title">
              Understand official letters without handing over your identity.
            </h1>
            <p className="lead hero-lead">
              Paperwork Decoder redacts your name, address, tax IDs, and bank details right on your device using <strong>Gemini Nano</strong>, then asks <strong>Gemini in the cloud</strong> to decode what’s left: meanings, consequences, and deadlines.
            </p>
            <div className="hero-actions">
              <Link to="/app" className="button primary large">
                <span>Decode a letter now</span>
                <Icon name="arrowRight" size={16} />
              </Link>
              <a href="#how" className="button secondary large">
                How hybrid inference works
              </a>
            </div>
            <div className="hero-specs-row" aria-label="Privacy specs">
              <span className="spec-item">
                <Icon name="shield" size={13} />
                <span>Nothing stored</span>
              </span>
              <span className="spec-dot" aria-hidden="true">·</span>
              <span className="spec-item">
                <Icon name="cpu" size={13} />
                <span>Gemini Nano Local</span>
              </span>
              <span className="spec-dot" aria-hidden="true">·</span>
              <span className="spec-item">
                <Icon name="cloud" size={13} />
                <span>Gemini in the cloud</span>
              </span>
            </div>
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
                <li>The letter with the hidden details replaced by placeholders</li>
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
