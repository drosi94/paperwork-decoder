/** On-device availability, read straight from Chrome's Prompt API. No Firebase needed. */
export type DeviceStatus = 'available' | 'downloadable' | 'downloading' | 'unavailable'

export async function deviceStatus(): Promise<DeviceStatus> {
  const lm = (globalThis as { LanguageModel?: { availability(o?: object): Promise<DeviceStatus> } }).LanguageModel
  if (!lm) return 'unavailable'
  try {
    return await lm.availability({ expectedInputs: [{ type: 'text' }, { type: 'image' }] })
  } catch {
    return 'unavailable'
  }
}
