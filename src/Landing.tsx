import { useMemo, useState } from 'react'
import { addEntities, findByPattern, redact, withNameParts } from './lib/redact'
import { Badge, Link, Redacted, TopBar } from './ui'

/** A short excerpt of the built-in sample letter. Every detail in it is fictional. */
const EXCERPT = `Mr. Daniel Okafor
47 Linden Street, Apt 3B

Dear Mr. Okafor,

The property levy under taxpayer number 5520934417 has been underpaid by 412.60 EUR. Remit the balance no later than 14 December 2026 to IBAN GR16 0110 1250 0000 0001 2300 695.`

function Demo() {
  const [view, setView] = useState<'yours' | 'cloud'>('cloud')
  // The same code the app runs: patterns first, then what the on-device model adds.
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
    <figure className="demo">
      <div className="demo-head">
        <div className="segmented" role="group" aria-label="Choose which version of the letter to show">
          <button aria-pressed={view === 'yours'} onClick={() => setView('yours')}>
            Your letter
          </button>
          <button aria-pressed={view === 'cloud'} onClick={() => setView('cloud')}>
            What the cloud sees
          </button>
        </div>
        <Badge source={view === 'cloud' ? 'cloud' : 'device'} />
      </div>
      <pre className="letter" key={view}>
        {view === 'cloud' ? <Redacted text={redacted} /> : EXCERPT}
      </pre>
      <div className="demo-result">
        <p className="demo-label">What you get back</p>
        <p>
          You underpaid your property tax by 412.60 EUR. Pay it or object in writing.
          <span className="deadline">Deadline: 14 December 2026</span>
        </p>
      </div>
      <figcaption>An illustration using the app’s built-in sample letter. The person in it is fictional.</figcaption>
    </figure>
  )
}

const MODES: { feature: string; source: 'device' | 'cloud' | 'hybrid'; why: string }[] = [
  { feature: 'Reading a photo of your letter', source: 'device', why: 'The original letter should never leave your device.' },
  { feature: 'Finding names, addresses and numbers to hide', source: 'device', why: 'The model that sees your details is the one inside your browser.' },
  { feature: 'Explaining the letter, actions and deadlines', source: 'cloud', why: 'Needs a stronger model. It only ever receives the hidden version.' },
  { feature: 'Drafting a reply', source: 'cloud', why: 'Written with placeholders. Your real details are filled in locally.' },
  { feature: 'Saying a difficult word more simply', source: 'hybrid', why: 'Instant on your device, and still works in the cloud when there is no local model.' },
]

export default function Landing() {
  return (
    <div className="landing">
      <TopBar>
        <a href="#how">How it works</a>
        <a href="#privacy">Privacy</a>
        <Link to="/app" className="button small">
          Open the app
        </Link>
      </TopBar>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">For tax, bank, landlord and government letters</p>
            <h1>Understand official letters without handing over your identity.</h1>
            <p className="lead">
              Paperwork Decoder hides your name, address and numbers on your own device, then asks the cloud to explain
              what is left: what the letter means, what you must do, and by when.
            </p>
            <div className="row">
              <Link to="/app" className="button primary">
                Decode a letter
              </Link>
              <a href="#how" className="button secondary">
                See how it works
              </a>
            </div>
            <p className="hint">Free. No account. Nothing is stored.</p>
          </div>
          <Demo />
        </section>

        <section id="how" className="band">
          <h2>How it works</h2>
          <ol className="how">
            <li>
              <Badge source="device" />
              <h3>Add your letter</h3>
              <p>Paste the text or add a photo. It is read by the AI model built into your browser.</p>
            </li>
            <li>
              <Badge source="device" />
              <h3>Check what is hidden</h3>
              <p>
                Names, addresses and numbers become labels like <mark>NAME_1</mark>. You see exactly what will be sent,
                and can hide more or less.
              </p>
            </li>
            <li>
              <Badge source="cloud" />
              <h3>Understand it</h3>
              <p>
                A cloud model explains the hidden version in plain language. Your real details are put back on your
                device.
              </p>
            </li>
          </ol>
        </section>

        <section className="band">
          <h2>Two models, each doing the job it is suited to</h2>
          <p className="section-lead">
            Every answer in the app shows where it ran. Nothing falls back to the cloud silently for the private steps.
          </p>
          <ul className="modes">
            {MODES.map((m) => (
              <li key={m.feature}>
                <strong>{m.feature}</strong>
                {m.source === 'hybrid' ? (
                  <span className="badge hybrid">Device first, then cloud</span>
                ) : (
                  <Badge source={m.source} />
                )}
                <span className="why">{m.why}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="privacy" className="band">
          <h2>What stays, and what is sent</h2>
          <div className="ledger-grid">
            <div className="ledger-card">
              <h3>Stays on your device</h3>
              <ul>
                <li>Your name and the names of other people</li>
                <li>Home addresses, phone numbers and email addresses</li>
                <li>Tax, case, customer and reference numbers</li>
                <li>Bank account numbers</li>
                <li>The original letter and photo</li>
              </ul>
            </div>
            <div className="ledger-card">
              <h3>Sent to the cloud</h3>
              <ul>
                <li>The letter with those details replaced by labels</li>
                <li>Amounts and deadlines, which the explanation needs</li>
                <li>The name of the office or company that wrote to you</li>
                <li>The language you want the answer in</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="band">
          <h2>Good to know</h2>
          <div className="faq">
            <details>
              <summary>Which browsers does it work in?</summary>
              <p>
                The on-device model needs Chrome on a desktop computer. In other browsers the app still works: it hides
                emails, phone numbers, bank accounts and long numbers using fixed patterns, and asks you to hide names
                and addresses yourself before anything is sent.
              </p>
            </details>
            <details>
              <summary>What if my browser cannot read a photo on the device?</summary>
              <p>
                The app tells you, and asks before sending the photo to the cloud. You can type or paste the text
                instead to keep it private.
              </p>
            </details>
            <details>
              <summary>Does the app keep my letters?</summary>
              <p>
                No. There is no account and no history. The letter lives in the page until you close or reload it. The
                hidden version is sent to Google’s Gemini models through Firebase to produce the explanation.
              </p>
            </details>
            <details>
              <summary>Can the hiding miss something?</summary>
              <p>
                Yes, which is why the app shows you the exact text before it is sent and lets you hide anything it
                missed. Read that screen before you continue.
              </p>
            </details>
            <details>
              <summary>Is this legal advice?</summary>
              <p>
                No. It explains what a letter says and helps you ask better questions. For anything with legal or
                financial consequences, check with the sender or a qualified adviser.
              </p>
            </details>
          </div>
        </section>

        <section className="cta">
          <h2>Got a letter you have been putting off?</h2>
          <Link to="/app" className="button primary">
            Decode a letter
          </Link>
        </section>
      </main>

      <footer>
        Built with Firebase AI Logic hybrid inference for #BuildHybridAI. Open source under Apache-2.0. Not legal
        advice.
      </footer>
    </div>
  )
}
