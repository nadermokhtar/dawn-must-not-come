# DAWN MUST NOT COME — Nano Banana Prompt Pack v2.0

Full restart. Consistency workflow + web (JS/HTML) asset specs baked in.
(Originally titled "A Thousand and One Tides" — same project, renamed.)

---

## PART 0 — READ FIRST: THE WORKFLOW

### The 3 Rules

**🔑 Rule 1 — Characters RAW, frames separate.**
Every character/enemy is generated alone on plain parchment, square, NO border.
Frames are their own assets. The JS game composites them (character `<img>` layered
inside frame `<div>`, or both drawn to `<canvas>`).

**🔑 Rule 2 — Anchor image on EVERY character generation.**
- Generate the Sinbad prompt below FIRST. Save the result as `anchor_hero.png`.
  Attach it to every class prompt.
- First accepted enemy → save as `anchor_enemy.png`, attach it to every remaining
  enemy prompt.
- Every character prompt below already begins with the match-the-anchor instruction.

**🔑 Rule 3 — One style register per category.**
- Classes / heroes → lively chibi register (Sinbad anchor)
- Enemies / bosses → same chibi register via enemy anchor
- Backgrounds → environment style, no anchor needed
- Do not mix registers inside a category.

### MASTER STYLE BLOCK (paste at the end of every character prompt)

> stylized storybook game character, 2.5 heads tall chibi-adjacent proportions,
> medium-weight clean dark brown outlines, flat color fill with soft simple shading,
> expressive face with small nose, Arabian Nights setting, lapis lazuli blue and gold
> and coral palette, plain aged parchment background, single character, full body,
> centered, square 1:1 composition, NO border, NO frame, NO triptych, NO side panels,
> NO text, NO calligraphy, NO Arabic script, NO writing of any kind, NO watermark

### QA CHECKLIST (run on every output before saving)

- ☐ Same head-to-body ratio as the anchor?
- ☐ Single character, full body, centered, square?
- ☐ Zero borders / frames / side panels?
- ☐ Zero script anywhere (check ribbons, robes, banners, hems)?
- ☐ Palette matches (lapis / gold / coral / parchment)?

---

## PART 0.5 — ASSET SPEC FOR THE JS/HTML BUILD

### Folder structure (matches the design doc's art_ref paths)

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
  /ui           (see Part 4)
  /keyart       scheherazade_king.png
