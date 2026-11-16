--- name: Hymn
--- class: Healer
--- desc: A rotation fixture: reads the target, holds when there is nothing to do.
--- tags: test
--- author: Beatrix

local last = nil

function tick()
  local target = Game.target()
  if not target or not target.alive then
    return nil
  end
  local me = Game.me
  if me.hp / me.hp_max < 0.5 and (me.auras["Radiance"] == nil or me.auras["Radiance"].ms < 2000) then
    return "a2"
  end
  for _, one in ipairs(Game.enemies()) do
    if one.hitting and one.id == target.id then
      last = one.targets[1]
    end
  end
  log("holding on " .. tostring(last))
  return "a1"
end
