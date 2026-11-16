# Script API

Written whole by the generator that also writes `api.json`. Do not edit by
hand: change what it reads, then let it write this file again.

A script may call what is written below and nothing else. `bx check`
rejects an unknown name, a wrong argument count, an argument of the
wrong type, and a table field the engine does not set.

## Bots

Scripts in `scripts/bots`.

### Calls

#### `Combat.fight(foe: table, seconds?: number)`

The same kill with the deadline in the script's hands. Gives `true` when the monster died, `false` on the deadline.

#### `Combat.skill(slot: string)`

Casts one slot of the action bar by the ref the game gives it (`aa`, `a1`, and so on). A skill aimed at a monster goes to the fight's monster or the first one alive; one aimed at a friend goes to you. Gives `true` when the frame went out, `false` on an unknown slot, a cooldown, a cost the mana cannot pay, or nothing to aim at.

#### `Combat.stop()`

Stops the engine's rotation, leaving the fight.

#### `Game.area()`

The room inside the map, which is what a fight happens in.

#### `Game.enemies()`

The monsters in the room, as a fresh list of copies taken right now. Gives a list of enemies.

#### `Game.kill(foe?: table)`

Kills one monster, walking into reach and casting by itself. Leaves the monster out to mean the first one still alive. Gives `true` when it died, `false` when it did not.

#### `Game.map()`

The name of the map you are in, or an empty string before the game has said.

#### `Game.now()`

Seconds since this script started, as a number with a fraction.

#### `Game.players()`

Everyone else in the room, as a fresh list of copies. Gives a list of players.

#### `Game.target()`

The monster the engine is fighting, as a copy taken right now. Nothing (`nil`) between fights.

#### `Game.travel(map: string)`

Asks the game to travel to another map through a portal. Gives `true` when a connected game took the request.

#### `Game.walk(cell: string, pad: string)`

Asks the game to walk you to a cell, carrying the pad you name. Gives `true` when a connected game took the request.

#### `log(text: string)`

Appends a line to `script-log`, which the app's Automation panel shows behind its `log` button.

#### `wait(ms: number)`

Stops the script for that many milliseconds. Waiting is legal in a bot script and not in a class script.

#### `wait_until(check: any, seconds: any)`

Waits until the function returns something true, checking every 50 ms. Gives `true`, or `false` once the deadline passes.

### Tables

### `Game.me`

A live view of your character.

| field | type | says |
| --- | --- | --- |
| `name` | string | The name of that character. |
| `id` | number | That account's numeric id. |
| `level` | number | That character's level. |
| `hp` | number | Health now. |
| `hp_max` | number | The most health that character can have. |
| `mp` | number | Mana now. |
| `mp_max` | number | The most mana that character can have. |
| `cell` | string | The cell that character stands on, as the map spells it. |
| `pad` | string | The pad inside that cell. |
| `x` | number | Horizontal position on the map. |
| `y` | number | Vertical position on the map. |
| `monster` | boolean | Whether this entry is a monster rather than a player. |
| `alive` | boolean | Whether that character is still standing. |
| `auras` | table | The auras on that character, by the name the game gives, each with `stacks` and `ms` left. |

### `Game.enemies()`

The monsters in the room, as a fresh list of copies taken right now. Gives a list of enemies.

| field | type | says |
| --- | --- | --- |
| `id` | number | What to pass to `Game.kill`; it never changes for one monster. |
| `name` | string | The monster's name. |
| `level` | number | Monster level. |
| `hp` | number | Health at the moment the list was taken. |
| `hp_max` | number | The most health this monster has. |
| `cell` | string | The cell it stands on, for `Game.walk`. |
| `alive` | boolean | Whether it was still standing when the list was taken. |
| `auras` | table | The auras on it, by the name the game gives, each with `stacks` and `ms` left. |
| `targets` | table | Who the game says this monster is on, by name. Empty when it is on nobody. |
| `hitting` | boolean | Whether this monster has hit you in the last few seconds. |

### `Game.players()`

Everyone else in the room, as a fresh list of copies.

