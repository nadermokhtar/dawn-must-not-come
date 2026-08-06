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
- **Now:** the full Night I → Night II loop is playable per DESIGN.md §9.6 steps
  1-6: battle engine, deck/card system, Map/Verse system, a working economy
  (Bazaar/Calligrapher/House of Forgetting/Jinni of the Lamp, plus the Coin Djinn
  bank and the risk/reward Sealed Jar), enemy levels + player XP/leveling with
  level-gated battle Verses (`[player level, player level + 1]`) and level-up card
  rewards, 3 Story Forks (tied to `EnemyDef.story_fork_id`) with Wonder/Mercy
  threshold bonuses, and localStorage persistence of `RunState` (map-level progress
  — not mid-battle state). Clearing Night I's boss advances to Night II instead of
  ending the run (`applyBattleReward` checks whether further-night content exists);
  clearing Night II's boss (The Roc) is the current terminal ending. Battle screen
  has combat feedback (slash/hit animations, a decorative enemy hand strip,
  Scheherazade/King dialogue barks) and missing art falls back to placehold.co
  (Playfair Display) instead of a plain CSS box.
- **Balance pass (2026-08-04):** a live bot-driven playthrough surfaced two real
  issues, both fixed: (1) `sampleClassCards`'s card-pool filter incorrectly treated
  "no `class` field" as "any class," which let enemy-only move cards leak into the
  Bazaar and level-up rewards — fixed by tagging the 3 class-less item cards
  explicitly and requiring an exact class match. (2) The Night I boss (90 HP, up to
  14 dmg/hit, resisted steel) was tuned for a much higher level than players
  realistically reach by page 22 (~level 9-10) — reduced to 65 HP, 7-10 dmg/hit, no
  steel resist. `WIN_HEAL_FRACTION` was tuned 0.2 → 0.1 → settled at 0.15 (0.2 made
  the mid-game nearly risk-free; 0.1 caused a death spiral for careless play).
  Verified via Playwright bot runs, not just numbers on paper — bot skill is a
  floor, not a ceiling, so treat this as "not a brick wall," not "perfectly tuned."
- **Explicitly deferred:** the boss's "battlefield sinks in phases" gimmick (boss is
  a real boss-tier statblock without it), Night III onward, the Hidden Night IV
  secret chains (Sealed Scroll / Golden Tongue — Night II's Locked Diary/Eccentric
  Seeds/VIP Card verses are flavor-only stubs, not the full chain), mid-battle
  persistence.
- **Battle UI overhaul (2026-08-05):** rebuilt the battle screen against a Night
  of the Full Moon layout reference (proportions/hierarchy/card-anatomy only, no
  art/text borrowed). Cards now render full anatomy — cost badge (gold=AP,
  blue=mana, stacked badges for the one mixed-cost card), type-colored name
  banner + bottom ribbon (attack=red, spell=blue, equipment=teal, counter=gold,
  affliction=copper-green [renamed from "curse" 2026-08-05, see below], item=tan;
  tokens in `tokens.css`, never per-card), arched
  art window, upgrade stars, and an ability-text box that shrinks 12px→10px then
  clamps with ellipsis (full text on tap-hold zoom). Added `cost_type` (`ap` /
  `mana` / `mixed`) to the card schema (DESIGN.md §9.1) and migrated all existing
  card JSON. Enemy zone/nameplate, a thin armor+status strip (hidden when empty),
  a collapsible 2-line narration panel, and the old Draw/Discard/Exhaust/Set/Log
  text-button row (now compact tappable badges) were all rebuilt to match.
  Verified headlessly via a temporary Playwright script at a 390×844 viewport
  (screenshotted default/selected/zoom/expanded-narration states, no console
  errors) — **not yet verified on a physical phone**, which the user still needs
  to do before further polish. The same rich card face (via new
  `createInspectableCardElement`/`showCardZoom` helpers in `cardView.ts`) now
  also renders in every other card-picking context, replacing bare name-only
  buttons: the Bazaar, the Calligrapher (which now previews the *upgraded*
  card face, not the current one — the point of browsing there is seeing what
  the gold leaf buys), the House of Forgetting, and the level-up reward
  picker. Tapping any of these cards opens the same full-detail zoom used in
  battle.
