# Assets manifest — Dawn Must Not Come

Tracks generated art against `PROMPT_PACK.md` (Nano Banana Prompt Pack v2.0).
Layout per DESIGN.md §9.5 / pack Part 0.5. Filenames are the `art_ref` targets in
game data. Originals remain in ~/Downloads.

## Vertical-slice ship checkpoint (pack Part 5, step 6)
Needs: anchors ✓ · frames (3/4) · classes ✓ · **Night I enemies 13/13 ✓ (all art_ref
resolved)** · Night II enemies (3/16 beyond pack-2) · backgrounds (6/6 masters ✓, 4
need art_ref wiring) · UI kit (6/14, no transparency yet)

## anchors/ — 2/2 (never shipped in builds)
| File | Status |
|---|---|
| anchor_hero.png | ✓ copy of accepted Sinbad (pack 1.1) |
| anchor_enemy.png | ✓ copy of the Drunken Dockhand (2.1), replacing the provisional Ghouleh copy — matches the pack's intended anchor exactly. |

## classes/ — 5/5 ✓ (pack 1.1, 1.3–1.6)
| File | Subject |
|---|---|
| sinbad.png | Sinbad the Sailor — red turban, scimitar, shield |
| huntress.png | Huntress of the Isles — bow, quiver with Roc feather |
| jinniya.png | The Jinniya — smoke-form spell weaver (storm + tide) |
| dervish.png | The Dervish — whirling, misbaha, plain gold ribbons |
| astrologer.png | Astrologer of Baghdad — brass astrolabe, star turban |

**Alternates not filed** (found in the 2026-08-05 intake batch, not clear
upgrades over the accepted versions — kept in the source Downloads folder,
not copied in): an alternate Astrologer pose/lighting, an alternate Dervish
with a glowing calligraphy swirl effect. Swap in if either reads better.

## enemies/ — 10/10 ✓ (pack 2.1–2.10)
| File | Subject |
|---|---|
| dockhand.png | Night I common — wine jug + barrel, harbor backdrop (2.1) |
| snake_charmers_serpent.png | Night I common — cobra rising from a basket (2.2) |
| cargo_mimic.png | Night I common — crate with teeth + coin bait (2.3) |
| ghouleh.png | Night I boss — grandmother with ghoul shadow (2.4) |
| whale_island.png | Night I boss — island whale diving (2.5) |
| roc_hatchling.png | Night II common — eggshell helmet (2.6) |
| roc.png | Night II boss — sailboat for scale (2.7) |
| diamond_valley_serpent.png | Night II common — jeweled serpent, diamond crown (2.8) |
| siren.png | Night II common — gold song ribbons (2.9) |
| old_man_of_the_sea.png | Night III boss — riding the sailor (2.10) |

All 10 pack enemies now filed, with filenames matching each enemy's actual
`art_ref` field in `data/enemies/*.json` (which has since diverged from the
pack's generic numbering — e.g. 2.2/2.8 are wired as `snake_charmers_serpent.png`
/ `diamond_valley_serpent.png`, matching the enemy's own id, not `serpent.png`/
`diamond_serpent.png`).

### Beyond the pack — Night I (13/13 ✓, roster complete)
The game's enemy roster grew well past the original 10; these 9 aren't in
PROMPT_PACK.md at all (custom-prompted 2026-08-05, matching each enemy's
`data/enemies/night1.json` entry):

| File | Subject |
|---|---|
| rat_of_the_hold.png | Mangy bilge rat, rope + coins + stolen cookie |
| customs_officer.png | Corrupt official, wax-seal stamp + ledger |
| pickpocket_of_the_souk.png | Hooded thief mid-swipe at a coin purse |
| angry_pelican.png | Furious pelican, fish in beak, harbor post |
| pearl_diver.png | Wet free-diver, net bag of pearl oysters, dive knife |
| ships_cook.png | Burly cook, cleaver + ladle, onion/fish necklace |
| sleepless_watchman.png | Gaunt hollow-eyed guard, halberd + lantern |
| stray_ghul_pup.png | Small green ghoul-pup, bat ears, feral crouch |
| superstitious_sailor.png | Nervous sailor draped in charms, warding gesture |

**Night I enemy roster is now 100% art-complete (13/13).**

