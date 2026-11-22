import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { Explanation, Source, Sourced } from './lib/ai'
import { firebaseConfigured, MAX_IMAGE_BYTES, MAX_LETTER_CHARS } from './lib/config'
import { deviceStatus, type DeviceStatus } from './lib/device'
import { addEntities, withNameParts, ENTITY_TYPES, findByPattern, redact, rehydrate, type Entity, type EntityType } from './lib/redact'
import { SAMPLE_LETTER } from './sample'

/** Firebase and the AI code load on demand, so the first screen appears without them. */
const ai = () => import('./lib/ai')

type Stage = 'input' | 'review' | 'result'
const LANGUAGES = ['English', 'Greek', 'Spanish', 'Arabic', 'Ukrainian', 'Polish', 'Turkish', 'Hindi', 'French', 'German']

/** Turns SDK errors into something a person can act on. */
function explainError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  if (raw.startsWith('LIMIT:')) return raw.slice(6)
  if (!navigator.onLine) return 'You are offline. Hiding details works offline, but explaining the letter needs the internet. Reconnect and try again.'
  if (/app-?check|\b40[13]\b|permission|unauthenticated/i.test(raw)) return 'Firebase rejected the request (App Check). Register this browser\u2019s debug token in the Firebase console, then try again.'
  if (/\b429\b|quota|rate.?limit|resource.?exhausted/i.test(raw)) return 'The free usage limit was reached. Wait a minute and try again.'
  if (/\b503\b|overloaded|unavailable/i.test(raw)) return 'The model is busy right now. Try again in a few seconds.'
  if (/JSON|Unexpected token/i.test(raw)) return 'The answer came back in a form the app could not read. Try again.'
  return `That did not work: ${raw}`
}

function Badge({ source }: { source: Source | 'local' }) {
  const label = source === 'cloud' ? 'Cloud' : source === 'device' ? 'On this device' : 'On this device · no AI'
  return <span className={`badge ${source === 'cloud' ? 'cloud' : 'device'}`}>{label}</span>
}

/** Shows redacted text with each placeholder as a visible chip. */
function Redacted({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[A-Z]+_\d+\])/).map((part, i) =>
        /^\[[A-Z]+_\d+\]$/.test(part) ? <mark key={i}>{part.slice(1, -1)}</mark> : part,
      )}
    </>
  )
}

