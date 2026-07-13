# DAWN MUST NOT COME
### A storybook deckbuilding roguelike — Design Document v1.0

**Genre:** Single-player PvE card battler / roguelike deckbuilder
**Reference game:** Night of the Full Moon (mechanics + presentation cloned, theme replaced)
**Theme:** The Voyages of Sinbad, as told by Scheherazade to King Shahryar across the 1001 Nights
**Session length target:** 20–30 minutes per run
**Platform target:** Mobile-first portrait, web playable

---

## 1. THE PITCH

Every night, Scheherazade must tell a story so gripping that the King spares her life until dawn.
Tonight, she tells the tale of Sinbad the Sailor.

You are the story.

Each run is one night's telling. The map is not a dungeon — it is the tale itself, laid out as
illuminated pages of a manuscript. Battles, bazaars, and blessings are all "verses" Scheherazade
speaks into being. When you die, the King frowns — and Scheherazade simply begins the tale again,
told differently. The roguelike loop IS the fiction: no two tellings of Sinbad are ever the same.

**The hook that Night of the Full Moon doesn't have:** the narrator is a character with stakes.
Scheherazade's survival depends on how the story lands. Player choices don't just change Sinbad's
fate — they change the King's mood, and the King's mood changes the story's rules.

---

## 2. THE FRAME STORY (meta layer)

- **Scheherazade** — the narrator. Her voice accompanies every page turn, battle intro, and boss.
  She occasionally "revises" the tale mid-run (this is how we flavor random events and rerolls).
- **King Shahryar** — the listener. He is never fought. He is the invisible judge of every run.
  Two hidden-ish stats track his state (see §5, Wonder & Mercy).
- **Dunyazad** — Scheherazade's sister, who asks for the story each night. She is the tutorial
  voice and the "are you sure?" voice on dangerous choices.
- **Dawn** — the run-ending frame. Chapter bosses are narrated as cliffhangers: "...but the dawn
  overtook Scheherazade, and she fell silent." Beating a chapter = surviving another night.

Every UI metaphor follows the frame: the map is a manuscript, encounters are **Verses** (= NotFM
"Pages"), chapters are **Nights**, the run history is **The Telling**, and the game-over screen is
the King's verdict.

---

## 3. CORE GAMEPLAY LOOP (1:1 with Night of the Full Moon)

