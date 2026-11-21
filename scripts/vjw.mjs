// The vjw-shader skill's CLI (../SKILL.md): drives the G shader editor open in the VeeJay Wizard site through the site's
// AI relay. Node ≥ 18, built-ins only (a standalone copy of the project's web/scripts/ai-shader.mjs, remote only).
//   node vjw.mjs push <file.glsl> [name] [--no-still]   the code into the editor: "Playing" + "still: <png beside the file>",
//                                                       or "line N: msg" lines
//   node vjw.mjs state                                  the editor's code, its last errors, who wrote it last (JSON)
//   node vjw.mjs export <name>                          the editor's shader as <name>.glsl, downloaded in the user's browser
//   node vjw.mjs guide                                  the full guide (markdown; no token needed)
//   … --room <code>                                     any command: the user's room code (beside Connect in G), over VJW_ROOM
// env VJW_URL: the site address (https://<host>/<path>) and VJW_AI_TOKEN: the token, both from the site owner and both
// required; VJW_ROOM: the room code beside Connect in the user's G editor (default main: the relay's room before rooms).
// Exit 0: ok, 1: refused (GLSL errors, no editor, a wrong token, no network), 2: usage or set-up.
import { realpathSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export const USAGE = 'usage: node vjw.mjs push <file.glsl> [name] [--no-still] | state | export <name> | guide, each with [--room <code>]'
const PNG = 'data:image/png;base64,'

/** One run: `args` without node and the script; resolves to the exit code. `env`, `fetch` and `log` are the tests' seams. */
export async function main(args, { env = process.env, fetch = globalThis.fetch, log = console.log } = {}) {
  const at = args.indexOf('--room') // --room <code>, anywhere in the line
  const still = !args.includes('--no-still')
  const [cmd, arg, name] = args.filter((a, i) => a !== '--no-still' && (at < 0 || (i !== at && i !== at + 1)))
  if ((at >= 0 && !args[at + 1]) || !(cmd === 'state' || cmd === 'guide' || ((cmd === 'push' || cmd === 'export') && arg))) {
    log(USAGE)
    return 2
  }
  const base = env.VJW_URL?.trim().replace(/\/+$/, '')
  if (!base) {
    log('error: set VJW_URL to the site address from the site owner (export VJW_URL=https://<host>/<path>)')
    return 2
  }
  const token = env.VJW_AI_TOKEN?.trim()
  if (!token && cmd !== 'guide') {
    log('error: set VJW_AI_TOKEN to the token from the site owner (export VJW_AI_TOKEN=<token>)')
    return 2
  }
  const room = (at < 0 ? env.VJW_ROOM : args[at + 1])?.trim() || 'main' // the relay routes each call to that room's editor
  /** One call to the relay: its JSON answer (the guide: `{ ok, text }`), or why none came. */
  const call = async (path, body) => {
    const url = `${base}/__ai/${path}`
    let r
    try {
      const headers = { ...(token && { authorization: `Bearer ${token}`, 'x-vjw-room': room }), ...(body && { 'content-type': 'application/json' }) }
      r = await fetch(url, { headers, ...(body && { method: 'POST', body: JSON.stringify(body) }) })
    } catch (e) {
      return { ok: false, error: `cannot reach ${url} (${e.cause?.code ?? e.cause?.message ?? e.message}): check VJW_URL` }
    }
    if (r.status === 401) return { ok: false, error: 'the server refused the token (401): check VJW_AI_TOKEN' }
    const text = await r.text()
    if (path === 'guide' && r.ok) return { ok: true, text }
    try {
      return JSON.parse(text)
    } catch {
      return { ok: false, error: `HTTP ${r.status} ${r.statusText} from ${url}, not the relay: check VJW_URL` } // nginx's error pages are HTML
    }
  }

  let r
  if (cmd === 'push') {
    let code
    try {
      code = await readFile(arg, 'utf8')
    } catch (e) {
      log(`error: cannot read ${arg} (${e.code ?? e.message})`)
      return 2
    }
    r = await call('shader', { code, ...(name && { name }), ...(!still && { still: false }) })
    if (typeof r.png === 'string' && r.png.startsWith(PNG)) {
      const file = arg.replace(/(\.[^./\\]*)?$/, '.png') // beside the shader: rings.glsl → rings.png
      await writeFile(file, Buffer.from(r.png.slice(PNG.length), 'base64'))
      r.still = file
    }
    for (const e of r.errors ?? []) log(e.line ? `line ${e.line}: ${e.msg}` : e.msg)
    if (r.status) log(r.status)
    if (r.still) log(`still: ${r.still}`)
  } else if (cmd === 'export') {
    r = await call('export', { name: arg })
    if (r.file) log(`exported: ${r.file}`)
    if (r.status) log(r.status)
  } else if (cmd === 'guide') {
    r = await call('guide')
    if (r.text) log(r.text)
  } else {
    r = await call('state')
    if (r.ok !== false) log(JSON.stringify(r, null, 2))
  }
  if (r.error) log(`error: ${r.error}`)
  if (r.error?.startsWith('no G editor open in room ')) log('hint: ask the user for the room code beside Connect (site → Start → G → Remote AI), then run again with --room <code>')
  return r.ok === false ? 1 : 0
}

/** Run as a command, not when a test imports it: argv[1] may be a symlink (the skill linked into ~/.claude/skills/). */
const direct = () => {
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
  } catch {
    return false
  }
}
if (direct()) process.exitCode = await main(process.argv.slice(2))
