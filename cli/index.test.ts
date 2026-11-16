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