| field | type | says |
| --- | --- | --- |
| `name` | string | The name of that character. |
| `id` | number | That account's numeric id. |
| `level` | number | That character's level. |
| `hp` | number | Health now. |
| `hp_max` | number | The most health that character can have. |
| `mp` | number | Mana now. |
| `mp_max` | number | The most mana that character can have. |
| `cell` | string | The cell that character stands on, as the map spells it. |
| `pad` | string | The pad inside that cell. |
| `x` | number | Horizontal position on the map. |
| `y` | number | Vertical position on the map. |
| `monster` | boolean | Whether this entry is a monster rather than a player. |
| `alive` | boolean | Whether that character is still standing. |
| `auras` | table | The auras on that character, by the name the game gives, each with `stacks` and `ms` left. |

## Classes

Scripts in `scripts/classes`.

### Calls

#### `Game.area()`

The room inside the map, which is what a fight happens in.

#### `Game.enemies()`

The monsters in the room, as a fresh list of copies taken right now. Gives a list of enemies.

#### `Game.map()`

The name of the map you are in, or an empty string before the game has said.

#### `Game.now()`

Seconds since this script started, as a number with a fraction.

#### `Game.players()`

Everyone else in the room, as a fresh list of copies. Gives a list of players.

#### `Game.target()`

The monster the engine is fighting, as a copy taken right now. Nothing (`nil`) between fights.

#### `log(text: string)`

Appends a line to `script-log`, which the app's Automation panel shows behind its `log` button.

A class script is the rotation a fight is played by. It reads the game
and defines `tick()`, which the engine asks once every 100 ms: `return
"a1"` casts that slot and `return nil` casts nothing. There is no
`Combat` table, no `wait` and no `Game.kill`: the engine owns the cast,
the clock and the fight. Without a `--- class:` line of its own, a script
is asked on whatever class is standing; with one, it is asked only while
that class is playing, and the built-in rotation fights otherwise.

### Tables

### `Game.me`

A live view of your character.

| field | type | says |
| --- | --- | --- |
| `name` | string | The name of that character. |
| `id` | number | That account's numeric id. |
| `level` | number | That character's level. |
| `hp` | number | Health now. |
| `hp_max` | number | The most health that character can have. |
| `mp` | number | Mana now. |
| `mp_max` | number | The most mana that character can have. |
| `cell` | string | The cell that character stands on, as the map spells it. |
| `pad` | string | The pad inside that cell. |
| `x` | number | Horizontal position on the map. |
| `y` | number | Vertical position on the map. |
| `monster` | boolean | Whether this entry is a monster rather than a player. |
| `alive` | boolean | Whether that character is still standing. |
| `auras` | table | The auras on that character, by the name the game gives, each with `stacks` and `ms` left. |

### `Game.enemies()`

The monsters in the room, as a fresh list of copies taken right now. Gives a list of enemies.

| field | type | says |
| --- | --- | --- |
| `id` | number | What to pass to `Game.kill`; it never changes for one monster. |
| `name` | string | The monster's name. |
| `level` | number | Monster level. |
| `hp` | number | Health at the moment the list was taken. |
| `hp_max` | number | The most health this monster has. |
| `cell` | string | The cell it stands on, for `Game.walk`. |
| `alive` | boolean | Whether it was still standing when the list was taken. |
| `auras` | table | The auras on it, by the name the game gives, each with `stacks` and `ms` left. |
| `targets` | table | Who the game says this monster is on, by name. Empty when it is on nobody. |
| `hitting` | boolean | Whether this monster has hit you in the last few seconds. |

### `Game.players()`

Everyone else in the room, as a fresh list of copies.

| field | type | says |
| --- | --- | --- |
| `name` | string | The name of that character. |
| `id` | number | That account's numeric id. |
| `level` | number | That character's level. |
| `hp` | number | Health now. |
| `hp_max` | number | The most health that character can have. |
| `mp` | number | Mana now. |
| `mp_max` | number | The most mana that character can have. |
| `cell` | string | The cell that character stands on, as the map spells it. |
| `pad` | string | The pad inside that cell. |
| `x` | number | Horizontal position on the map. |
| `y` | number | Vertical position on the map. |
| `monster` | boolean | Whether this entry is a monster rather than a player. |
| `alive` | boolean | Whether that character is still standing. |
| `auras` | table | The auras on that character, by the name the game gives, each with `stacks` and `ms` left. |

