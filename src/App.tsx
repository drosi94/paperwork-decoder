import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { Explanation, Source, Sourced } from './lib/ai'
import { firebaseConfigured, MAX_IMAGE_BYTES, MAX_LETTER_CHARS } from './lib/config'
import { deviceStatus, type DeviceStatus } from './lib/device'
import { checkRateLimit, getDailyQuota, recordRateLimitAction } from './lib/ratelimit'
import { addEntities, withNameParts, ENTITY_TYPES, findByPattern, redact, rehydrate, type Entity, type EntityType } from './lib/redact'
import { SAMPLE_LETTER } from './sample'
import { Badge, CopyButton, Icon, Redacted, TopBar } from './ui'

/** Firebase and the AI code load on demand, so the first screen appears without them. */
const ai = () => import('./lib/ai')

type Stage = 'input' | 'review' | 'result'
const LANGUAGES = ['English', 'Greek', 'Spanish', 'Arabic', 'Ukrainian', 'Polish', 'Turkish', 'Hindi', 'French', 'German']

const SUGGESTED_GOALS = [
  'Ask for two more weeks to pay',
  'Request an itemized explanation of this amount',
  'Object in writing to this decision',
]

/** Turns SDK errors into something a person can act on. */
function explainError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  if (raw.startsWith('LIMIT:')) return raw.slice(6)
  if (!navigator.onLine) return 'You are offline. Hiding details works offline, but explaining the letter needs the internet. Reconnect and try again.'
  if (/app-?check|\b40[013]\b|permission|unauthenticated/i.test(raw))
    return import.meta.env.DEV
      ? 'Firebase rejected the request (App Check). Register this browser’s debug token in the Firebase console, then try again.'
      : 'The security check for this page did not pass. Reload the page and try again in a moment.'
  if (/\b429\b|quota|rate.?limit|resource.?exhausted/i.test(raw)) return 'The free usage limit was reached. Wait a minute and try again.'
  if (/\b503\b|overloaded|unavailable/i.test(raw)) return 'The model is busy right now. Try again in a few seconds.'
  if (/JSON|Unexpected token/i.test(raw)) return 'The answer came back in a form the app could not read. Try again.'
  return `That did not work: ${raw}`
}