export default function App() {
  const [stage, setStage] = useState<Stage>('input')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
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

  const [copied, setCopied] = useState(false)
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
      } catch {
        /* fall through: pattern-only redaction, and the review screen says so */
      }
    }
    setText(body)
    setEntities(found)
    setUsedModel(model)
    setStage('review')
  }

  const start = () =>
    task('Reading…', async () => {
      if (file && file.size > MAX_IMAGE_BYTES) throw new Error('LIMIT:That photo is too large. Use one under 8 MB.')
      if (!file && text.length > MAX_LETTER_CHARS)
        throw new Error(`LIMIT:That is too long (${text.length.toLocaleString()} characters). Paste one letter at a time, up to ${MAX_LETTER_CHARS.toLocaleString()} characters.`)
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
      setNeedConsent(false)
      const read = await (await ai()).readImage(file!, true)
      setReadBy(read.source)
      await hide(read.value)
    })

  const explain = () =>
    task('Explaining the redacted letter in the cloud…', async () => {
      setResult(await (await ai()).explainLetter(redacted, language))
      setSimpler({})
      setReply(null)
      setStage('result')
    })

  const makeSimpler = (term: string, meaning: string) =>
    task('Rewording…', async () => {
      const s = await (await ai()).simplify(term, meaning, language)
      setSimpler((prev) => ({ ...prev, [term]: s }))
    })

  const writeReply = (e: FormEvent) => {
    e.preventDefault()
    setCopied(false)
    return task('Drafting a reply in the cloud…', async () => {
      // The goal is typed by the user and may repeat a hidden detail, so it is redacted too.
      setReply(await (await ai()).draftReply(redacted, redact(goal, entities), language))
    })
  }

  async function copyReply() {
    try {
      await navigator.clipboard.writeText(show(reply!.value))
      setCopied(true)
    } catch {
      setError('Copying was blocked by the browser. Select the text and copy it by hand.')
    }
  }

  function addManual(e: FormEvent) {
    e.preventDefault()
    if (!text.includes(newValue.trim()) || newValue.trim().length < 3) {
      setError('That exact text is not in the letter (at least 3 characters).')
      return
    }
    setError(null)
    setEntities(addEntities(entities, withNameParts([{ value: newValue, type: newType }]), 'you'))
    setNewValue('')
  }

  function reset() {
    setStage('input')
    setText('')
    setFile(null)
    setEntities([])
    setResult(null)
    setReply(null)
    setError(null)
    setNeedConsent(false)
  }

  const steps: [Stage, string][] = [
    ['input', 'Add your letter'],
    ['review', 'Check what is hidden'],
    ['result', 'Understand it'],
  ]

  return (
    <div className="page">
      <header>
        <h1>Paperwork Decoder</h1>
        <p className="tagline">
          Understand official letters without handing over your identity. Your name, address and numbers are hidden on
          this device before anything is sent for explanation.
        </p>
        <ol className="steps">
          {steps.map(([key, label], i) => (
            <li key={key} className={key === stage ? 'current' : ''} aria-current={key === stage ? 'step' : undefined}>
              <span>{i + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </header>

      <main>
      {!firebaseConfigured && (
        <Notice>
          Firebase is not set up yet, so AI features are off. Copy <code>.env.example</code> to <code>.env.local</code>{' '}
          and add your project keys. Pattern-based hiding still works below.
        </Notice>
      )}

      {stage === 'input' && (
        <section className="card">
          <div className="row between">
            <h2 ref={heading} tabIndex={-1}>Paste the letter or add a photo</h2>
            <span className={`badge ${device === 'unavailable' ? 'muted' : 'device'}`}>
              {device === 'available'
                ? 'On-device model ready'
                : device === 'unavailable'
                  ? 'No on-device model in this browser'
                  : 'On-device model will download'}
            </span>
          </div>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setFile(null)
            }}
            placeholder="Paste the full text of the letter here…"
            rows={12}
            aria-label="Letter text"
          />
          <div className="row">
            <label className="button secondary">
              {file ? `Photo: ${file.name}` : 'Add a photo (JPEG or PNG)'}
              <input
                type="file"
                accept="image/jpeg,image/png"
                className="sr-only"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null)
                  setNeedConsent(false)
                }}
              />
            </label>
            <button className="secondary" onClick={() => (setText(SAMPLE_LETTER), setFile(null))}>
              Try a sample letter
            </button>
            <label className="grow right">
              Explain in{' '}
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
          </div>

          {needConsent && (
            <Notice>
              This browser cannot read photos on-device, so the photo would have to be sent to the cloud{' '}
              <strong>before</strong> anything is hidden. You can type or paste the text instead to keep it private.
              <div className="row">
                <button onClick={readInCloud} disabled={!firebaseConfigured || !!busy}>
                  Send the photo to the cloud
                </button>
                <button className="secondary" onClick={() => (setNeedConsent(false), setFile(null))}>
                  Cancel
                </button>
              </div>
            </Notice>
          )}

          <button className="primary" onClick={start} disabled={!!busy || (!file && text.trim().length < 20)}>
            Hide my personal details
          </button>
          <p className="hint">Nothing leaves this device at this step.</p>
        </section>
      )}

      {stage === 'review' && (
        <section className="card">
          <div className="row between">
            <h2 ref={heading} tabIndex={-1}>This is all the cloud will see</h2>
            <Badge source={usedModel ? 'device' : 'local'} />
          </div>
          {readBy === 'cloud' && <Notice>The photo was read in the cloud because you allowed it.</Notice>}
          {!usedModel && (
            <Notice>
              No on-device model ran here, so only patterns (emails, phone numbers, long numbers, bank accounts) were
              hidden. <strong>Add names and addresses yourself below before continuing.</strong>
            </Notice>
          )}
          <div className="split">
            <pre className="letter">
              <Redacted text={redacted} />
            </pre>
            <aside>
              <h3>Hidden on this device ({entities.length})</h3>
              <ul className="entities">
                {entities.map((e) => (
                  <li key={e.placeholder}>
                    <mark>{e.placeholder.slice(1, -1)}</mark>
                    <span className="value" title={`Found by ${e.foundBy}`}>
                      {e.value}
                    </span>
                    <button
                      className="link"
                      onClick={() => setEntities(entities.filter((x) => x !== e))}
                      aria-label={`Stop hiding ${e.value}`}
                    >
                      show
                    </button>
                  </li>
                ))}
                {entities.length === 0 && <li className="hint">Nothing hidden yet.</li>}
              </ul>
              <form className="add" onSubmit={addManual}>
                <input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Hide something else…"
                  aria-label="Text to hide"
                />
                <select value={newType} onChange={(e) => setNewType(e.target.value as EntityType)} aria-label="Kind">
                  {ENTITY_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <button className="secondary" type="submit">
                  Hide
                </button>
              </form>
            </aside>
          </div>
          <div className="row">
            <button className="secondary" onClick={() => setStage('input')} disabled={!!busy}>
              Back
            </button>
            <button className="primary grow" onClick={explain} disabled={!!busy || !firebaseConfigured}>
              Explain this letter
            </button>
          </div>
          <p className="hint">
            Only the text on the left is sent. The {entities.length} hidden details stay here and are put back into the
            answer on this device.
          </p>
        </section>
      )}

      {stage === 'result' && result && (
        <>
          <section className="card">
            <div className="row between">
              <h2 ref={heading} tabIndex={-1}>What this letter means</h2>
              <Badge source={result.source} />
            </div>
            <p className="summary">{show(result.value.summary)}</p>
            <p>
              <span className={`urgency ${result.value.urgency}`}>Urgency: {result.value.urgency}</span>
            </p>

            <h3>What you need to do</h3>
            <ol className="actions">
              {result.value.actions.map((a, i) => (
                <li key={i}>
                  {show(a.what)}
                  {a.deadline && <span className="deadline">Deadline: {show(a.deadline)}</span>}
                </li>
              ))}
              {result.value.actions.length === 0 && <li>Nothing. This letter is for your information.</li>}
            </ol>

            <h3>If you do nothing</h3>
            <p>{show(result.value.consequences)}</p>

            {result.value.questions.length > 0 && (
              <>
                <h3>Worth asking</h3>
                <ul>
                  {result.value.questions.map((q, i) => (
                    <li key={i}>{show(q)}</li>
                  ))}
                </ul>
              </>
            )}
            <p className="ledger">
              Sent to the cloud: {redacted.length.toLocaleString()} characters of redacted text. Kept on this device:{' '}
              {entities.length} personal details.
            </p>
          </section>

          {result.value.terms.length > 0 && (
            <section className="card">
              <h2>Difficult words</h2>
              <dl className="terms">
                {result.value.terms.map((t) => {
                  const s = simpler[t.term]
                  return (
                    <div key={t.term}>
                      <dt>{show(t.term)}</dt>
                      <dd>
                        {show(s ? s.value : t.meaning)} {s && <Badge source={s.source} />}
                        {!s && (
                          <button className="link" onClick={() => makeSimpler(t.term, t.meaning)} disabled={!!busy}>
                            Say it more simply
                          </button>
                        )}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </section>
          )}

          <section className="card">
            <div className="row between">
              <h2>Write back</h2>
              {reply && <Badge source={reply.source} />}
            </div>
            <form className="row" onSubmit={writeReply}>
              <input
                className="grow"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="What do you want to say? e.g. ask for two more weeks to pay"
                aria-label="Reply goal"
              />
              <button type="submit" disabled={!!busy || goal.trim().length < 5}>
                Draft a reply
              </button>
            </form>
            {reply && (
              <>
                <textarea readOnly rows={10} value={show(reply.value)} aria-label="Draft reply" />
                <div className="row between">
                  <p className="hint">
                    The cloud wrote this with placeholders. Your real details were filled in on this device.
                  </p>
                  <button className="secondary" onClick={copyReply}>
                    {copied ? 'Copied' : 'Copy reply'}
                  </button>
                </div>
              </>
            )}
          </section>

          <button className="secondary" onClick={reset} disabled={!!busy}>
            Start over with another letter
          </button>
        </>
      )}

      </main>

      <div className="status">
        {busy && (
          <div className="pill" role="status">
            <span className="spinner" aria-hidden="true" />
            {busy}
            {progress !== null && progress < 1 && ` Downloading on-device model: ${Math.round(progress * 100)}%`}
          </div>
        )}
        {error && !busy && (
          <div className="pill error" role="alert">
            {error}
            <button className="link" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}
      </div>

      <footer>
        Not legal advice. Built with Firebase AI Logic hybrid inference: Gemini Nano on-device, Gemini in the cloud.
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
