--- name: Legal
--- desc: Legal, awkward, and it has to pass: shadowing, nested functions, long strings.
--- tags: test
--- author: Beatrix

-- Game.enemies() here is a comment, not code.
--[[ A long comment mentioning Game.nope() and "unbalanced ]]
log("Game.nope() and -- are only text in here")
log([[
Game.nope()
]])
local Game2 = Game
local me = Game.me
local name = me.name or "nobody"

local function describe(who)
  return who .. " at " .. tostring(me.cell)
end

log(describe(name))
log("two" ..
  " parts")

local foes = Game.enemies()
for i, one in ipairs(foes) do
  if one.alive then
    log(i .. ": " .. one.name .. " " .. one.cell)
  end
end

for _, p in ipairs(Game.players()) do
  log(p.name .. " " .. tostring(p.hp))
end

local t = { count = #foes }
function t:total()
  return self.count
end
log(t:total() .. " foes")

wait(0)
Game.walk(tostring(me.cell), tostring(me.pad))
Game.travel("portalundead")
Game.kill(foes[1])
Game.kill()
log("hp " .. me.hp .. "/" .. me.hp_max)
for _, one in ipairs(Game.enemies()) do
  if one.alive then
    Combat.fight(one, 5)
    Game.kill(one)
  end
end
log([[a long string]])