### 3.1 Map / exploration
- Out of battle, exactly **3 Verses (cards)** are face-up on the manuscript. Player picks one.
- The other 2 remain; some Verse types must be crossed out to advance, others auto-consume.
- Each Night (chapter) has a fixed page count (Ch. I ≈ 22 pages, Ch. II ≈ 34 pages).
- A **"Turn the Page"** verse reshuffles the current 3 (NotFM's Next Intersection).
- Defeating the Night's boss reveals the **Last Verse** → next Night.
- Player can rush the boss and skip remaining monsters (same as NotFM).

### 3.2 Battle
- 1v1, turn-based. Player side vs. monster side. Player goes first (rare ambush enemies excepted).
- **Draw:** both sides draw at start of each turn (draw count scales with level + Blessings).
- **Action Points (AP):** spent to play Action cards. Recover to base at end of turn.
- **Mana:** spent to play Spell cards. Persistent resource across turns.
- **No per-turn play limit** other than AP/mana/hand — combo chains are the fun.
- **Max hand size:** end-of-turn discard down to cap. Cap grows with level-ups.
- **Counter cards:** set face-down, trigger on enemy action (keep NotFM's counter system).
- **Equipment slots:** equipment auto-equips at battle start; overflow shuffles into deck.

### 3.3 Damage types (renamed, same math)
| NotFM | Ours | Flavor |
|---|---|---|
| Physical | **Steel** | scimitars, spears, fists |
| Piercing | **True Strike** | ignores armor/wards — "fate's arrow" |
| Fire | **Ifrit Flame** | burn stacks, burst damage |
| Water | **Tide** | Chill/Drenched setup + combo bursts |
| Thunder | **Storm** | multi-hit, sky and sail |
| Poison | **Serpent Venom** | stacking DoT, ticks down 1/turn |

Resistances/weaknesses per enemy exactly as NotFM (e.g., sea creatures resist Tide, take double
Ifrit Flame... invert per enemy design).

### 3.4 Progression within a run
- **XP + Dinars (gold)** from battles. Level-ups: +max HP, +hand size, +AP/mana, card rewards,
  full/partial heal depending on difficulty.
- **Card acquisition:** level-up picks, the **Bazaar** (Grimalkin Shop), chest verses,
  post-battle dialogue rewards, the **Trader of Tales** (Card Collector swaps).
- **Card removal:** the **House of Forgetting** — hookah lounge / lotus wine tavern
  (Amnesia Tavern). "Some verses are best left untold."
- **Card upgrades:** the **Calligrapher** (Smithy) — cards are re-inked with gold leaf.
  Upgraded card frames gain illumination (visual star system, 1–3 stars).
- **Blessings** (relics/passives): granted by the **Jinni of the Lamp** (Fairy Blessing),
  the **Fortune Teller's Doubt** (Witch's Doubt), and **The Sealed Jar** (Pandora's Box —
  a brass jar with Solomon's seal: risk/reward, may contain a curse or a jinn's gift).
- **The Coin Djinn** (Squirrel Bank): deposit dinars, collect with interest later in the run.

### 3.5 Difficulty ladder
- **Normal** → **Hard I–VII** → **Nightmare** ("The King's Doubt"). Same escalation pattern:
  stronger normals, halved heals, stronger bosses, ramping enemy damage, +50% shop prices,
  reduced hand size. Each Hard clear awards one permanent class card (same reward loop).
- On Hard+, Wonder/Mercy are replaced by **Sand of the Hourglass** given by the
  **Keeper of Hours** (Time Elf): spend 2/4/6 sands for 1/2/3 blessing choices.
- Nightmare adds **Movements** → renamed **"The King's Moods"** (5 modifiers: locked opening
  hands, reduced heal events, longer skill cooldowns, junk card injection, +50% prices).

### 3.6 Meta progression (per account)
- **Talents** tree bought with **Stars** earned from boss kills — identical structure
  (Cure→Inspiration→Wisdom→In Haste; Fortune I/II→Treasure House→Shopaholic;
  Vitality I/II→Power→Critical Moment; capstone Armed Forces = +1 equipment slot).
  Reskin: the tree is **"Scheherazade's Craft"** — storytelling skills she hones each night.
- Class unlocks, difficulty unlocks, card index ("The Library of Tales"), endings gallery.

---

## 4. THE TELLING — the dynamic narration system (our differentiator)

This replaces and extends NotFM's dialogue-choice system. Three mechanics:

### 4.1 Story Forks (replaces post-battle dialogue)
After many battles, Scheherazade pauses: *"And what did Sinbad do then, O King?"*
Player picks how the tale continues (2–3 options). Outcomes: ±Wonder, ±Mercy, ±HP,
±dinars, rare cards, or a changed later encounter. Explored options are marked across runs
(same memory system as NotFM). Fork text is written in Scheherazade's voice, not Sinbad's.

### 4.2 Wonder & Mercy (replaces Courage & Reputation)
- **Wonder** — the King's astonishment. Raised by daring, monstrous, dramatic choices.
- **Mercy** — the King's softening heart. Raised by sparing enemies, kindness, wisdom.
- Rule mirror of NotFM: **Wonder must be ≥ Mercy** to unlock the most dangerous hidden fights
  (the King demands spectacle). High Mercy instead unlocks peaceful resolutions and the
  redemption ending. Thresholds grant +max HP (Wonder 4/8) and +dinars (Mercy 4).
- The pair feeds the ending matrix (§7).

### 4.3 Revisions (flavor layer on roguelike randomness)
- Reshuffle-the-first-3-pages = *"Scheherazade cleared her throat and began differently."*
- Death/retry = *"'That is not how the tale goes,' said the King. 'Tell it again.'"*
- Rare mid-run event: **The King Interrupts** — Shahryar demands the story change NOW.
  Player must pick one of two forced modifiers (gain a curse card, lose gold, lose max HP —
  this is NotFM's "Thorns" unskippable event, made diegetic).

---

## 5. CLASSES (launch with 5, roadmap to 10)

Each class = a different way Scheherazade casts the hero of the tale. Same silhouette slot as
NotFM classes so mechanics port 1:1.

### 5.1 Sinbad the Sailor (Knight port) — FREE, default
- Steel damage, armor, combo chains, equipment synergy.
- Signature: **Sea Legs** (armor stacking), **Boarding Action** (combo finisher),
  **Ship's Ballista** (equipment, start-of-battle damage = Shipborne Artillery port).
- Starting deck: 4× Cutlass Strike, 2× Raise Shield, 2× Rigging Grab (draw), 1× Captain's
  Rally (AP restore), 1× Boarding Action.

### 5.2 The Huntress of the Isles (Ranger port) — FREE
- Bow/trap archetype: setup turns, counters, burst.
- Signature: **Snare of Palm Rope** (counter), **Roc-Feather Arrow** (True Strike),
  **Vanish into the Grove** (Go into Hiding port).

### 5.3 The Jinniya (Little Witch port) — FREE
- Elemental spell weaver: Ifrit Flame / Tide / Storm, mana engine.
- Signature: **Sirocco** (Cold Wind port, inverted to hot desert wind), **Absolute Calm**
  (Absolute Zero port — the sea goes dead still, extra turn), **Whirlwind of Sparks**.

### 5.4 The Dervish (Nun port) — FREE
- Heal / armor / delayed judgment. **Penance** keyword → **Dhikr**: at end of your turn,
  deal True Strike damage equal to Dhikr level. Applied via **Recitation** (Confession port).
- Prayers → **Litanies** (delayed-trigger cards with turn counters).

### 5.5 The Astrologer of Baghdad (Magician port) — ad-unlock/currency
- Trickster: card copy, transformation, deck manipulation, the **Brass Astrolabe**
  (Magic Pocket Watch port — extra turn).

### Roadmap classes (map for later)
| NotFM class | Our class | Signature keyword port |
|---|---|---|
| Apothecary | **The Attar (Perfume-Poisoner)** | Serpent Venom stacking |
| Werewolf | **The Ghoul-Marked** | Rage → **Hunger of the Ghul** (piercing at max stacks) |
| Pact Master | **The Jinn-Binder** | Siphon → **Sealing Word** (steal mana / true dmg + lifesteal when dry) |
| Mechanic | **Artificer of the House of Wisdom** | constructs = brass automata (real Abbasid-era flavor!) |
| Spirit Caller | **The Storyteller's Apprentice** | summons heroes from OTHER 1001 Nights tales (Aladdin's lamp, Ali Baba's forty, the Fisherman's jinn) — meta-summons |

---

## 6. STORY SKELETON — Nights & Voyages

Structure mirrors NotFM: 3 chapters + boss each + hidden 4th chapter via secret item chains.
Enemy and boss roster pulled from the actual Sinbad voyages + wider 1001 Nights.

### NIGHT I — "The Harbor of Basra" (Ch. I port, ~22 verses)
Sinbad the Porter meets Sinbad the Sailor; the tale begins dockside and sails out.
- **Normal enemies:** Drunken Dockhand, Customs Officer, Pickpocket of the Souk, Rat of the
  Hold, Angry Pelican, Pearl Diver, Ship's Cook, Sleepless Watchman, Stray Ghul-pup,
  Snake Charmer's Serpent, Superstitious Sailor, Cargo Mimic (Disguised Chest port —
  a crate with teeth).