```

### Sizes & formats

- **Characters/enemies:** generate large (1024×1024+), export PNG, display at
  ~256–512px. One source size; let the browser scale.
- **Frames:** 3:4 portrait (e.g. 768×1024), PNG. Center must be a clean solid
  parchment area you can mask/knock out.
- **Backgrounds:** 9:16 portrait (e.g. 1080×1920), full bleed, JPG is fine (no
  transparency needed), keep under ~400KB each for mobile web load times.
- **UI icons:** generate on parchment, then background-remove → PNG with
  transparency, displayed at 32–64px so keep shapes BOLD and simple (they must
  read at thumbnail size).
- **Naming:** lowercase snake_case, matches the JSON art_ref fields exactly so
  Claude Code can wire them with zero renaming.

### Compositing note for Claude Code

- Card = frame PNG + character PNG layered (CSS position or canvas).
- Rarity upgrade = swap frame asset only.
- Keep characters on their parchment square; the frame's center is the same
  parchment tone, so seams disappear. If you want cleaner layering later,
  background-remove the characters too.

---

## PART 1 — ANCHOR + CARD FRAMES (generate these first)

### 1.1 ⚓ SINBAD — THE HERO ANCHOR (generate first, no reference)

> Stylized storybook game character portrait: Sinbad the Sailor, a young heroic
> Arabian sea captain with a short black beard, coral red turban with a small gold
> pin, open indigo sea-coat over a striped sash, loose trousers tucked into worn
> leather boots, curved scimitar held relaxed at his side, round brass-studded
> shield slung on his back, confident warm smile. [+ MASTER STYLE BLOCK]

→ Save as `anchor_hero.png`. Attach to prompts 1.3–1.7 and key art.

### 1.2 🖼️ CARD FRAME — generate ONCE, then edit for rarities

> Ornamental illuminated manuscript card frame, portrait 3:4, intricate arabesque
> and geometric border in lapis lazuli blue and gold leaf with small coral flower
> accents, the border occupies ONLY the outer edge, completely EMPTY plain aged
> parchment center panel with nothing in it, perfectly symmetrical, flat decorative
> style, no characters, no animals, no scenery, no text, no calligraphy, no watermark

Then 3 EDITS of that same image (use Nano Banana's edit mode on the accepted
frame — do not regenerate from text):

- **frame_common:** "recolor this border to plain dark brown ink with no gold,
  keep everything else identical"
- **frame_rare:** "keep the border but reduce gold to only the four corner
  ornaments, keep everything else identical"
- **frame_epic / starred:** "add richer gold illumination and four small turquoise
  gem inlays at the corners, keep everything else identical"

### CLASS PORTRAITS (attach anchor_hero.png to each)

### 1.3 🏹 The Huntress of the Isles

> Match the attached image's art style exactly: same proportions, same outline
> weight, same face style, same color rendering, same level of detail. New
> character: a young Arabian huntress from the islands of the Indian Ocean, olive
> skin, long black braid under a turquoise headscarf, practical indigo tunic with
> a coral sash, leather bracers, ornate curved wooden bow in hand, quiver holding
> arrows and one giant white roc feather, coiled rope snare on her belt, confident
> alert expression. [+ MASTER STYLE BLOCK]

### 1.4 🔥 The Jinniya

> Match the attached image's art style exactly: same proportions, same outline
> weight, same face style, same color rendering. New character: a mischievous
> young female jinn sorceress with softly glowing turquoise skin and ember-orange
> eyes, dark hair rising into a single smoke-like flame curl, gold bangles, lapis
> blue silk dress with simple arabesque trim, her lower body dissolving into a
> gentle swirl of smoke and gold sparks, one palm holding a tiny storm cloud, the
> other a glowing water droplet, playful smirk. [+ MASTER STYLE BLOCK]

### 1.5 🌀 The Dervish

> Match the attached image's art style exactly: same proportions, same outline
> weight, same face style, same color rendering. New character: a serene whirling
> dervish mystic in a tall honey-colored felt hat and flowing white robe fanned
> out mid-spin, eyes gently closed, short dark beard, amber prayer beads wrapped
> around one raised hand, smooth plain golden light ribbons spiraling around him —
> simple glowing ribbons with absolutely nothing written inside them.
> [+ MASTER STYLE BLOCK]

### 1.6 🔭 The Astrologer of Baghdad

> Match the attached image's art style exactly: same proportions, same outline
> weight, same face style, same color rendering. New character: an elderly sly
> astrologer with a long silver beard and one raised eyebrow, deep indigo robe
> embroidered with simple gold stars and crescent moons, pointed indigo cap,
> holding a glowing ornate brass astrolabe, three tiny star-lights orbiting his
> head, knowing trickster grin. [+ MASTER STYLE BLOCK]

### 1.7 👑 KEY ART — Scheherazade & the King (wide, for title/story)

> Match the attached image's art style exactly for the characters. Scene: elegant
> storyteller queen Scheherazade seated on floor cushions in a moonlit palace
> chamber, one hand raised mid-tale with smooth glowing gold story-threads flowing
> from her fingers forming a tiny ship and a tiny sea monster in the air, brooding
> King Shahryar leaning forward from a shadowed throne, listening, arched window
> showing a crescent moon over domes, warm lantern light against lapis night, aged
> parchment texture, 16:9 landscape, NO border, NO text, NO calligraphy,
> NO watermark

---

## PART 2 — ENEMIES (10)

⚓ Generate 2.1 first. Save the accepted result as `anchor_enemy.png`.
Attach it to 2.2–2.10.

### 2.1 🍺 Drunken Dockhand (Night I, common) — ENEMY ANCHOR

> Match the attached image's art style exactly (attach anchor_hero.png for this
> first one): same proportions, same outline weight, same rendering — same cute
> storybook register, just scruffier. New character: a round swaying dockworker
> with a red nose, patchy beard, patched tunic, rope belt, clay wine jug raised in
> one hand, small wooden barrel under the other arm, comically grumpy menacing
> stumble. [+ MASTER STYLE BLOCK]

→ Save as `anchor_enemy.png`.

### 2.2 🐍 Snake Charmer's Serpent (Night I, common)

> Match the attached image's art style exactly. New character: a hypnotic cobra
> rising from a woven basket, hood patterned with two simple gold medallions, eyes
> as tiny colorful spinning spirals, fangs showing in a sly grin, an abandoned
> wooden flute lying beside the basket, coils stacked in neat decorative curves.
> [+ MASTER STYLE BLOCK]

### 2.3 📦 Cargo Mimic (Night I, common)

> Match the attached image's art style exactly. New character: a wooden shipping
> crate with rope handles that has sprouted a wide grin of jagged plank teeth and
> one glowing coral-red eye peeking between slats, a splintery tongue, a tempting
> little spill of gold coins in front of it as bait. [+ MASTER STYLE BLOCK]

### 2.4 👵 Grandmother Ghouleh (Night I, boss)

> Match the attached image's art style exactly. New character: a hunched
> sweet-looking grandmother in a patched shawl offering a plate of dates with an
> innocent smile, but her shadow behind her is a huge clawed long-fanged ghoul, a
> faint green glow in her eyes, one clawed foot peeking from under her robe.
> [+ MASTER STYLE BLOCK]

### 2.5 🐋 The Whale That Was an Island (Night I, boss)

> Match the attached image's art style exactly. New character: a colossal ancient
> whale whose barnacled back is a small island with two palm trees and a tiny
> abandoned cooking fire, waterfalls pouring off its sides as it begins to dive,
> one enormous calm golden eye, water drawn as simple decorative scalloped waves.
> [+ MASTER STYLE BLOCK]

### 2.6 🐣 Roc Hatchling (Night II, common)

> Match the attached image's art style exactly. New character: an oversized fluffy
> white raptor chick the size of a horse, half a cracked giant eggshell worn on
> its head like a helmet, stubby wings raised in fury, angry golden eyes, standing
> in a nest woven from whole palm trunks, comically fierce. [+ MASTER STYLE BLOCK]

### 2.7 🦅 The Roc (Night II, boss)

> Match the attached image's art style exactly. New character: a mythic colossal
> white and gold roc bird with wings spread wide, feather tips edged in gold,
> fierce golden eyes, huge talons gripping a boulder, a tiny sailboat visible near
> its feet for scale, storm clouds drawn as simple decorative spirals behind it.
> [+ MASTER STYLE BLOCK]

### 2.8 💎 Diamond-Valley Serpent (Night II, common)

> Match the attached image's art style exactly. New character: a huge armored
> serpent coiled on ground littered with glinting raw diamonds, dark opal scales,
> jaw unhinged wide showing fangs, one large sparkling gem lodged in its forehead
> like a crown, coils in neat decorative curves. [+ MASTER STYLE BLOCK]

### 2.9 🧜 Siren of the Shoals (Night II, common)

> Match the attached image's art style exactly. New character: an eerie beautiful
> sea siren perched on a jagged rock, upper body a graceful woman with pearl-strung
> dark hair, lower body a slick teal eel tail coiled around broken ship timber,
> mouth open mid-song with smooth glowing gold ribbons of music flowing out — plain
> ribbons, nothing written on them — two tiny hypnotized fish floating up toward
> her. [+ MASTER STYLE BLOCK]

### 2.10 🧓 The Old Man of the Sea (Night III, boss)

> Match the attached image's art style exactly. Two figures, one composition: a
> wiry sinister old man with seaweed-green skin, wild white hair and a gleeful
> cruel grin, his impossibly long thin legs wrapped tight around the shoulders of
> a struggling young sailor he rides like a mount, gnarled hands gripping the
> sailor's turban. [+ MASTER STYLE BLOCK — but replace "single character" with
> "exactly two figures, one riding the other"]

---

## PART 3 — BACKGROUNDS (6)

No anchor needed. All portrait 9:16, full bleed. Add to EVERY background prompt:

> aged parchment texture overlay, flattened storybook perspective, lapis lazuli
> and midnight indigo night palette with gold leaf and coral accents, whimsical
> slightly eerie dark storybook mood, portrait 9:16 full bleed, NO border,
> NO frame, NO people, NO text, NO calligraphy, NO watermark

### 3.1 🏰 Title — The Palace Chamber

> Moonlit Arabian palace chamber interior seen through a grand horseshoe arch,
> floor cushions and a low brass table with a lit oil lamp, an open book glowing
> softly gold at the center, arched window revealing a crescent moon over a
> sleeping city of domes and minarets. [+ background block]

### 3.2 📖 Codex Map Screen — The Open Manuscript

> An open ancient codex book filling the frame, aged parchment pages with faint
> gold arabesque corner flourishes and subtle ink stains, large EMPTY areas in the
> page centers for game UI, soft candlelight from the upper left, tiny faded ink
> doodles of sea monsters in the outer margins only. [+ background block]

### 3.3 ⚓ Night I — The Harbor of Basra

> Moonlit medieval Basra harbor at night, wooden dhows with furled sails at
> anchor, crates and rolled carpets on the docks, lantern-lit bazaar arcades
> rising behind, domes and one slender minaret against the indigo sky, crescent
> moon reflected in water drawn as decorative scalloped waves, warm gold lantern
> pools. [+ background block]

### 3.4 🌊 Night II — The Uncharted Sea

> Vast open ocean at night, decorative repeating scalloped waves in three shades
> of lapis and turquoise, a lone tiny dhow with a patched sail in the middle
> distance, strange islands on the horizon shaped like sleeping beasts, an
> enormous bird silhouette crossing the crescent moon, gold star field.
> [+ background block]

### 3.5 🌿 Night III — The Old Man and the Deep

> Dark jungle riverbank at night, gnarled trees with vines drawn as curling
> decorative tendrils, a slow black river with gold moonlight ribbons, half-buried
> skulls and broken oars among the roots, fireflies as tiny gold dots, one gap in
> the oppressive canopy showing the crescent moon, copper green and dark red
> accents over lapis darkness. [+ background block]

### 3.6 🏺 Hidden Night — The City of Brass

> Legendary abandoned city of brass at night, towering gates and domes of
> tarnished gold-brass streaked with green oxidation, empty silent streets, frozen
> brass statues of horsemen mid-stride, sand drifting through the gates in
> decorative curls, a single warm light burning in the highest tower, giant low
> crescent moon behind the skyline. [+ background block]

---

## PART 4 — UI KIT (for the JS/HTML interface)

Icons must read at 32–64px: BOLD simple shapes, minimal detail.
Add to every icon prompt:

> simple bold game UI icon, thick clean outlines, flat color with slight gold
> accent, single object centered on plain parchment, square, no border, no text,
> no watermark

Then background-remove each → transparent PNG.

### 4.1 Card type glyphs (4 separate generations)

- ⚔️ **attack glyph** (`glyph_attack.png`): a single curved scimitar, blade up
- 📜 **spell glyph** (`glyph_spell.png`): a small rolled scroll tied with coral ribbon
- ✋ **counter glyph** (`glyph_counter.png`): an open palm facing forward
- 💍 **equipment glyph** (`glyph_equipment.png`): a simple gold ring with a lapis stone

### 4.2 Resource icons

- **AP pip** (`icon_ap.png`): a small round brass astrolabe disc with a gold rim
- **Mana** (`icon_mana.png`): a small blue glass inkwell filled with glowing blue ink
- **HP** (`icon_hp.png`): a lit candle with a warm gold flame on a brass holder
- **Dinar** (`icon_dinar.png`): a single gold coin with a simple geometric stamp

### 4.3 Wonder & Mercy medallions

- **Wonder** (`medallion_wonder.png`): a round gold medallion with a radiant sun
  face, coral accents
- **Mercy** (`medallion_mercy.png`): a round silver-blue medallion with a crescent
  moon and one small star, turquoise accents

### 4.4 Buttons / misc (generate as one sheet if easier)

- **End Turn** (`btn_end_turn.png`): a small brass hourglass, sand mid-fall
- **Deck pile** (`icon_deck.png`): a neat stack of parchment cards, gold edges,
  back showing a simple eight-pointed star
- **Discard pile** (`icon_discard.png`): the same card stack, slightly fanned and tilted
- **Settings** (`icon_settings.png`): a simple eight-pointed Islamic star medallion

---

## PART 5 — GENERATION ORDER

1. Sinbad (1.1) → anchor_hero.png
2. Card frame (1.2) + 3 rarity EDITS
3. Classes 1.3–1.6 (anchor attached, QA each)
4. Dockhand (2.1) → anchor_enemy.png
5. Enemies 2.2–2.10 (enemy anchor attached, QA each)
6. Backgrounds 3.2 + 3.3 first (vertical slice needs them), then the rest
7. UI kit last (fastest to redo, least style-sensitive)
8. Key art (1.7) whenever — it's marketing, not blocking

**Ship checkpoint:** after step 6 you have everything the Night I vertical slice
needs. Hand /assets to Claude Code with the design doc's JSON schemas and the
folder map from Part 0.5.
