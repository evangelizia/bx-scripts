--- name: Hunt
--- desc: Kills every monster in the area, one at a time, until none are left.
--- tags: combat, demo
--- author: Beatrix

local rounds = 0
while rounds < 200 do
  rounds = rounds + 1
  local foe = nil
  for _, one in ipairs(Game.enemies()) do
    if one.alive then
      foe = one
      break
    end
  end
  if foe == nil then
    log("nothing left in " .. Game.map())
    break
  end
  log("fighting " .. foe.name .. " at " .. foe.cell)
  if Game.kill(foe) then
    log("killed " .. foe.name)
  else
    log("gave up on " .. foe.name)
  end
  wait(500)
end
