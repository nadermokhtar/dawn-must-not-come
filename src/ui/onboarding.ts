import { ceremonyDialog } from './components'
import { onTap } from './touch'
import { hasSeen, markSeen } from '../run/persistence'

// DESIGN.md §8.5: every telling opens with the basmala — shown at the start
// of every new run (not just the player's first ever), since it's narrative
// framing ("Scheherazade begins the tale anew"), not a one-time tutorial.
export function showBasmalaIntro(onContinue: () => void): void {
  ceremonyDialog({ title: 'Bismillah', portraitLabel: 'Scheherazade', ribbonColor: 'var(--gold)' }, (body, close) => {
    const p = document.createElement('p')
    p.className = 'sheet-narration'
    p.textContent =
      'Bismillah ar-Rahman ar-Rahim [In the name of God, the Most Gracious, the Most Merciful] — and so Scheherazade began the tale of Sinbad, that the King might spare her one more dawn.'
    body.appendChild(p)

    const btn = document.createElement('button')
    btn.className = 'ceremony-continue-btn'
    btn.textContent = 'Begin the Telling'
    onTap(btn, () => {
      close()
      onContinue()
    })
    body.appendChild(btn)
  })
}

function instructionList(lines: string[]): HTMLElement {
  const list = document.createElement('ul')
  list.className = 'onboarding-list'
  for (const line of lines) {
    const li = document.createElement('li')
    li.textContent = line
    list.appendChild(li)
  }
  return list
}

const MAP_TUTORIAL_FLAG = 'map-intro'

// One-time (per profile, DESIGN.md §8.5 conventions aside — this is a
// mechanics tutorial, not narration) explainer for the map: shown before the
// player has ever picked a Verse, since "tap one of three cards, some lead
// to a fight, some don't" isn't discoverable from the art alone.
export function maybeShowMapTutorial(onContinue: () => void): void {
  if (hasSeen(MAP_TUTORIAL_FLAG)) {
    onContinue()
    return
  }
  markSeen(MAP_TUTORIAL_FLAG)

  ceremonyDialog({ title: 'The Manuscript', portraitLabel: 'The King', ribbonColor: 'var(--gold)' }, (body, close) => {
    const p = document.createElement('p')
    p.className = 'sheet-narration'
    p.textContent = '"And what befalls him next?" the King asked, and Scheherazade turned the page to show three paths.'
    body.appendChild(p)

    body.appendChild(
      instructionList([
        'Tap one of the three Verses below to enter it.',
        'A red-bordered Verse means a fight — check the level badge before you commit.',
        'The others lead to the Bazaar, a Blessing, a Chest, and more — picking one only replaces that one; the other two stay put.',
        'Tap-and-hold any card, anywhere, to read its full effect.',
      ]),
    )

    const btn = document.createElement('button')
    btn.className = 'ceremony-continue-btn'
    btn.textContent = 'Turn the Page'
    onTap(btn, () => {
      close()
      onContinue()
    })
    body.appendChild(btn)
  })
}

export function showMapHelp(): void {
  maybeShowMapTutorial(() => {})
}

const BATTLE_TUTORIAL_FLAG = 'battle-intro'

// One-time (per profile) explainer for the battle screen — shown before the
// player's first-ever fight starts. Mechanics-focused rather than narration:
// this exists because "the art is interesting but I don't know what to do"
// was real playtest feedback, not a hypothetical gap.
export function maybeShowBattleTutorial(onContinue: () => void): void {
  if (hasSeen(BATTLE_TUTORIAL_FLAG)) {
    onContinue()
    return
  }
  markSeen(BATTLE_TUTORIAL_FLAG)

  ceremonyDialog({ title: 'How to Fight', portraitLabel: 'Sinbad', portraitRef: 'classes/sinbad.png', ribbonColor: 'var(--coral)' }, (body, close) => {
    const p = document.createElement('p')
    p.className = 'sheet-narration'
    p.textContent = '"Steady your hand," Scheherazade said. "The tale turns on what Sinbad plays next."'
    body.appendChild(p)

    body.appendChild(
      instructionList([
        'Tap a card once to raise it, tap it again to play it.',
        'A gold cost badge means it costs Action Points (AP); blue means Mana.',
        'Tap-and-hold any card for its full effect, any time.',
        'Tap End Turn when you’re done — the enemy plays after you.',
        'Your HP, Mana, and AP are at the bottom; the enemy’s are up top.',
      ]),
    )

    const btn = document.createElement('button')
    btn.className = 'ceremony-continue-btn'
    btn.textContent = 'Face the Foe'
    onTap(btn, () => {
      close()
      onContinue()
    })
    body.appendChild(btn)
  })
}

export function showBattleHelp(): void {
  maybeShowBattleTutorial(() => {})
}
