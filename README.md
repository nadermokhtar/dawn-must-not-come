# Dawn Must Not Come

A single-player, storybook deckbuilding roguelike — *Night of the Full Moon* mechanics,
re-themed as Scheherazade telling the voyages of Sinbad to King Shahryar. Web-based,
mobile-first, runs fully client-side (no backend, no account, saves to your browser).

The full design document lives in [`DESIGN.md`](./DESIGN.md).

## Setup

Requires [Node.js](https://nodejs.org) `^20.19.0` or `>=22.12.0` (Vite 7's requirement;
tested on 24).

```bash
git clone git@github.com:nadermokhtar/dawn-must-not-come.git
cd dawn-must-not-come
npm install
npm run dev
```

Then open the URL Vite prints (typically `http://localhost:5173`). It's mobile-first —
either resize your browser to a narrow portrait window, or open your browser's device
toolbar/responsive mode for the real experience.

Other scripts:

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm test` | Run the engine/data test suite once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the production build locally |

## Where things stand

**Night I → Night II is playable start to finish.** Load the game, navigate the map,
fight your way through Night I's enemies, beat the boss to advance to Night II, and
keep going until Night II's boss (currently the run's ending).

- **Battle engine** — turn-based combat: AP/mana, draw/discard/exhaust, damage types
  and resistances, buffs/debuffs, counters, win/loss.
- **Map (Verse) system** — the 3-face-up-cards loop from *Night of the Full Moon*:
  page counter, "Turn the Page" reshuffle, all node kinds (battle, shop, upgrade,
  remove, blessing, chest, event, bank, boss).
- **Working economy** — the Bazaar, the Calligrapher, the House of Forgetting, the
  Jinni of the Lamp, the Coin Djinn (deposit dinars, withdraw later with interest),
  and the Sealed Jar (risk/reward: a blessing or a curse card).
- **Leveling** — 12 Night I enemies (levels 1–12) + The Whale That Was an Island
  (level 15), and 10 Night II enemies (levels 8–17) + The Roc (level 20). XP per
  kill, level up roughly every 2 fights, max HP grows with you, and a free card pick
  on level-up. The map only offers a fight within one level of your own.
- **The Telling** — 3 Story Forks (narrative choices tied to specific enemies) with
  Wonder/Mercy stats that grant threshold bonuses (+max HP, +dinars).
- **Persistence** — your run (map progress, deck, level, dinars, etc.) survives
  closing the tab. Mid-battle state doesn't — closing mid-fight just restarts that
  one fight.
- **Combat feel** — slash/hit animations, a decorative enemy hand of cards, and
  narration barks (the King asking questions, Scheherazade narrating the answer —
  not Scheherazade addressing Sinbad directly).
- **Art** — most of it is still placeholder (see [`assets/MANIFEST.md`](./assets/MANIFEST.md)
  for exactly what's real vs. generated placeholder text). A handful of real
  backgrounds/keyart/class portraits are wired in already; everything else falls
  back to a placehold.co placeholder image rather than a blank box.

**Not yet built:** Night III onward, the Hidden Night IV secret-chain unlocks (Night
II's Locked Diary/Eccentric Seeds/VIP Card verses are flavor-only stubs right now),
the boss's "battlefield sinks in phases" gimmick, mid-battle persistence.

See the "Project status" section at the top of [`CLAUDE.md`](./CLAUDE.md) for the
most current, actively-maintained snapshot of what's done and what's next — including
a balance-tuning pass and the specific numbers changed.

## Feedback

Open a [GitHub Issue](https://github.com/nadermokhtar/dawn-must-not-come/issues) on
this repo — bug reports, balance complaints, "this feels bad," typos in the
narration, whatever. If you're describing something that happened mid-run, a
screenshot plus what you tapped right before it helps a lot.
