/** Local-only redaction. Nothing in this file talks to a network. */

export type EntityType = 'NAME' | 'ADDRESS' | 'ID' | 'ACCOUNT' | 'PHONE' | 'EMAIL' | 'BIRTHDATE' | 'OTHER'

export const ENTITY_TYPES: EntityType[] = ['NAME', 'ADDRESS', 'ID', 'ACCOUNT', 'PHONE', 'EMAIL', 'BIRTHDATE', 'OTHER']

export interface Entity {
  value: string
  type: EntityType
  placeholder: string
  /** Who found it: a fixed pattern, the on-device model, or the user. */
  foundBy: 'pattern' | 'model' | 'you'
}

const DATE_LIKE = /^\d{1,4}[./-]\d{1,2}[./-]\d{1,4}$/

/** Things a regular expression can find reliably, with no model at all. */
export function findByPattern(text: string): { value: string; type: EntityType }[] {
  const found: { value: string; type: EntityType }[] = []
  const add = (re: RegExp, type: EntityType, ok: (m: string) => boolean = () => true) => {
    for (const m of text.matchAll(re)) {
      const value = m[0].trim()
      if (ok(value)) found.push({ value, type })
    }
  }
  add(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, 'EMAIL')
  add(/\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,4})?\b/g, 'ACCOUNT')
  add(/\b[A-Z]{1,4}[-/ ]?\d[\d/-]{4,}\d\b/g, 'ID')
  add(/\+?\d[\d ().-]{7,}\d/g, 'PHONE', (v) => !DATE_LIKE.test(v) && v.replace(/\D/g, '').length >= 9 && /[ ().+-]/.test(v))
  add(/\b\d{6,}\b/g, 'ID')
  return found
}

/**
 * A letter that names "Daniel Okafor" usually also says "Mr. Okafor". Hiding only the
 * full name would leak the surname, so each part of a multi-word name is hidden too.
 */
export function withNameParts(found: { value: string; type: EntityType }[]): { value: string; type: EntityType }[] {
  const parts = found
    .filter((f) => f.type === 'NAME')
    .flatMap((f) => f.value.split(/\s+/))
    .map((w) => w.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, ''))
    .filter((w) => w.length >= 3 && /^\p{Lu}/u.test(w) && !TITLES.has(w.toLowerCase()))
  return [...found, ...parts.map((value) => ({ value, type: 'NAME' as const }))]
}

const TITLES = new Set(['mrs', 'miss', 'mister', 'madam', 'prof', 'professor', 'doctor', 'sir', 'the', 'and', 'von', 'van', 'del'])

/** Merge new finds into the entity list, numbering placeholders per type. */
export function addEntities(
  existing: Entity[],
  found: { value: string; type: EntityType }[],
  foundBy: Entity['foundBy'],
): Entity[] {
  const out = [...existing]
  for (const f of found) {
    const value = f.value.trim()
    if (value.length < 3) continue
    // Skip anything already hidden, or sitting inside something already hidden.
    if (out.some((e) => e.value === value || (e.value.includes(value) && f.type !== 'NAME'))) continue
    const n = out.filter((e) => e.type === f.type).length + 1
    out.push({ value, type: f.type, placeholder: `[${f.type}_${n}]`, foundBy })
  }
  return out
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Replace every hidden value with its placeholder. Longest values first so they win. */
export function redact(text: string, entities: Entity[]): string {
  let out = text
  for (const e of [...entities].sort((a, b) => b.value.length - a.value.length)) {
    // Whole words only: hiding "Daniel" must not chew into "Danielson", nor "123456" into "91234567".
    const start = /^[\p{L}\p{N}]/u.test(e.value) ? '(?<![\\p{L}\\p{N}])' : ''
    const end = /[\p{L}\p{N}]$/u.test(e.value) ? '(?![\\p{L}\\p{N}])' : ''
    out = out.replace(new RegExp(start + escapeRe(e.value) + end, 'gu'), e.placeholder)
  }
  return out
}

/** Put the real values back, on this device, into whatever the cloud returned. */
export function rehydrate(text: string, entities: Entity[]): string {
  let out = text
  for (const e of entities) out = out.split(e.placeholder).join(e.value)
  return out
}

/** Split long text so each piece fits the on-device model's context window. */
export function chunk(text: string, size = 5000): string[] {
  const parts: string[] = []
  let rest = text
  while (rest.length > size) {
    let cut = rest.lastIndexOf('\n', size)
    if (cut < size / 2) cut = size
    parts.push(rest.slice(0, cut))
    rest = rest.slice(cut)
  }
  if (rest.trim()) parts.push(rest)
  return parts
}
