import { describe, expect, it } from 'vitest'
import { SAMPLE_LETTER } from '../sample'
import { addEntities, chunk, findByPattern, redact, rehydrate, withNameParts } from './redact'

const entities = addEntities([], findByPattern(SAMPLE_LETTER), 'pattern')
const values = entities.map((e) => e.value)

describe('pattern redaction', () => {
  it('finds the email, bank account, phone, reference and taxpayer number', () => {
    expect(values).toEqual(
      expect.arrayContaining([
        'd.okafor.case@revenue-office.example',
        'GR16 0110 1250 0000 0001 2300 695',
        '+30 210 555 0142',
        'TX-2026-884213',
        '5520934417',
      ]),
    )
  })

  it('leaves dates and amounts alone, because the explanation needs them', () => {
    const out = redact(SAMPLE_LETTER, entities)
    expect(out).toContain('14 December 2026')
    expect(out).toContain('412.60 EUR')
    expect(findByPattern('Pay by 30.11.2026 or 2026-11-30.')).toEqual([])
  })

  it('removes every hidden value from the text that is sent', () => {
    const out = redact(SAMPLE_LETTER, entities)
    for (const v of values) expect(out).not.toContain(v)
  })

  it('puts the real values back exactly', () => {
    expect(rehydrate(redact(SAMPLE_LETTER, entities), entities)).toBe(SAMPLE_LETTER)
  })
})

describe('addEntities', () => {
  it('numbers placeholders per type and skips duplicates and nested values', () => {
    const list = addEntities(entities, [
      { value: 'Daniel Okafor', type: 'NAME' },
      { value: 'Daniel Okafor', type: 'NAME' },
      { value: '884213', type: 'ID' },
      { value: 'ab', type: 'OTHER' },
    ], 'you')
    expect(list.length).toBe(entities.length + 1)
    expect(list.at(-1)).toMatchObject({ placeholder: '[NAME_1]', foundBy: 'you' })
  })

  it('hides a surname that appears on its own, and still restores the letter', () => {
    const list = addEntities(entities, withNameParts([{ value: 'Mr. Daniel Okafor', type: 'NAME' }]), 'model')
    const out = redact(SAMPLE_LETTER, list)
    expect(out).not.toContain('Okafor')
    expect(out).not.toContain('Daniel')
    expect(list.map((e) => e.value)).not.toContain('Mr')
    expect(rehydrate(out, list)).toBe(SAMPLE_LETTER)
  })
})

describe('chunk', () => {
  it('splits long text without losing any of it', () => {
    const long = Array.from({ length: 400 }, (_, i) => `Line ${i} of the letter.`).join('\n')
    const parts = chunk(long, 1000)
    expect(parts.length).toBeGreaterThan(1)
    expect(parts.join('')).toBe(long)
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(1000)
  })
})

describe('whole-word matching', () => {
  it('does not redact inside longer words or numbers', () => {
    const list = addEntities([], [{ value: 'Daniel', type: 'NAME' }, { value: '123456', type: 'ID' }], 'you')
    const out = redact('Daniel met Danielson. Ref 123456, not 91234567.', list)
    expect(out).toBe('[NAME_1] met Danielson. Ref [ID_1], not 91234567.')
  })
})

describe('line-wrapped values', () => {
  it('hides a bank account that a PDF wrapped onto the next line', () => {
    const text = 'Pay to IBAN GR16 0110 1250 0000 0001 2300\n695, quoting the reference.'
    const list = addEntities([], findByPattern(text), 'pattern')
    const out = redact(text, list)
    expect(out).toBe('Pay to IBAN [ACCOUNT_1], quoting the reference.')
    expect(rehydrate(out, list)).toBe(text)
  })
})
