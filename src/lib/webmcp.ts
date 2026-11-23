/**
 * WebMCP: lets an AI agent running in the visitor's browser use the decoder through tools
 * the page registers. The tools run inside this page, so they go through exactly the same
 * pipeline as a person clicking: personal details are hidden on the device first, and only
 * redacted text is ever sent to the cloud model through Firebase AI Logic.
 *
 * Privacy rule for every tool: real names and numbers are never returned to the agent, because
 * the agent may itself be a cloud model. Tools return placeholders such as [NAME_1]; the page
 * shows the person the filled-in version.
 *
 * API: https://developer.chrome.com/docs/ai/webmcp/imperative-api (origin trial, draft spec).
 */

export interface ToolAnnotations {
  readOnlyHint?: boolean
  untrustedContentHint?: boolean
  consequentialHint?: boolean
}

export interface WebMcpTool {
  name: string
  title?: string
  description: string
  inputSchema: Record<string, unknown>
  annotations?: ToolAnnotations
  execute: (input: Record<string, unknown>, options?: { signal?: AbortSignal }) => Promise<unknown>
}

interface ModelContext {
  registerTool(tool: WebMcpTool, options?: { signal?: AbortSignal }): Promise<void> | void
}

/** `document.modelContext` is current; `navigator.modelContext` is the older, deprecated location. */
export function getModelContext(): ModelContext | null {
  const doc = (document as unknown as { modelContext?: ModelContext }).modelContext
  const nav = (navigator as unknown as { modelContext?: ModelContext }).modelContext
  return doc ?? nav ?? null
}

/** Registers tools for as long as `signal` is not aborted. Does nothing in browsers without WebMCP. */
export async function registerTools(tools: WebMcpTool[], signal: AbortSignal): Promise<number> {
  const mc = getModelContext()
  if (!mc) return 0
  let count = 0
  for (const tool of tools) {
    if (signal.aborted) break
    try {
      await mc.registerTool(tool, { signal })
      count++
    } catch (e) {
      // A duplicate name (for example from a hot reload in development) must not stop the rest.
      console.warn(`WebMCP: could not register ${tool.name}`, e)
    }
  }
  return count
}

/** The browser does not validate input against the schema, so every tool checks its own input. */
export function requireString(input: Record<string, unknown>, key: string, min: number, max: number): string {
  const value = input[key]
  if (typeof value !== 'string') throw new Error(`"${key}" must be text.`)
  const trimmed = value.trim()
  if (trimmed.length < min) throw new Error(`"${key}" is too short (at least ${min} characters).`)
  if (trimmed.length > max) throw new Error(`"${key}" is too long (at most ${max.toLocaleString()} characters).`)
  return trimmed
}

/** Adds the WebMCP origin-trial token to the page, so tools work for visitors without a Chrome flag. */
export function installOriginTrial(token: string | undefined) {
  if (!token || document.querySelector('meta[http-equiv="origin-trial"]')) return
  const meta = document.createElement('meta')
  meta.httpEquiv = 'origin-trial'
  meta.content = token
  document.head.append(meta)
}