### Beyond the pack — Night II (3/16, still mostly placeholder)
Still resolve to the placehold.co fallback: ape_of_the_black_isle,
cannibal_scout, cyclopean_shepherds_ram, drowned_sailor, living_figurehead,
merchant_of_dubious_meat, storm_sprite. **Possible match found, not filed:** a
"grumpy patchwork ogre" illustration from the earlier 2026-08-05 batch could
fit `merchant_of_dubious_meat.png` (a large, unkempt figure) but doesn't match
any pack-2 description precisely — needs a call on whether it's a good fit
before filing.

## frames/ — 3/4 (pack 1.2)
| File | Rarity tier |
|---|---|
| frame_common.png | Ink-only border (1792×2400, 3:4 ✓) |
| frame_rare.png | Gold corner ornaments |
| frame_starred.png | Full illumination + turquoise gems |

**Missing:** frame_epic.png. Note: the generated batch had a byte-identical
duplicate of the gem frame; per the pack, epic and starred can share the gem
edit or epic can be a lighter edit of it. Not present in the 2026-08-05 intake
batch either — the "Ornate Certificate Border Template" files in that batch were
duplicates of frame_common/frame_rare/frame_starred, not a 4th variant.

## backgrounds/ — 6/6 masters ✓, 2/6 wired to art_ref (pack 3.1–3.6)
| File | Subject |
|---|---|
| bg_title.png / **bg_title.jpg** | Palace chamber, glowing book (3.1) |
| bg_codex.png / **bg_codex.jpg** | Open manuscript for map screen (3.2) |
| bg_night1.png / **bg_night1.jpg** | Basra harbor — dhows, bazaar arcades, minaret (3.3) — **was the slice-blocking gap** |
| bg_night2.png / **bg_night2.jpg** | Uncharted Sea — lone dhow, dragon-shaped island, roc silhouette crossing the moon (3.4) |
| bg_night3.png / **bg_night3.jpg** | The Old Man and the Deep — jungle river, skulls and oars among roots (3.5) |
| bg_night4.png / **bg_night4.jpg** | City of Brass (Hidden Night) — brass gates, frozen horseman statues (3.6) |

PNGs are ~7–11MB masters (1536×2752). **The game must load the .jpg versions**
(1600px, all 197–338KB — under the pack's 400KB mobile spec).

**Not yet wired:** no Verse/night data currently sets `art_ref` to
`backgrounds/bg_night1.jpg` etc. — someone needs to add that wiring (likely in
`data/verses/*.json` or wherever Night backgrounds are selected) with full
context of how the map/battle screens pick a background per Night.

## keyart/ — 1/1 ✓ (pack 1.7)
| File | Subject |
|---|---|
| scheherazade_king.png | Scheherazade + King Shahryar, 16:9 (2752×1536) |

## ui/ — 6/14 filed, **0/6 background-removed** (pack Part 4)
| File | Subject | Transparency |
|---|---|---|
| glyph_attack.png | Curved scimitar, blade up | ✗ opaque parchment bg |
| glyph_spell.png | Rolled scroll, coral ribbon | ✗ opaque parchment bg |
| glyph_counter.png | Open palm facing forward | ✗ opaque parchment bg |
| glyph_equipment.png | Gold ring, blue/lapis stone | ✗ opaque parchment bg |
| icon_mana.png | Blue jar (pack calls for an inkwell — close but not literal) | ✗ opaque parchment bg |
| icon_ap.png | Gold coin with astrolabe motif (pack calls for a plain astrolabe disc — lower-confidence match) | ✗ opaque parchment bg |

**All 6 need real background removal before use** — tried an automated
multi-seed flood-fill (Pillow) against the parchment backdrop; the parchment
has a visible tone gradient corner-to-corner, so the flood-fill left a hard
seam partway across the icon instead of a clean cutout. Shipped opaque rather
than commit a half-transparent result. Needs a proper tool (Photoshop,
remove.bg, rembg with a real model) or manual touch-up.

**Still missing entirely:** icon_hp, icon_dinar, medallion_wonder,
medallion_mercy, btn_end_turn, icon_deck, icon_discard, icon_settings.

**Not filed — decorative/unclear purpose, found in the 2026-08-05 batch:**
two wide "ornate frame template" card-layout illustrations (Huntress and
Sinbad, each with blank side panels over a night-harbor backdrop) — not a
pack-defined asset, no obvious `art_ref` slot to fill. Flag for a call on
whether these are useful for some future promo/card-back use before filing.
