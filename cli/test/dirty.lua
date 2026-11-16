--- name: Dirty
--- desc: One of every mistake the checker knows, and nothing else.
--- tags: test

Game.enemys()
Game.walk(1, 2)
wait("500")
log({})
local me = Game.me
log(me.nmae)
for _, one in ipairs(Game.enemies()) do
  log(one.nmae)
end
