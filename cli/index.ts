import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/** A call takes between `[0]` and `[1]` arguments. */
type Call = [number, number]

type Api = {
  calls: Record<string, Call>
  params: Record<string, string[]>
  values: Record<string, string[]>
}

const ROOT = new URL('..', import.meta.url).pathname
const manifest: Record<string, Api> = JSON.parse(readFileSync(join(ROOT, 'api.json'), 'utf8'))

/** Bots and classes are two different APIs; the folder decides which one. */
function apiFor(path: string): { api: Api; kind: string } {
  return path.includes('/classes/')
    ? { api: manifest.classes, kind: 'class' }
    : { api: manifest.bots, kind: 'bot' }
}

/** Every `.lua` under a folder, in path order so runs and indexes agree. */
function files(under: string): string[] {
  if (!statSync(under).isDirectory()) return under.endsWith('.lua') ? [under] : []
  const out: string[] = []
  for (const entry of readdirSync(under, { withFileTypes: true })) {
    const path = join(under, entry.name)
    if (entry.isDirectory()) out.push(...files(path))
    else if (entry.name.endsWith('.lua')) out.push(path)
  }
  return out.sort()
}

/** Comments become spaces, string bodies `s`, so offsets and newlines survive but
 * no name inside either is ever read as code. */
function clean(src: string): string {
  let out = ''
  let at = 0
  const blank = (text: string) => text.replace(/[^\n]/g, ' ')
  const body = (text: string) => text.replace(/[^\n]/g, 's')
  while (at < src.length) {
    const line = src.startsWith('--', at) ? src.indexOf('\n', at) : -1
    if (line >= 0 || src.startsWith('--', at)) {
      const stop = line < 0 ? src.length : line
      out += blank(src.slice(at, stop))
      at = stop
      continue
    }
    const quote = src[at]
    if (quote === '"' || quote === "'") {
      let end = at + 1
      while (end < src.length && src[end] !== quote) end += src[end] === '\\' ? 2 : 1
      out += body(src.slice(at, Math.min(end + 1, src.length)))
      at = Math.min(end + 1, src.length)
      continue
    }
    const long = /^\[(=*)\[/.exec(src.slice(at))
    if (long) {
      const close = `]${long[1]}]`
      const end = src.indexOf(close, at + long[0].length)
      const stop = end < 0 ? src.length : end + close.length
      out += body(src.slice(at, stop))
      at = stop
      continue
    }
    out += quote
    at += 1
  }
  return out
}

/** The `---` lines at the top, one field each, unknown keys kept out of the way. */
function header(src: string): { fields: Record<string, string>; first: number } {
  const fields: Record<string, string> = {}
  let last = ''
  const lines = src.split('\n')
  let at = 0
  for (; at < lines.length; at += 1) {
    if (!lines[at].startsWith('---')) break
    const body = lines[at].slice(3).trim()
    const colon = body.indexOf(':')
    if (colon > 0) {
      last = body.slice(0, colon).trim().toLowerCase()
      fields[last] = body.slice(colon + 1).trim()
    } else if (last && body) {
      fields[last] = `${fields[last]} ${body}`.trim()
    }
  }
  return { fields, first: at }
}

/** The Lua type of an argument, when the argument says it plainly. */
function guessType(text: string): string | null {
  const one = text.trim()
  if (!one) return null
  if (/^(['"]).*\1$/s.test(one)) return 'string'
  if (/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(one)) return 'number'
  if (one === 'true' || one === 'false') return 'boolean'
  if (one === 'nil') return 'nil'
  if (one.startsWith('{')) return 'table'
  if (/^\[=*\[/.test(one)) return 'string'
  if (one.includes('..')) return 'string'
  if (one.startsWith('#')) return 'number'
  if (/^Game\.(me|enemies|players)\b/.test(one)) return 'table'
  return null
}

/** Where each top-level argument of the call whose `(` is at `open` starts and ends. */
function argumentsAt(src: string, open: number): number {
  let depth = 0
  let count = 0
  let filled = false
  for (let at = open; at < src.length; at += 1) {
    const ch = src[at]
    if (ch === '(') depth += 1
    else if (ch === ')') {
      depth -= 1
      if (depth === 0) return filled ? count + 1 : 0
    } else if (depth === 1 && ch === ',') count += 1
    else if (depth === 1 && !/\s/.test(ch)) filled = true
  }
  return filled ? count + 1 : 0
}

function argumentSlices(src: string, open: number): Array<[number, number]> {
  const out: Array<[number, number]> = []
  let depth = 0
  let start = open + 1
  for (let at = open + 1; at < src.length; at += 1) {
    const ch = src[at]
    if (ch === '(' || ch === '{' || ch === '[') depth += 1
    else if (ch === ')' && depth === 0) {
      if (src.slice(start, at).trim()) out.push([start, at])
      return out
    } else if (ch === ')' || ch === '}' || ch === ']') depth -= 1
    else if (ch === ',' && depth === 0) {
      out.push([start, at])
      start = at + 1
    }
  }
  return out
}

function article(type: string): string {
  return type === 'any' ? type : `${/^[aeiou]/.test(type) ? 'an' : 'a'} ${type}`
}

function lineAt(src: string, offset: number): number {
  return src.slice(0, offset).split('\n').length
}

/** Names a script binds to a table the engine hands it, so its fields can be
 * checked: `local me = Game.me`, `local foes = Game.enemies()`, and the loop
 * variable of `for _, one in ipairs(foes)`. */
function bindings(body: string, api: Api): Map<string, string> {
  const lists = new Map<string, string>()
  const known = new Map<string, string>()
  for (const one of body.matchAll(/\blocal\s+([A-Za-z_]\w*)\s*=\s*Game\.me\b/g)) {
    known.set(one[1], 'Game.me')
  }
  for (const one of body.matchAll(/\blocal\s+([A-Za-z_]\w*)\s*=\s*(Game\.(?:enemies|players))\s*\(/g)) {
    lists.set(one[1], `${one[2]}()`)
  }
  for (const one of body.matchAll(/\blocal\s+([A-Za-z_]\w*)\s*=\s*(Game\.(?:enemies|players))\s*\(\s*\)\s*\[/g)) {
    known.set(one[1], `${one[2]}()`)
  }
  for (const one of body.matchAll(
    /\bfor\s+(?:[A-Za-z_]\w*\s*,\s*)?([A-Za-z_]\w*)\s+in\s+ipairs\s*\(\s*([A-Za-z_]\w*|Game\.(?:enemies|players)\s*\(\s*\))\s*\)/g,
  )) {
    // The group already carries `()` when the list is written out in the loop.
    const list = one[2].startsWith('Game.')
      ? one[2].replace(/\s+/g, '')
      : lists.get(one[2])
    if (list && api.values[list]) known.set(one[1], list)
  }
  return known
}

/** Every dotted name used, called or read, checked against what the engine has. */
function apiProblems(src: string, api: Api, kind: string): string[] {
  const body = clean(src)
  const problems: string[] = []
  const bound = bindings(body, api)
  const name = /\b([A-Za-z_]\w*)((?:\s*\.\s*[A-Za-z_]\w*)*)/g
  for (let match = name.exec(body); match; match = name.exec(body)) {
    const dotted = match[1] + match[2].replace(/\s+/g, '')
    // A bound table's fields are checked too: `me.hp_max`, `one.name`.
    const dot = dotted.indexOf('.')
    const table = dot > 0 ? bound.get(dotted.slice(0, dot)) : undefined
    if (table) {
      const field = dotted.slice(dot + 1).split('.')[0]
      if (!api.values[table]?.includes(field)) {
        problems.push(`${lineAt(src, match.index)}: ${dotted} is not part of ${table}`)
      }
      continue
    }
    // Only names the engine owns: `Game2`, locals and the script's own
    // functions pass, and so does handing the table itself around.
    const owned =
      dotted === 'Game' ||
      dotted === 'Combat' ||
      dotted.startsWith('Game.') ||
      dotted.startsWith('Combat.') ||
      Boolean(api.calls[dotted])
    if (!owned || api.values[dotted]) continue
    const after = body.slice(match.index + match[0].length)
    const called = /^\s*\(/.test(after)
    const where = `${lineAt(src, match.index)}`
    if (called) {
      const open = body.indexOf('(', match.index + match[0].length)
      const count = argumentsAt(body, open)
      const limits = api.calls[dotted]
      if (!limits) {
        problems.push(`${where}: ${dotted} is not part of the ${kind} API`)
        continue
      }
      if (count < limits[0] || count > limits[1]) {
        const want = limits[0] === limits[1] ? `${limits[0]}` : `${limits[0]} to ${limits[1]}`
        problems.push(`${where}: ${dotted} takes ${want} arguments, given ${count}`)
        continue
      }
      const wants = api.params[dotted] ?? []
      argumentSlices(body, open).forEach(([start, end], at) => {
        const want = wants[at]
        const piece = src.slice(start, end).trim()
        // A name bound to a table is a table: `Game.kill(one)`.
        const got = guessType(piece) ?? (bound.has(piece) ? 'table' : null)
        if (want && want !== 'any' && got && got !== want) {
          problems.push(`${where}: ${dotted} wants ${article(want)} at argument ${at + 1}, given ${article(got)}`)
        }
      })
      continue
    }
    if (api.calls[dotted]) continue
    const last = dotted.lastIndexOf('.')
    const owner = dotted.slice(0, last)
    const key = dotted.slice(last + 1)
    if (!api.values[owner]?.includes(key)) {
      problems.push(`${where}: ${dotted} is not part of the ${kind} API`)
    }
  }
  return problems
}

/** The metadata a script needs to be listed; empty when it has a header and is fine. */
function headerProblems(fields: Record<string, string>): string[] {
  if (!fields.name) return ['no `--- name:` line, so it will not be listed']
  if (!fields.desc) return ['no `--- desc:` line, so it will not be listed']
  return []
}

/** One Lua 5.4 engine for the run, or null when wasmoon is not installed. */
async function luaEngine(): Promise<any | null> {
  try {
    const factory = await import('wasmoon')
    return await new factory.LuaFactory().createEngine()
  } catch {
    console.log('syntax not checked: run `bun install` for wasmoon')
    return null
  }
}

/** Compiles the chunk and returns what the engine would say, without running it. */
const ASK = `local f, err = load(src, name)
if f then return "" else return tostring(err) end`

async function syntaxProblem(lua: any, source: string, name: string): Promise<string | null> {
  if (!lua) return null
  lua.global.set('src', source)
  lua.global.set('name', `@${name}`)
  const error = String(await lua.doString(ASK))
  if (!error) return null
  return error.startsWith(`${name}:`) ? error.slice(name.length + 1) : error
}

function hash(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

async function check(paths: string[]): Promise<number> {
  let problems = 0
  let seen = 0
  const lua = await luaEngine()
  for (const path of paths) {
    const bytes = readFileSync(path)
    const src = bytes.toString('utf8')
    const shown = path.startsWith(ROOT) ? relative(ROOT, path) : path
    const { fields } = header(src)
    const spec = apiFor(path)
    const found = [
      ...headerProblems(fields).map((one) => `${shown}: ${one}`),
      ...apiProblems(src, spec.api, spec.kind).map((one) => `${shown}:${one}`),
    ]
    const broken = await syntaxProblem(lua, src, path.split('/').pop() ?? shown)
    if (broken) found.push(`${shown}:${broken}`)
    seen += 1
    problems += found.length
    for (const one of found) console.log(`problem ${one}`)
    if (found.length === 0) console.log(`ok      ${shown} ${hash(bytes).slice(0, 8)}`)
  }
  lua?.global.close()
  console.log(`${problems} problems in ${seen} scripts`)
  return problems === 0 ? 0 : 1
}

function headers(fields: Record<string, string>): boolean {
  return Boolean(fields.name && fields.desc)
}

function index(paths: string[]): number {
  const scripts = paths
    .map((path) => {
      const bytes = readFileSync(path)
      const { fields } = header(bytes.toString('utf8'))
      if (!headers(fields)) {
        console.log(`skipped ${relative(ROOT, path)}: no name or desc`)
        return null
      }
      return {
        // Which engine runs it, so an installer knows where the file belongs.
        kind: path.includes('/classes/') ? 'class' : 'bot',
        hash: hash(bytes),
        name: fields.name,
        desc: fields.desc,
        tags: (fields.tags ?? '')
          .split(',')
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
        author: fields.author ?? '',
        size: bytes.length,
        file: relative(ROOT, path),
      }
    })
    .filter((one) => one !== null)
    .sort((a, b) => a.name.localeCompare(b.name) || a.file.localeCompare(b.file))
  writeFileSync(join(ROOT, 'index.json'), `${JSON.stringify({ scripts }, null, 2)}\n`)
  console.log(`indexed ${scripts.length} scripts`)
  return 0
}

const [command, ...rest] = process.argv.slice(2)
// Both kinds of script, checked and indexed: a class script is installed the
// same way a bot script is.
const roots =
  rest.length > 0 ? rest : [join(ROOT, 'scripts/bots'), join(ROOT, 'scripts/classes')]
const paths = roots.flatMap((root) => files(root))

const code =
  command === 'index' ? index(paths) : command === 'check' || !command ? await check(paths) : usage()
process.exit(code)

function usage(): number {
  console.log('usage: bun cli/index.ts check|index [paths...]')
  return 2
}
