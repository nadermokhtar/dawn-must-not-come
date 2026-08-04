# CLAUDE.md — Dawn Must Not Come

## What this is
**Dawn Must Not Come** — a single-player, storybook deckbuilding roguelike (Night of the
Full Moon mechanics, re-themed as Scheherazade telling the voyages of Sinbad). The full
design document is **`DESIGN.md`** in this folder — it is the source of truth for
mechanics, content, art direction, and data schemas. Read it before implementing anything.

## Platform & tech
- **Web-based, mobile-first, portrait orientation.** Must play well in a phone browser
  first; desktop is a scaled-up portrait view (max-width column, centered).
- Touch-first interactions: tap to select, drag to play cards; no hover-dependent UI.
- Target: TypeScript + Vite. Rendering via DOM/CSS (cards, manuscript UI) — only reach
  for canvas/WebGL if DOM proves insufficient. No backend; runs fully client-side,
  saves in localStorage.
- Session target is 20–30 min runs — persistence of mid-run state matters (resume a
  run after closing the tab).

## Architecture rules
- **Data-driven content.** Cards, enemies, verses (map nodes), blessings, story forks,
  and narration strings all live in JSON per the schemas in DESIGN.md §9. Adding content
  must never require engine code changes.
- **Engine is pure logic, UI is a renderer.** The battle engine and run state should be
  plain TypeScript with no DOM dependencies so they are unit-testable headlessly.
- Follow the build order in DESIGN.md §9.6. Current milestone: **vertical slice** —
  Sinbad class, Night I only, one boss (The Whale That Was an Island), ~25–30 cards,
  all node kinds, 3 stubbed Story Forks.

## Testing
- Write tests alongside code (user works TDD). Use Vitest for the engine: battle turn
  resolution, damage types/resists, AP/mana accounting, counter triggers, deck
  shuffle/draw/discard, level-up math, Wonder/Mercy thresholds.
- Game logic must be deterministic given a seeded RNG so tests and replays are stable.

## Naming & theme vocabulary (use consistently in code and UI)
- Map node = **Verse**, chapter = **Night**, gold = **Dinars**, relics = **Blessings**,
  shop = **Bazaar**, upgrade = **Calligrapher**, card removal = **House of Forgetting**,
  bank = **Coin Djinn**, stats = **Wonder** & **Mercy**.
- Damage types: steel, true_strike, ifrit_flame, tide, storm, serpent_venom.

## Art & UI
- Palette and style pillars in DESIGN.md §8 — lapis/indigo nights, aged parchment,
  gold-leaf accents. Everything sits inside a manuscript frame with page-turn
  transitions. Card rarity is expressed as illumination (ink → gold corners → full
  illuminated border).
- Placeholder art is fine for the slice; keep `art_ref` paths in data so real art
  drops in later.
- **Asset layout is fixed** (DESIGN.md §9.5): everything under `/assets` in
  `/anchors` (style references, never shipped), `/classes`, `/enemies`, `/frames`,
  `/backgrounds`, `/ui`, `/keyart`. All `art_ref` values in data must resolve to
  paths in this tree. Build tooling must exclude `/assets/anchors` from bundles.
- **`assets/MANIFEST.md` is the asset inventory** — check it before wiring art;
  update it whenever assets are added. Generation prompts and specs are in
  `PROMPT_PACK.md`. Cards are composited at runtime: frame PNG + character PNG
  layered; rarity upgrade = swap the frame asset only. Backgrounds: load the
  `.jpg` (web-optimized), never the multi-MB `.png` masters.

## Audio & narration voice
- **Islamic musical tone** (DESIGN.md §8.4): anasheed-styled soundtrack (voice + frame
  drum) layered with oud, ney, qanun. The **adhan (call to prayer) is the dawn motif** —
  title ambience, dawn-approaching warning, and Night-survived stinger. Mix it as
  respectful diegetic soundscape, never as a failure sting.
- **Narration language conventions** (DESIGN.md §8.5), enforced in narration data:
  - Run start opens with the basmala: *"Bismillah ar-Rahman ar-Rahim [In the name of
    God, the Most Gracious, the Most Merciful] — and so Scheherazade began the tale..."*
  - Chapter clear closes with: *"'Inshallah [God willing],' said Scheherazade, 'we
    will continue the story tomorrow.'"*
  - Scheherazade's voice uses natural Islamic expressions (wallahi [I swear by God],
    mashallah [what God has willed], alhamdulillah [praise be to God], ya Allah
    [O God], astaghfirullah [I seek God's forgiveness]) where a storyteller genuinely
    would — flavor, not filler, always transliterated respectfully.
  - **Every Islamic phrase shows its meaning in brackets on first appearance** so the
    game introduces players to what these expressions mean. Narration data stores
    phrase + gloss as separate fields; the UI renders the bracket on first encounter
    (tracked per profile) and on tap thereafter.

## Project status (update as milestones land)
- **Now:** Night I is playable start-to-finish — battle engine, deck/card system,
  Map/Verse system (run state, 3-up selection, page counter, all node kinds), and a
  working economy (Bazaar/Calligrapher/House of Forgetting/Jinni of the Lamp) are all
  in place per DESIGN.md §9.6 steps 1-3 (plus economy pieces of 4-5). 12 Night I normal
  enemies + The Whale That Was an Island boss are authored as data.
- **Explicitly deferred:** XP/leveling math and level-up card picks (§3.4's last
  bullet), the boss's "battlefield sinks in phases" gimmick (boss is a real
  boss-tier statblock without it), localStorage persistence (`RunState` is plain-JSON
  so this is cheap to add later).
- **Next milestone:** XP/leveling, Blessings beyond the Jinni's fixed pool, Story Forks
  + Wonder/Mercy thresholds (§9.6 steps 4-6), then real Night I/boss art to replace
  placeholders.
- Slice-blocking art gaps: bg_night1 (Basra), dockhand, frame_epic, UI kit, and art
  for all 10 newly-authored enemies + the boss (all reference placeholder `art_ref`
  paths that don't resolve to real assets yet).

## Project skills
- `/asset-intake` — file newly generated art into `/assets` (dedupe, canonical
  names, JPG optimization, manifest update). Use it whenever new images arrive.

## Housekeeping
- Keep this CLAUDE.md current as the project evolves (milestones, decisions, gotchas).
- Update DESIGN.md only for deliberate design changes, not implementation details.
