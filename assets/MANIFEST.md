# Assets manifest — Dawn Must Not Come

Tracks generated art against `PROMPT_PACK.md` (Nano Banana Prompt Pack v2.0).
Layout per DESIGN.md §9.5 / pack Part 0.5. Filenames are the `art_ref` targets in
game data. Originals remain in ~/Downloads.

## Vertical-slice ship checkpoint (pack Part 5, step 6)
Needs: anchors ✓ · frames (3/4) · classes ✓ · Night I enemies (4/6 by roster) ·
bg_codex ✓ + bg_night1 ✗ · UI kit ✗

## anchors/ — 2/2 (never shipped in builds)
| File | Status |
|---|---|
| anchor_hero.png | ✓ copy of accepted Sinbad (pack 1.1) |
| anchor_enemy.png | ✓ PROVISIONAL — copy of Ghouleh. Pack designates the Drunken Dockhand (2.1) as enemy anchor; replace when it's generated, or keep Ghouleh if her register reads right. |

## classes/ — 5/5 ✓ (pack 1.1, 1.3–1.6)
| File | Subject |
|---|---|
| sinbad.png | Sinbad the Sailor — red turban, scimitar, shield |
| huntress.png | Huntress of the Isles — bow, quiver with Roc feather |
| jinniya.png | The Jinniya — smoke-form spell weaver (storm + tide) |
| dervish.png | The Dervish — whirling, misbaha, plain gold ribbons |
| astrologer.png | Astrologer of Baghdad — brass astrolabe, star turban |

## enemies/ — 7/10 (pack 2.1–2.10)
| File | Subject |
|---|---|
| old_man_of_the_sea.png | Night III boss — riding the sailor (2.10) |
| whale_island.png | Night I boss — island whale diving (2.5) |
| ghouleh.png | Night I boss — grandmother with ghoul shadow (2.4) |
| cargo_mimic.png | Night I common — crate with teeth + coin bait (2.3) |
| siren.png | Night II common — gold song ribbons (2.9) |
| roc.png | Night II boss — sailboat for scale (2.7) |
| roc_hatchling.png | Night II common — eggshell helmet (2.6) |

**Missing:** dockhand.png (2.1 — also the enemy anchor), serpent.png (2.2),
diamond_serpent.png (2.8)

## frames/ — 3/4 (pack 1.2)
| File | Rarity tier |
|---|---|
| frame_common.png | Ink-only border (1792×2400, 3:4 ✓) |
| frame_rare.png | Gold corner ornaments |
| frame_starred.png | Full illumination + turquoise gems |

**Missing:** frame_epic.png. Note: the generated batch had a byte-identical
duplicate of the gem frame; per the pack, epic and starred can share the gem
edit or epic can be a lighter edit of it.

## backgrounds/ — 2/6 (pack 3.1–3.6)
| File | Subject |
|---|---|
| bg_title.png / **bg_title.jpg** | Palace chamber, glowing book (3.1) |
| bg_codex.png / **bg_codex.jpg** | Open manuscript for map screen (3.2) |

PNGs are ~10MB masters (1536×2752). **The game must load the .jpg versions**
(1600px, 268–388KB — meets the pack's <400KB mobile spec). Re-run the same
sips conversion for each new background.

**Missing:** bg_night1 (3.3 Basra — slice-blocking), bg_night2 (3.4),
bg_night3 (3.5), bg_night4 (3.6 City of Brass)

## keyart/ — 1/1 ✓ (pack 1.7)
| File | Subject |
|---|---|
| scheherazade_king.png | Scheherazade + King Shahryar, 16:9 (2752×1536) |

## ui/ — 0/14 (pack Part 4; filenames assigned in PROMPT_PACK.md)
glyph_attack, glyph_spell, glyph_counter, glyph_equipment ·
icon_ap, icon_mana, icon_hp, icon_dinar ·
medallion_wonder, medallion_mercy ·
btn_end_turn, icon_deck, icon_discard, icon_settings
(all .png with transparency after background removal; must read at 32–64px)