- **Verse persistence + ceremony UI + onboarding (2026-08-05):** three follow-ups
  from first-human-playtester feedback (see `project_first_playtest_feedback`
  memory) and reference screenshots of the Victory/level-up/Bazaar/Blessing/
  Chest screens.
  - **Verse persistence bug fix:** picking one of the map's 3 offered Verses
    used to re-roll all 3 (`rollVerseOptions` was a pure function of
    `(seed, night, page, rerollCount)`, and page always advanced on entry) —
    so leaving for a battle and coming back showed 3 brand-new options, losing
    track of the Bazaar/Blessing/Chest that was sitting there. Fixed by adding
    `RunState.verseOptionIds` (persisted, slot-replaced individually by
    `enterVerse`) and a new `currentVerseOptions()` the map screen reads
    instead — matches NotFM's actual rule (picking one only replaces that
    one; a reshuffle or a boss clear is what re-rolls all 3).
  - **Shared "ceremony" UI** (`ceremonyDialog()` in `components.ts`, styles in
    the new `ceremony.css`): a glowing portrait + ribbon-banner title + panel,
    replacing the old plain `bottomSheet` list rows for every "big moment"
    screen — Victory/Defeat (now shows Sinbad's portrait + current Lv/XP,
    `BattleScreenOptions` grew `playerXp`/`xpToLevel`), the level-up reward
    picker, and the Bazaar/Calligrapher/House of Forgetting/Jinni/Chest/Sealed
    Jar/Bank (previously vertical list rows with an accidental full-width
    "Pick" button next to a tiny card — now side-by-side card columns via
    `.ceremony-choice-row`, matching the reference proportions). `bottomSheet`
    itself is untouched and still backs pile-lists/the event log, which don't
    need ceremony.
  - **Onboarding** (`src/ui/onboarding.ts`, flags persisted per-profile via
    `hasSeen`/`markSeen` in `persistence.ts` — NOT per-run, so a fresh run
    never re-triggers a tutorial already dismissed): the DESIGN.md §8.5
    basmala now actually opens every new run (cold start and "Begin a New
    Telling" both route through it); a one-time "how Verses work" explainer
    overlays the first-ever map; a one-time "how to fight" explainer overlays
    the first-ever battle. Both re-openable anytime via a "?" header button
    (map header, battle status strip). Also added a "↻" restart-run button on
    the map header, behind a confirm/cancel dialog since it discards progress.
  - **Tooltips:** every icon-only widget (the armor shield, the AP hourglass,
    the map's Dinars/Wonder/Mercy badges) now sets a native `title` *and*
    taps to a `flashMessage` explaining itself — `title` alone doesn't fire on
    touch, so both are needed on a touch-first game.
  - Verified headlessly via temporary Playwright scripts (390×844): the full
    verse-persistence round-trip, all 6 ceremony screen types, the full
    basmala → map-tutorial → tooltip-toast → restart-confirm → battle →
    battle-tutorial → AP-tooltip chain. No console errors in any pass. Still
    not verified on a physical phone.
- **Next milestone:** phone testing/feedback on all of the above, Night III
  content, the Hidden Night IV unlock chains (now has an exact 3-step
  reference shape from DESIGN.md §3.7 — Locked Diary / VIP Card / Eccentric
  Seeds), real Night I/II/boss art to replace placeholders, more human
  (non-bot) balance feedback.
- Slice-blocking art gaps: bg_night1 (Basra), bg_night2, dockhand, frame_epic, UI
  kit, and art for all newly-authored Night I/II enemies + bosses (all reference
  placeholder `art_ref` paths that don't resolve to real assets yet).

## Project skills
- `/asset-intake` — file newly generated art into `/assets` (dedupe, canonical
  names, JPG optimization, manifest update). Use it whenever new images arrive.

## Housekeeping
- Keep this CLAUDE.md current as the project evolves (milestones, decisions, gotchas).
- Update DESIGN.md only for deliberate design changes, not implementation details.
