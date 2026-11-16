--- name: SwordMaster
--- class: SwordMaster
--- desc: Uke Negashi for permanent Evasion, Nukiuchi and Sever for guaranteed Vitals, Spinning Dragon and Precise Cut, Bladefury for crit, Nukitsuke filler.
--- tags: dps, dodge, melee, solo, legion
--- author: Beatrix

-- The engine answers `tick()` with a slot and sends the frame itself; `since`
-- is milliseconds since the engine last cast it, so `since >= cd` is "ready"
-- and the first cast of a fight reads the same as any later one.

local function bar()
  local by_name = {}
  for _, skill in ipairs(Game.skills()) do
    by_name[skill.name] = skill
  end
  return by_name
end

local function ready(skills, name, mp)
  local skill = skills[name]
  return skill and skill.since >= skill.cd and skill.mp <= mp
end

function tick()
  local me = Game.me
  if me == nil or not me.alive then
    return nil
  end
  local skills = bar()
  local target = Game.target()
  local evasion = me.auras["Evasion"]

  -- Uke Negashi: 10 mana, 25 s. Grants Evasion, +25% Dodge and +15% Crit
  -- Chance for 25 s, and resets Technique. Duration matches the cooldown, so
  -- Evasion can be held permanently: refresh it the moment it drops. Dodge is
  -- the class's mana and healing engine under the Rogue model, so this goes
  -- first, target or not.
  if ready(skills, "Uke Negashi", me.mp) and (evasion == nil or evasion.ms < 3000) then
    return skills["Uke Negashi"].slot
  end

  if target == nil or not target.alive then
    return nil
  end

  -- Technique is passive: every 5 s the next skill to hit applies Vitals, a DoT
  -- scaled by that skill's damage, and lands that skill's chance effects for
  -- free. The order below puts the strongest proc first, so whichever skill is
  -- ready when Vitals can be applied seeds the biggest DoT.

  -- Nukiuchi: 20 mana, 10 s, 500% physical. The nuke. Its 50% stun for 2 s and
  -- 50% Spinning Dragon, which zeroes the target's next attack, both become
  -- certain under Technique. Ahead of Sever so the largest strike seeds Vitals.
  if ready(skills, "Nukiuchi", me.mp) then
    return skills["Nukiuchi"].slot
  end

  -- Sever: 15 mana, 9 s, 240% physical. Cuts the target's Outgoing Damage by
  -- 70% for 5 s, the class's main mitigation, and has a 35% chance of Precise
  -- Cut, -30% Damage Resistance for 5 s.
  if ready(skills, "Sever", me.mp) then
    return skills["Sever"].slot
  end

  -- Bladefury: 0 mana, 5 s, 60% physical to 4 targets. A 25% chance per target
  -- hit to apply Bladefury, +15% Crit Chance and +50% Crit Damage for 5 s.
  -- Keen Reflexes (+25% Dodge, +20% Crit Damage) and Tanden (+20% Outgoing
  -- Damage) are passive and need no casting.
  if ready(skills, "Bladefury", me.mp) then
    return skills["Bladefury"].slot
  end

  -- Nukitsuke is the filler: it exists so a free hit is always there.
  if ready(skills, "Auto Attack", me.mp) then
    return skills["Auto Attack"].slot
  end
  return nil
end