- **Verse locations:** the Bazaar, the Calligrapher, the House of Forgetting, the Jinni of
  the Lamp, Shy Chest → **Bashful Oyster** (pearl reward), Greedy Chest → **Greedy Jar**.
- **Boss pool (one per run):** The Harbormaster (Forest Lawman port) • The Whale That Was
  an Island (Voyage 1 — battlefield "sinks" phases) • The Serpent Queen of the Reef •
  Grandmother Ghouleh (Rat/Wolf Grandma port — old woman who is not what she seems).

### NIGHT II — "The Uncharted Sea" (Ch. II port, ~34 verses)
Open ocean and monstrous islands. Voyages 2–3 material.
- **Normal enemies:** Roc Hatchling, Diamond-Valley Serpent, Cannibal Scout, Cyclopean
  Shepherd's Ram, Storm Sprite, Drowned Sailor, Merchant of Dubious Meat, Siren of the
  Shoals, Living Figurehead, Ape of the Black Isle.
- **Special verses:** the Coin Djinn, **Locked Diary → The Sealed Scroll** (secret chain
  item, see §7), **Eccentric Seeds → Strange Coconut**, VIP card → **The Golden Tongue**.
- **Boss pool:** **The Roc** (aerial phases; drops Roc Feather equipment) • The Man-Eater
  of the Black Castle (Voyage 3 giant — the cyclops-analog; discard-punish gimmick like
  Sword in the Stone) • The Dream-Kelp Leviathan (Dream Tree port).

