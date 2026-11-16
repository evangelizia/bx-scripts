--- name: SwordMaster
--- class: SwordMaster
--- desc: Uke Negashi for permanent Evasion, Nukiuchi and Sever for guaranteed Vitals, Spinning Dragon and Precise Cut, Bladefury for crit, Nukitsuke filler.
--- tags: dps, dodge, melee, solo, legion
--- author: Beatrix

-- The engine answers `tick()` with a slot and sends the frame itself. `Game.skill`
-- gives the slot a name lives in, and `ready` is the engine's own answer to
-- "may it go out this tick" — off cooldown and affordable.

local function can(name)
  local skill = Game.skill(name)
  if skill and skill.ready then
    return skill
  end
  return nil
end

function tick()
  local me = Game.me
  if me == nil or not me.alive then
    return nil
  end
  local target = Game.target()
  local evasion = me.auras["Evasion"]

  -- Uke Negashi: 10 mana, 25 s. Grants Evasion, +25% Dodge and +15% Crit
  -- Chance for 25 s, and resets Technique. Duration matches the cooldown, so
  -- Evasion can be held permanently: refresh it the moment it drops. Dodge is
  -- the class's mana and healing engine under the Rogue model, so this goes
  -- first, target or not.
  local uke = can("Uke Negashi")
  if uke and (evasion == nil or evasion.ms < 3000) then
    return uke.slot
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
  local nukiuchi = can("Nukiuchi")
  if nukiuchi then
    return nukiuchi.slot
  end

  -- Sever: 15 mana, 9 s, 240% physical. Cuts the target's Outgoing Damage by
  -- 70% for 5 s, the class's main mitigation, and has a 35% chance of Precise
  -- Cut, -30% Damage Resistance for 5 s.
  local sever = can("Sever")
  if sever then
    return sever.slot
  end

  -- Bladefury: 0 mana, 5 s, 60% physical to 4 targets. A 25% chance per target
  -- hit to apply Bladefury, +15% Crit Chance and +50% Crit Damage for 5 s.
  -- Keen Reflexes (+25% Dodge, +20% Crit Damage) and Tanden (+20% Outgoing
  -- Damage) are passive and need no casting.
  local bladefury = can("Bladefury")
  if bladefury then
    return bladefury.slot
  end

  -- Nukitsuke is the filler: it exists so a free hit is always there.
  local auto = can("Auto Attack")
  if auto then
    return auto.slot
  end
  return nil
end
