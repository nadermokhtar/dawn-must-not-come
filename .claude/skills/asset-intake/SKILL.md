---
name: asset-intake
description: Ingest newly generated art (usually from ~/Downloads) into /assets — dedupe, rename to canonical art_ref names, optimize, and update the manifest. Use whenever the user drops generated images or asks to organize/sort/label assets.
---

# Asset intake

Take a batch of generated images and file them into the fixed `/assets` tree.

## Steps

1. **Dedupe first.** Run `md5` on the batch — generators often emit byte-identical
   duplicates (it happened with the frames). Keep one copy of each hash.
2. **Identify each image** by looking at it, then map it to its canonical filename
   using `assets/MANIFEST.md` (inventory + gaps) and `PROMPT_PACK.md` (the prompt
   each image came from). Names are lowercase snake_case and must match the JSON
   `art_ref` fields exactly — never invent a new name if the manifest already
   defines one.
3. **Copy, don't move** — leave the originals in Downloads.
4. **Backgrounds get a web version.** PNG masters stay, but the game loads JPG:
   `sips -Z 1600 -s format jpeg -s formatOptions 55 <in>.png --out <out>.jpg`
   Target < 400KB; if over, lower quality before lowering resolution.
5. **UI icons** need background removal → transparent PNG (they render at 32–64px).
6. **Anchors rule** (PROMPT_PACK.md Part 0): the accepted Sinbad is
   `anchors/anchor_hero.png`; the accepted Drunken Dockhand should become
   `anchors/anchor_enemy.png` (currently a provisional Ghouleh copy — replace it
   when the Dockhand arrives). Anchors are never shipped.
7. **Update `assets/MANIFEST.md`**: per-folder counts, subject descriptions,
   "Missing" lists, and the vertical-slice checkpoint line at the top.

## QA before saving (from PROMPT_PACK.md)

- Characters: square, single subject, full body, no borders, no script anywhere,
  palette matches lapis/gold/coral/parchment, proportions match the anchor.
- Frames: 3:4 portrait, clean empty parchment center.
- Backgrounds: 9:16 portrait, full bleed, no people, no text.