### NIGHT III — "The Old Man and the Deep" (Ch. III port)
The tale darkens. The King leans forward. Voyages 4–5 material.
- **Normal enemies:** Grave-Pit Wretches (Voyage 4 buried-alive sequence), Pirate Corsair,
  Elephant-Graveyard Guardian, Brine Wraith, The Widow's Suitors.
- **Boss:** **The Old Man of the Sea** — signature fight. He RIDES SINBAD: a persistent
  "Clinging" debuff drains AP each turn until the player builds enough **Wine** cards
  (added mid-fight) to shake him loose. Mechanically fresh, straight from the tale.
- After the boss: **"The Final Truth" → "The King's Verdict"** — normal ending sequence.

### HIDDEN NIGHT — "The Seventh Voyage" (Ch. IV port)
Unlocked only via secret chains (NotFM's Locked Diary / VIP / Seeds chains, ported):
1. **The Sealed Scroll chain:** get scroll from Jinni of the Lamp (Night II) → have the
   Calligrapher restore it → trade it to the Trader of Tales for **Painful Memories** →
   drink it away at the House of Forgetting → blessing **"The Silver Pen"** unlocks Night IV.
2. **The Golden Tongue chain** (paid classes only): buy **Lotus Herbs** in the VIP bazaar →
   ferment at the House of Forgetting → play the resulting card in any battle (costs
   permanent −1 AP).
- **Content:** the City of Brass, the Elephant Graveyard, the Angel of the Trumpet glimpsed
  on the horizon. Final boss: **The Teller's Shadow** — a false Scheherazade telling a
  crueler version of the same tale (Afterimage/mirror-boss port). Beating her = the tale
  is truly finished, and dawn comes with the King weeping.

---

## 7. ENDING MATRIX

| Condition | Ending |
|---|---|
| Beat Night III, Wonder ≥ Mercy | **"Another Night Won"** — the King spares her; the tale continues tomorrow |
| Beat Night III, Mercy > Wonder | **"The Softened King"** — Shahryar questions his own cruelty |
| Beat Hidden Night IV | **"The Thousand and Second Night"** — true ending; the King pardons Scheherazade forever |
| Die at any point | **"Tell It Again"** — not a fail state in fiction; a retelling |

---

## 8. ART DIRECTION

**One line:** *Night of the Full Moon's gloomy storybook, re-bound as an illuminated Islamic
manuscript.* Keep the "you are inside a book" presentation; swap gothic Black Forest for
Persian/Mughal miniature painting and Abbasid manuscript illumination.

### 8.1 Style pillars
1. **Manuscript frame everywhere.** Map, battles, and menus all sit on aged paper with
   ornamental borders. Verses are literal manuscript panels. Page-turn transitions.
2. **Miniature painting logic.** Flattened perspective, stacked landscapes, decorative
   waves as repeating scallops, figures slightly oversized vs. architecture — like Persian
   miniatures. Characters keep NotFM's chibi-adjacent proportions (2.5–3 heads tall) so
   the tone stays charming-with-shadows, not museum-stiff.
3. **Illumination = rarity.** Common cards: ink + flat color. Rare: gold-leaf corner
   ornaments. Upgraded (starred): full illuminated border with arabesques. The Calligrapher
   visually re-inks your card on upgrade.
4. **Gloom, not grim.** Night scenes dominate (it's told at night). Deep lapis and indigo
   skies, moonlit seas, warm lantern pools. Monsters are eerie-whimsical (NotFM register),
   not gory.

### 8.2 Palette
- **Base:** lapis lazuli #1B3B6F, midnight indigo #101A3C, aged parchment #E8DCC0
- **Accents:** gold leaf #C9A227, coral red #D96C4A, turquoise #3FA9A5
- **Danger/curse:** oxidized copper green #4E6E58, dried-blood madder #7A2E2E
- UI text in a humanist serif; decorative headers may echo thuluth calligraphy shapes
  (Latin type styled with swash, NOT pseudo-Arabic gibberish — respect the source).

### 8.3 Key screens
- **Map:** open codex, right page shows the 3 Verses, left page shows Scheherazade's
  running narration text + Wonder/Mercy as two small medallions (sun/crescent).
- **Battle:** enemy in an illuminated vignette top, hand fanned bottom, AP as brass
  astrolabe pips, mana as blue inkwell fill, HP as a candle burning down (dawn motif).
- **Card anatomy:** ornamental border, top-left cost roundel, type glyph (scimitar=attack,
  scroll=spell, hand=counter, ring=equipment), art panel, rules text on parchment strip.

### 8.4 Audio direction (for later)
- **Islamic musical tone throughout.** Anasheed (vocal, percussion-led devotional style)
  as the backbone of the soundtrack — chapter themes, map ambience, and boss builds are
  nasheed-styled (voice + frame drum/daf), layered with oud, ney flute, and qanun.
- **The adhan (call to prayer) is the dawn motif.** Dawn = the run's clock, so the fajr
  adhan is the sound of the frame story: distant adhan under the title screen, a soft
  adhan swell as the "dawn approaches" warning near chapter ends, and the full dawn
  stinger when a Night is survived. Treat it respectfully — mixed as diegetic city
  soundscape (heard from the palace window), never as a defeat/failure sting.
- Boss themes escalate percussion and vocal intensity; Scheherazade's narration VO on
  chapter/boss beats.

### 8.5 Narration language conventions
Scheherazade is a Muslim narrator and speaks like one. Bake these into the narration
strings (data-driven, per §9). **Every Islamic phrase carries its meaning in brackets
the first time it appears on screen** — the game gently introduces players to what
these expressions mean, in Scheherazade's teaching voice, never as a footnote dump:
- **Every telling opens with the basmala.** Run start / "the telling begins" screen:
  *"Bismillah ar-Rahman ar-Rahim [In the name of God, the Most Gracious, the Most
  Merciful] — and so Scheherazade began the tale..."*
- **Every survived Night closes with inshallah.** Chapter-clear narration:
  *"'Inshallah [God willing],' said Scheherazade, 'we will continue the story
  tomorrow.'"* (This is the diegetic "save and continue" line.)
- Sprinkle natural Islamic expressions in her voice throughout, each glossed on first
  use: *wallahi* [I swear by God] (emphasis), *mashallah* [what God has willed —
  said in wonder] (marvels), *alhamdulillah* [praise be to God] (relief after a hard
  battle), *ya Allah* [O God] (peril), *astaghfirullah* [I seek God's forgiveness]
  (at cursed/forbidden things). Use them where a storyteller genuinely would — flavor,
  not filler — always transliterated respectfully, never as gibberish.
- **Implementation:** narration strings store the phrase and its gloss as separate
  fields (e.g. `{"phrase": "inshallah", "gloss": "God willing"}`); the UI renders the
  bracket on first encounter (tracked per player profile) and optionally on tap
  thereafter, so repeat runs aren't cluttered once the player knows the meaning.

---

## 9. DATA SCHEMAS (hand to Claude Code)

### 9.1 Card
```json
{
  "id": "sinbad_cutlass_strike",
  "class": "sinbad",
  "name": "Cutlass Strike",
  "type": "attack",            // attack | spell | counter | equipment | curse | item
  "cost": { "ap": 1, "mana": 0 },
  "damage": { "amount": 6, "dtype": "steel" },
  "effects": [],               // e.g. [{"apply":"venom","stacks":2,"target":"enemy"}]
  "draw": 0,
  "stars": 0,                  // 0-3 upgrade level
  "upgrades": ["sinbad_cutlass_strike_1"],
  "rarity": "common",
  "flavor": "\"And Sinbad drew his blade,\" said Scheherazade, \"for the sea forgives nothing.\"",
  "art_ref": "cards/sinbad/cutlass_strike.png"
}
```

### 9.2 Enemy
```json
{
  "id": "old_man_of_the_sea",
  "name": "The Old Man of the Sea",
  "night": 3, "tier": "boss",
  "hp": 220,
  "resist": ["tide"], "weak": ["ifrit_flame"],
  "deck": ["cling", "cling", "throttle", "kick_heels", "iron_grip"],
  "gimmick": "clinging",       // applies Clinging: player -1 AP/turn until Wine x3 played
  "first_move": false,
  "story_fork_id": "fork_old_man_mercy",
  "art_ref": "enemies/old_man_of_the_sea.png"
}
```

### 9.3 Verse (map node)
```json
{
  "id": "verse_bazaar",
  "kind": "shop",              // battle | shop | upgrade | remove | blessing | chest | event | bank | boss
  "night": [1,2,3],
  "must_cross_out": true,
  "narration": "\"There was in that city a bazaar,\" said Scheherazade, \"where anything could be bought — for the right story.\""
}
```

### 9.4 Run state
```json
{
  "class": "sinbad", "night": 2, "page": 14,
  "hp": 41, "max_hp": 55, "level": 5, "xp": 130,
  "ap_base": 3, "mana": 4, "mana_max": 6,
  "hand_size": 5, "dinars": 87,
  "wonder": 5, "mercy": 3,
  "deck": ["..."], "equipment": ["ships_ballista"],
  "blessings": ["sea_legs_blessing"],
  "flags": { "sealed_scroll": "restored" },
  "difficulty": "normal", "seedless": true
}
```

### 9.5 Asset structure
All art lives under `/assets` with this exact layout (filenames are the `art_ref`
targets in the data schemas):

```
/assets
  /anchors      anchor_hero.png, anchor_enemy.png  (never shipped)
  /classes      sinbad.png, huntress.png, jinniya.png,
                dervish.png, astrologer.png
  /enemies      dockhand.png, serpent.png, cargo_mimic.png,
                ghouleh.png, whale_island.png, roc_hatchling.png,
                roc.png, diamond_serpent.png, siren.png,
                old_man_of_the_sea.png
  /frames       frame_common.png, frame_rare.png,
                frame_epic.png, frame_starred.png
  /backgrounds  bg_title.png, bg_codex.png, bg_night1.png,
                bg_night2.png, bg_night3.png, bg_night4.png
  /ui           glyph_attack.png, glyph_spell.png, glyph_counter.png,
                glyph_equipment.png, icon_ap.png, icon_mana.png,
                icon_hp.png, icon_dinar.png, medallion_wonder.png,
                medallion_mercy.png, btn_end_turn.png, icon_deck.png,
                icon_discard.png, icon_settings.png
  /keyart       scheherazade_king.png
```

- `/anchors` holds the style-anchor reference images used to keep generated art
  consistent — they are inputs to the art pipeline and are **never shipped** in builds.
- Full generation prompts, style rules, sizes/formats, and generation order live in
  **`PROMPT_PACK.md`** (Nano Banana Prompt Pack v2.0). Current inventory and gaps are
  tracked in **`assets/MANIFEST.md`**.
- Backgrounds ship as web-optimized `.jpg` (<400KB); the `.png` masters stay in the
  repo but are not loaded by the game.
- Audio will follow the same pattern under `/assets/audio` (anasheed tracks, adhan
  stingers, narration VO) — structure TBD when audio work starts.

### 9.6 Build order for Claude Code (suggested)
1. Battle engine: turns, draw, AP/mana, damage types, buffs/debuffs, counters, victory/defeat.
2. Deck & card system + starter deck for Sinbad; 25–30 cards is enough for a vertical slice.
3. Map/Verse system: 3-up selection, page counter, node kinds, boss gate.
4. Run progression: XP/levels, dinars, shop, upgrade, remove.
5. Blessings + equipment slots.
6. Story Forks + Wonder/Mercy + Scheherazade narration hooks (data-driven strings).
7. Difficulty ladder, talents, hidden Night IV chains — post-slice.

---

## 10. PROMPT SPLITS (what goes where)

### → Claude Design (paste §1, §2, §8, plus card anatomy)
Ask for: title screen, the codex map screen, battle screen mockup, card frame system
(common/rare/1–3 star illuminated variants), Wonder/Mercy medallions, Scheherazade
narration panel, palette tokens from §8.2.

### → Claude Code (paste §3–§7, §9)
Ask for: vertical slice — Sinbad class, Night I only, 1 boss (The Whale That Was an
Island), 12 enemies, all node kinds, Story Forks stubbed with 3 forks. Data-driven JSON
per §9 so content scales without code changes.

### → Nano Banana (image prompts — template)
> "Persian miniature painting style game card illustration, [SUBJECT], flattened
> perspective, decorative scalloped sea waves, lapis lazuli and gold leaf palette,
> aged parchment background, ornamental illuminated manuscript border, moonlit night
> scene, whimsical slightly eerie storybook mood, mobile game card art, no text"

Subjects to batch first: Sinbad hero portrait, Scheherazade + King framing art,
the 4 Night I bosses, the Roc, the Old Man of the Sea, 12 Night I enemies, card frames
×4 rarities, the codex map background.

---

## 11. NAME CANDIDATES
- **Dawn Must Not Come** ← CHOSEN TITLE
- A Thousand and One Tides (former working title)
- Night of the Seventh Voyage
- The Telling of Sinbad
- Scheherazade's Deck
