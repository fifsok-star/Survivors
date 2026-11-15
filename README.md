# Survivors

A co-op climbing adventure for 2–6 players that runs in the browser. Your plane crashed on an island; the only place with signal is the top of the mountain. No install, no account – one player creates a room, the rest join with a code.

**Play:** https://fifsok-star.github.io/Survivors/

## What's in the game

- **Room-based multiplayer** (peer-to-peer, PeerJS) for 2–6 players, with a lobby and six characters to pick from. Your character, name and settings are remembered.
- **Stamina is everything.** Sprinting, climbing, carrying and swimming drain it; it refills when you stand still. Hunger and injuries shrink the maximum – eat, and rest by campfires.
- **Beach → jungle → a long mountain (~550 m) in six biomes:** alpine meadows, dark roots (fog, poison spore clouds), the red canyon (heat – cool down at oases), icy slopes (cold – warm up by fires, flares and tea), the storm ridge (gales – shelter behind boulders, lightning) and the volcano (lava pools, steam vents that throw you up). Lost suitcases full of items are hidden all over the island.
- **Jungle tasks.** Build a footbridge by carrying logs together, read the totem order from the top of the lookout tree, hold pressure plates at the same time to win the two-man saw, cut the fallen tree together, lash a bigger bridge with rope – and then the mountain appears.
- **Climbing with friends.** Steep walls are climbed automatically; run out of stamina and you slide down. Hammer pitons for resting spots, fix ropes on stakes for the rest of the crew, boost a teammate from below or pull them over the edge. Pits can only be left on a rope.
- **Items:** 3 quick slots + a 6-slot backpack. Dropped things tumble down slopes, so somebody has to go back for them.
- **Treasure maps:** find a map and a shovel, look for the X and dig.
- **Settings:** mouse sensitivity, invert Y, field of view, shadows, light brightness, graphics quality, view distance, volume, FPS counter.
- **Languages:** Polski, English, Deutsch, Français, Українська.
- Voice chat is not built in – the menu has a button to the crew's Discord server. The invite link is kept out of the source: put it in `secrets.local.json` (`{"discord": "https://discord.gg/…"}`, ignored by git) and `tools/build.js` bakes it, scrambled, into `game.pak.js`.

## Controls

`WASD` move · `Shift` sprint · `Space` jump · mouse – camera · `E` interact (hold when a bar shows) · `F` / left click – use item · `1` `2` `3` / wheel – quick slots · `Tab` backpack · `G` drop · `Esc` pause

## Development

**After changing anything in `js/`, run `node tools/build.js`.** The published game loads `game.pak.js` – a compressed, scrambled build – so players can't read the code, puzzle answers or hidden spots in the browser. A local server (or `?dev=1`) runs the readable sources; `?pak=1` forces the build locally.


Plain HTML + JavaScript, no build step. Serve the folder with any static server (`python -m http.server`) and open it.
Add `?local=1` to test several players in tabs of one browser without the PeerJS cloud (`?local=1&auto=host&room=TEST`, then `?local=1&auto=1&join=TEST`).

- `js/world.js` – terrain maths and the static layout of the island
- `js/gfx.js` – rendering, models, vegetation, characters
- `js/host.js` – host-side authority over the shared world
- `js/game.js`, `js/ui.js` – player, interactions, HUD, menus
- `js/i18n.js` – translations
- `assets/models.glb` – all 3D models, built in Blender by the scripts in `tools/blender/` (`run_all.py` rebuilds and exports them)

---

## Po polsku

Kooperacyjna gra przygodowo-wspinaczkowa dla 2–6 osób, działająca w przeglądarce. Wasz samolot rozbił się na wyspie, a sygnał jest tylko na szczycie góry. Jedna osoba tworzy pokój, reszta dołącza kodem. Czat głosowy – przez Discorda (przycisk w menu).
