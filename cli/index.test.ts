import { expect, test } from 'bun:test'

const root = new URL('..', import.meta.url).pathname

function check(file: string) {
  const out = Bun.spawnSync(['bun', 'cli/index.ts', 'check', file], { cwd: root })
  return { code: out.exitCode, said: out.stdout.toString() }
}

test('a legal script passes, however awkward it is written', () => {
  const run = check('cli/test/legal.lua')
  expect(run.said).toContain('0 problems')
  expect(run.code).toBe(0)
})

test('a dirty script is told every mistake it made', () => {
  const run = check('cli/test/dirty.lua')
  expect(run.code).toBe(1)
  for (const said of [
    'Game.enemys is not part of the bot API',
    'Game.walk wants a string at argument 1, given a number',
    'wait wants a number at argument 1, given a string',
    'log wants a string at argument 1, given a table',
    'me.nmae is not part of Game.me',
    'one.nmae is not part of Game.enemies()',
  ]) {
    expect(run.said).toContain(said)
  }
})

test('a script with no header is not listed but still runs', () => {
  const run = check('cli/test/legal.lua')
  expect(run.said).not.toContain('no `--- name:`')
})

test('the shipped class rotation passes, and the whole folder is checked', () => {
  const one = check('scripts/classes/SwordMaster.lua')
  expect(one.code).toBe(0)
  expect(one.said).toContain('0 problems')

  const all = Bun.spawnSync(['bun', 'cli/index.ts', 'check'], { cwd: root })
  expect(all.stdout.toString()).toContain('scripts/classes/SwordMaster.lua')
  expect(all.exitCode).toBe(0)
})

test('a class script reads and holds, and is not offered the bot actions', () => {
  const legal = check('cli/test/classes/healer/hymn.lua')
  expect(legal.said).toContain('0 problems')
  expect(legal.code).toBe(0)

  const acting = check('cli/test/classes/healer/acting.lua')
  expect(acting.code).toBe(1)
  expect(acting.said).toContain('Game.walk is not part of the class API')
})