export default function App() {
  const [stage, setStage] = useState<Stage>('input')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [language, setLanguage] = useState('English')
  const [entities, setEntities] = useState<Entity[]>([])
  const [usedModel, setUsedModel] = useState(false)
  const [readBy, setReadBy] = useState<Source | null>(null)
  const [device, setDevice] = useState<DeviceStatus>('unavailable')
  const [progress, setProgress] = useState<number | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [needConsent, setNeedConsent] = useState(false)
  const [result, setResult] = useState<Sourced<Explanation> | null>(null)
  const [simpler, setSimpler] = useState<Record<string, Sourced<string>>>({})
  const [goal, setGoal] = useState('')
  const [reply, setReply] = useState<Sourced<string> | null>(null)
  const [newValue, setNewValue] = useState('')
  const [newType, setNewType] = useState<EntityType>('NAME')
  const [activeToken, setActiveToken] = useState<string | null>(null)

  const [explaining, setExplaining] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    deviceStatus().then(setDevice)
    // Start Firebase right away so App Check is ready (and, in development,
    // the debug token is printed to the console) before the first AI call.
    if (firebaseConfigured) import('./lib/firebase').then((m) => m.getFirebaseAI()).catch(() => {})
  }, [])

  // Moving to a new step puts keyboard and screen-reader focus on its heading.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    heading.current?.focus()
  }, [stage])

  const redacted = useMemo(() => redact(text, entities), [text, entities])
  const show = (s: string) => rehydrate(s, entities)

  async function task(label: string, fn: () => Promise<void>) {
    setBusy(label)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(explainError(e))
    } finally {
      setBusy(null)
      setProgress(null)
    }
  }

  const canUseDevice = firebaseConfigured && device !== 'unavailable'

  async function hide(body: string) {
    let found = addEntities([], findByPattern(body), 'pattern')
    let model = false
    if (canUseDevice) {
      try {
        setBusy('Finding personal details on this device…')
        await (await ai()).prepareDeviceModel(setProgress)
        found = addEntities(found, withNameParts(await (await ai()).findPersonalData(body)), 'model')
        model = true
        // The model has now run, so it is ready whatever the first check said (it may have just downloaded).
        setDevice('available')
      } catch {
        /* fall through: pattern-only redaction, and the review screen says so */
      }
    }
    setText(body)
    setEntities(found)
    setUsedModel(model)
    setStage('review')
  }

  /** PDFs are opened entirely in the browser: text is extracted locally, scans become an image for the on-device model. */
  const addPdf = (pdf: File) =>
    task('Reading the PDF on this device…', async () => {
      if (pdf.size > MAX_IMAGE_BYTES) throw new Error('LIMIT:That PDF is too large. Use one under 8 MB.')
      const { readPdf } = await import('./lib/pdf')
      const result = await readPdf(pdf).catch(() => {
        throw new Error('LIMIT:That PDF could not be opened. If it is password-protected, remove the password or paste the text instead.')
      })
      if (result.isScanned) {
        setText('')
        setFile(result.scannedImageFile ?? null)
        setNote(
          result.pages > 1
            ? `This PDF is a scan, so only page 1 of ${result.pages} will be read. Add the other pages as photos one at a time.`
            : 'This PDF is a scan, so it will be read as a photo.',
        )
        return
      }
      if (result.text.length > MAX_LETTER_CHARS)
        throw new Error(`LIMIT:That PDF has too much text (${result.text.length.toLocaleString()} characters). Use one letter at a time, up to ${MAX_LETTER_CHARS.toLocaleString()} characters.`)
      setFile(null)
      setText(result.text)
      setNote(result.pages > 5 ? `Read the first 5 of ${result.pages} pages on this device.` : `Read ${result.pages === 1 ? '1 page' : result.pages + ' pages'} on this device. Check the text before continuing.`)
    })

  const start = () =>
    task('Reading…', async () => {
      if (file && file.size > MAX_IMAGE_BYTES) throw new Error('LIMIT:That photo is too large. Use one under 8 MB.')
      if (!file && text.length > MAX_LETTER_CHARS)
        throw new Error(
          `LIMIT:That is too long (${text.length.toLocaleString()} characters). Paste one letter at a time, up to ${MAX_LETTER_CHARS.toLocaleString()} characters.`,
        )
      if (!file) {
        setReadBy(null)
        return hide(text)
      }
      if (!canUseDevice) {
        setNeedConsent(true)
        return
      }
      await (await ai()).prepareDeviceModel(setProgress)
      const read = await (await ai()).readImage(file)
      setReadBy(read.source)
      await hide(read.value)
    })

  const readInCloud = () =>
    task('Reading the photo in the cloud…', async () => {
      const check = checkRateLimit('cloud-image')
      if (!check.allowed) throw new Error(`LIMIT:${check.reason}`)
      setNeedConsent(false)
      const read = await (await ai()).readImage(file!, true)
      recordRateLimitAction('cloud-image')
      setReadBy(read.source)
      await hide(read.value)
    })

  const explain = () =>
    task('Explaining the redacted letter in the cloud…', async () => {
      const check = checkRateLimit('explain')
      if (!check.allowed) throw new Error(`LIMIT:${check.reason}`)
      setExplaining(true)
      try {
        const res = await (await ai()).explainLetter(redacted, language)
        recordRateLimitAction('explain')
        setResult(res)
        setSimpler({})
        setReply(null)
        setStage('result')
      } finally {
        setExplaining(false)
      }
    })

  const makeSimpler = (term: string, meaning: string) =>
    task('Rewording on this device…', async () => {
      const check = checkRateLimit('cloud-simplify')
      if (!check.allowed) throw new Error(`LIMIT:${check.reason}`)
      const s = await (await ai()).simplify(term, meaning, language)
      if (s.source === 'cloud') {
        recordRateLimitAction('cloud-simplify')
      }
      setSimpler((prev) => ({ ...prev, [term]: s }))
    })

  const writeReply = (e: FormEvent) => {
    e.preventDefault()
    return task('Drafting a reply in the cloud…', async () => {
      const check = checkRateLimit('reply')
      if (!check.allowed) throw new Error(`LIMIT:${check.reason}`)
      // The goal is typed by the user and may repeat a hidden detail, so it is redacted too.
      const res = await (await ai()).draftReply(redacted, redact(goal, entities), language)
      recordRateLimitAction('reply')
      setReply(res)
    })
  }

  function addManual(e: FormEvent) {
    e.preventDefault()
    if (!text.includes(newValue.trim()) || newValue.trim().length < 3) {
      setError('That exact text is not in the letter (at least 3 characters).')
      return
    }
    setError(null)
    setEntities(addEntities(entities, withNameParts([{ value: newValue.trim(), type: newType }]), 'you'))
    setNewValue('')
  }

  function reset() {
    setNote(null)
    setStage('input')
    setText('')
    setFile(null)
    setEntities([])
    setResult(null)
    setReply(null)
    setError(null)
    setNeedConsent(false)
    setActiveToken(null)
  }

  const steps: [Stage, string][] = [
    ['input', 'Add letter'],
    ['review', 'Check redactions'],
    ['result', 'Understand'],
  ]

  return (
    <div className="page">
      <TopBar deviceReady={device === 'available'} deviceDownload={device === 'downloadable' || device === 'downloading'}>
        <a href="/#how">How it works</a>
        <a href="/#privacy">Privacy</a>
      </TopBar>

      <header className="app-head">
        <div className="row between">
          <h1>Decode a letter</h1>
          <ol className="steps" aria-label="Process steps">
            {steps.map(([key, label], i) => {
              const at = steps.findIndex(([k]) => k === stage)
              return (
                <li
                  key={key}
                  className={i === at ? 'current' : i < at ? 'done' : ''}
                  aria-current={i === at ? 'step' : undefined}
                >
                  <span>{i < at ? '✓' : i + 1}</span>
                  {label}
                </li>
              )
            })}
          </ol>
        </div>
      </header>

      <main>
        {!firebaseConfigured && (
          <Notice>
            <div className="notice-title">
              <Icon name="alert" size={18} />
              Firebase credentials not configured
            </div>
            AI features require Firebase keys. Copy <code>.env.example</code> to <code>.env.local</code> and fill in your keys. Local pattern-based redaction still works below.
          </Notice>
        )}

        {stage === 'input' && (
          <section className="card">
            <div className="row between">
              <h2 ref={heading} tabIndex={-1}>
                Paste the letter, or add a photo or PDF
              </h2>
              <Badge source={device === 'unavailable' ? 'local' : 'device'} />
            </div>

            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setFile(null)
              }}
              placeholder="Paste the full text of the letter here (e.g. from tax authority, bank, or landlord)…"
              rows={10}
              aria-label="Letter text"
            />

            <div className="row between">
              <div className="row">
                <label className="button secondary">
                  <Icon name={file ? 'file' : 'upload'} size={16} />
                  {file ? `Photo: ${file.name}` : 'Upload photo or PDF'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    className="sr-only"
                    onChange={(e) => {
                      const picked = e.target.files?.[0] ?? null
                      e.target.value = ''
                      setNeedConsent(false)
                      setNote(null)
                      if (picked?.type === 'application/pdf') addPdf(picked)
                      else setFile(picked)
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setText(SAMPLE_LETTER)
                    setFile(null)
                    setNote(null)
                  }}
                >
                  <Icon name="sparkles" size={16} />
                  Try a sample letter
                </button>
              </div>

              <label className="row hint">
                <span>Translate & explain in</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  aria-label="Output language"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
            </div>

            {needConsent && (
              <Notice>
                <div className="notice-title">
                  <Icon name="info" size={18} />
                  On-device photo reading unavailable in this browser
                </div>
                This browser cannot run local vision models, so the photo would have to be read by Gemini in the cloud <strong>before</strong> personal details can be hidden. You can paste the text instead to keep it strictly private.
                <div className="row">
                  <button onClick={readInCloud} disabled={!firebaseConfigured || !!busy}>
                    Send photo to cloud OCR
                  </button>
                  <button className="secondary" onClick={() => (setNeedConsent(false), setFile(null))}>
                    Cancel
                  </button>
                </div>
              </Notice>
            )}

            <button
              className="primary"
              onClick={start}
              disabled={!!busy || (!file && text.trim().length < 20)}
            >
              <Icon name="shield" size={18} />
              <span>Hide my personal details</span>
              <Icon name="arrowRight" size={16} />
            </button>
            {note && (
              <p className="note-inline" role="status">
                {note}
              </p>
            )}
            <p className="hint">
              Nothing leaves this device at this step. You review what is hidden on the next screen before anything is sent.
            </p>
          </section>
        )}

        {stage === 'review' && explaining && (
          <section className="card skeleton" aria-hidden="true">
            <span style={{ width: '40%' }} />
            <span />
            <span style={{ width: '85%' }} />
            <span style={{ width: '60%' }} />
            <span style={{ height: 120 }} />
          </section>
        )}

        {stage === 'review' && !explaining && (
          <section className="card">
            <div className="workbench-header">
              <div>
                <h2 ref={heading} tabIndex={-1}>
                  Review redacted letter
                </h2>
                <p className="hint">
                  This exact text is all the cloud model will ever receive.
                </p>
              </div>
              <div className="row">
                <Badge source={usedModel ? 'device' : 'local'} />
              </div>
            </div>

            {readBy === 'cloud' && (
              <Notice>
                Photo text was extracted using cloud OCR because consent was given.
              </Notice>
            )}

            {!usedModel && (
              <Notice>
                No local AI model was detected in this browser. Common patterns (emails, IBANs, phone numbers, taxpayer IDs) were hidden with regex rules. Please verify names and addresses below.
              </Notice>
            )}

            <div className="workbench-split">
              <div className="workbench-doc">
                <div className="workbench-doc-header">
                  <span>OUTGOING REDACTED DOCUMENT</span>
                  <span>{redacted.length.toLocaleString()} chars</span>
                </div>
                <pre className="letter">
                  <Redacted
                    text={redacted}
                    activeToken={activeToken}
                    onHoverToken={setActiveToken}
                  />
                </pre>
              </div>

              <aside className="workbench-sidebar">
                <div className="sidebar-card">
                  <div className="sidebar-title-row">
                    <h3>Hidden on this device ({entities.length})</h3>
                    <span className="hint">Stay private</span>
                  </div>

                  <ul className="entity-list" aria-label="List of hidden items">
                    {entities.map((e) => (
                      <li
                        key={e.placeholder}
                        className={`entity-item ${activeToken === e.placeholder ? 'is-active' : ''}`}
                        onMouseEnter={() => setActiveToken(e.placeholder)}
                        onMouseLeave={() => setActiveToken(null)}
                      >
                        <div className="entity-info">
                          <mark className="entity-chip">{e.placeholder.slice(1, -1)}</mark>
                          <span className="entity-value" title={e.value}>
                            {e.value}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="entity-unhide-btn"
                          onClick={() => setEntities(entities.filter((x) => x !== e))}
                          title={`Un-hide ${e.value}`}
                          aria-label={`Un-hide ${e.value}`}
                        >
                          <Icon name="eye" size={14} />
                        </button>
                      </li>
                    ))}
                    {entities.length === 0 && (
                      <li className="hint">No personal details detected.</li>
                    )}
                  </ul>

                  <form className="add-entity-form" onSubmit={addManual}>
                    <input
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder="Add custom text to hide…"
                      aria-label="Text to hide"
                    />
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as EntityType)}
                      aria-label="Entity type"
                    >
                      {ENTITY_TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    <button className="secondary" type="submit" disabled={!newValue.trim()}>
                      <Icon name="plus" size={14} />
                      Hide
                    </button>
                  </form>
                </div>
              </aside>
            </div>

            <div className="row between">
              <button className="secondary" onClick={() => setStage('input')} disabled={!!busy}>
                <Icon name="arrowLeft" size={16} />
                Back to edit
              </button>
              <div className="row grow" style={{ justifyContent: 'flex-end', gap: '10px' }}>
                <span className="quota-tag" title="Daily free decodes remaining per browser session">
                  {getDailyQuota('explain').remaining} of {getDailyQuota('explain').max} decodes left today
                </span>
                <button
                  className="primary grow"
                  onClick={explain}
                  disabled={!!busy || !firebaseConfigured}
                >
                  <Icon name="cloud" size={18} />
                  <span>Send redacted text & explain with Gemini</span>
                  <Icon name="arrowRight" size={16} />
                </button>
              </div>
            </div>
          </section>
        )}

        {stage === 'result' && result && (
          <>
            <section className="card result-banner">
              <div className="row between">
                <h2 ref={heading} tabIndex={-1}>
                  What this letter means
                </h2>
                <Badge source={result.source} />
              </div>

              <div className={`urgency-pill ${result.value.urgency}`}>
                <span className="status-dot ready" />
                Urgency: {result.value.urgency}
              </div>

              <p className="summary">{show(result.value.summary)}</p>

              <h3>What you need to do</h3>
              <ol className="actions-grid">
                {result.value.actions.map((a, i) => (
                  <li key={i} className="action-card">
                    <span className="action-number">{i + 1}</span>
                    <div className="action-content">
                      <span>{show(a.what)}</span>
                      {a.deadline && (
                        <span className="deadline-tag">
                          <Icon name="file" size={12} />
                          Deadline: {show(a.deadline)}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
                {result.value.actions.length === 0 && (
                  <li className="hint">No immediate action required. This letter is informational.</li>
                )}
              </ol>

              <h3>If you do nothing</h3>
              <p className="hint">{show(result.value.consequences)}</p>

              {result.value.questions.length > 0 && (
                <>
                  <h3>Smart questions to ask</h3>
                  <ul>
                    {result.value.questions.map((q, i) => (
                      <li key={i}>{show(q)}</li>
                    ))}
                  </ul>
                </>
              )}

              <div className="privacy-receipt">
                <span>
                  <strong>Privacy Receipt:</strong> {redacted.length.toLocaleString()} characters sent to cloud (names/IDs replaced).
                </span>
                <span>
                  <strong>{entities.length} details</strong> stayed exclusively on this device.
                </span>
              </div>
            </section>

            {result.value.terms.length > 0 && (
              <section className="card">
                <div className="row between">
                  <h2>Difficult bureaucracy terms explained</h2>
                  <Badge source="hybrid" />
                </div>
                <div className="terms-grid">
                  {result.value.terms.map((t) => {
                    const s = simpler[t.term]
                    return (
                      <div key={t.term} className="term-card">
                        <div className="term-head">
                          <span className="term-word">{show(t.term)}</span>
                          {s ? (
                            <Badge source={s.source} size="sm" />
                          ) : (
                            <button
                              type="button"
                              className="secondary button small"
                              onClick={() => makeSimpler(t.term, t.meaning)}
                              disabled={!!busy}
                            >
                              <Icon name="sparkles" size={13} />
                              Say it more simply
                            </button>
                          )}
                        </div>
                        <p className="term-meaning">{show(s ? s.value : t.meaning)}</p>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            <section className="card">
              <div className="row between">
                <h2>Draft a reply letter</h2>
                {reply && <Badge source={reply.source} />}
              </div>
              <p className="hint">
                The cloud writes your reply using privacy placeholders. Your real name, address, and reference numbers are filled back in locally.
              </p>

              <div className="row" style={{ gap: '8px', margin: '4px 0' }}>
                {SUGGESTED_GOALS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="button secondary small"
                    onClick={() => setGoal(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <form className="row" onSubmit={writeReply}>
                <input
                  className="grow"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="What is your goal? (e.g. ask for two more weeks to pay)"
                  aria-label="Reply goal"
                />
                <button type="submit" className="primary" disabled={!!busy || goal.trim().length < 5}>
                  <Icon name="sparkles" size={16} />
                  Draft reply
                </button>
              </form>

              {reply && (
                <div style={{ display: 'grid', gap: '10px' }}>
                  <textarea readOnly rows={10} value={show(reply.value)} aria-label="Draft reply" />
                  <div className="row between">
                    <p className="hint">
                      Ready to copy or paste into email or print.
                    </p>
                    <CopyButton text={show(reply.value)} label="Copy reply letter" />
                  </div>
                </div>
              )}
            </section>

            <button className="secondary" onClick={reset} disabled={!!busy}>
              <Icon name="arrowLeft" size={16} />
              Start over with another letter
            </button>
          </>
        )}
      </main>

      <div className="status">
        {busy && (
          <div className="pill" role="status">
            <span className="spinner" aria-hidden="true" />
            <span>{busy}</span>
            {progress !== null && progress < 1 && ` Downloading on-device model: ${Math.round(progress * 100)}%`}
          </div>
        )}
        {error && !busy && (
          <div className="pill error" role="alert">
            <Icon name="alert" size={16} />
            <span>{error}</span>
            <button className="link" onClick={() => setError(null)} style={{ color: 'inherit' }}>
              Dismiss
            </button>
          </div>
        )}
      </div>

      <footer>
        Not legal advice. Built for Google Chrome Built-in AI with Firebase AI Logic hybrid inference.
      </footer>
    </div>
  )
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice" role="note">
      {children}
    </div>
  )
}
