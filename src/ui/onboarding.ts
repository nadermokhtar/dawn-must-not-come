import { ceremonyDialog } from './components'
import { onTap } from './touch'
import { hasSeen, markSeen } from '../run/persistence'
import type { RunState } from '../engine/run'

interface DialogueLine {
  speaker: 'Shahryar' | 'Shahrazad'
  text: string
}

// DESIGN.md §8.5: every telling opens with this frame-story exchange — shown
// at the start of every new run (not just the player's first ever), since
// it's narrative framing ("Shahrazad begins the tale anew"), not a one-time
// tutorial. Ends with the basmala folded into Shahrazad's final line, right
// as she actually begins speaking the tale, rather than as a separate beat.
const OPENING_DIALOGUE: DialogueLine[] = [
  { speaker: 'Shahryar', text: 'You linger again tonight, Shahrazad. The hour is late, and still you do not sleep.' },
  { speaker: 'Shahrazad', text: 'Sleep is for those with nothing left to owe, my lord. I have a debt unpaid — one more night, one more tale.' },
  { speaker: 'Shahryar', text: 'You speak of debt as though stories were coin. What could a tale possibly purchase?' },
  { speaker: 'Shahrazad', text: 'Time, my lord. And perhaps, if the telling is true enough, a little mercy besides.' },
  { speaker: 'Shahryar', text: 'Then tell me — whose voyage do you carry with you this evening?' },
  {
    speaker: 'Shahrazad',
    text: "A merchant of Baghdad, my lord, who was not content to count his father's gold and call it a life. He wanted to know what lay past the edge of the map — and the sea, in her way, agreed to teach him.",
  },
  { speaker: 'Shahryar', text: 'A dangerous teacher.' },
  { speaker: 'Shahrazad', text: 'The only honest kind. She does not flatter a man who does not deserve to float.' },
  { speaker: 'Shahryar', text: 'And his name?' },
  {
    speaker: 'Shahrazad',
    text: 'Sinbad, my lord. Though by the time the tide is done with him, he will answer to a great many other names — fool, survivor, captive, king. The sea does not ask a man who he was before she found him. Only who he becomes after.',
  },
  { speaker: 'Shahryar', text: 'Then begin, Shahrazad. Let the water take him.' },
  {
    speaker: 'Shahrazad',
    text: 'As my lord commands. Bismillah ar-Rahman ar-Rahim [In the name of God, the Most Gracious, the Most Merciful]. It is told — and Allah knows best — that in the days of the Caliph Harun al-Rashid, there lived in the city of Baghdad a man of middling fortune and immoderate curiosity, who looked upon the harbor each morning and felt, in his chest, a tide of his own...',
  },
]

export function showBasmalaIntro(onContinue: () => void): void {
  let index = 0

  ceremonyDialog({ title: 'A Thousand and One Tides', portraitLabel: 'Shahrazad', ribbonColor: 'var(--gold)' }, (body, close) => {
    function render(): void {
      body.innerHTML = ''
      const line = OPENING_DIALOGUE[index]!

      const speaker = document.createElement('p')
      speaker.className = 'dialogue-speaker'
      speaker.textContent = line.speaker === 'Shahryar' ? 'King Shahryar' : 'Shahrazad'
      body.appendChild(speaker)

      const p = document.createElement('p')
      p.className = 'sheet-narration'
      p.textContent = line.text
      body.appendChild(p)

      const isLast = index === OPENING_DIALOGUE.length - 1
      const btn = document.createElement('button')
      btn.className = 'ceremony-continue-btn'
      btn.textContent = isLast ? 'Begin the Telling' : 'Continue'
      onTap(btn, () => {
        if (isLast) {
          close()
          onContinue()
        } else {
          index += 1
          render()
        }
      })
      body.appendChild(btn)
    }

    render()
  })
}

// A visibly secondary "I already know this" option next to the primary CTA
// — does exactly what the primary button does (close + continue), just
// labeled for someone who doesn't want to read the list. Not used on the
// basmala, which is already a single tap with no reading friction.
function skipLink(close: () => void, onContinue: () => void): HTMLElement {
  const btn = document.createElement('button')
  btn.className = 'onboarding-skip-btn'
  btn.textContent = "I know, skip this"
  onTap(btn, () => {
    close()
    onContinue()
  })
  return btn
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
    p.textContent = '"And what befalls him next?" the King asked, and Shahrazad turned the page to show three paths.'
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
    body.appendChild(skipLink(close, onContinue))
  })
}

export function showMapHelp(): void {
  maybeShowMapTutorial(() => {})
}

const BATTLE_TUTORIAL_FLAG = 'battle-intro'

// Read-only check for battle.ts to capture "is this the tutorial battle?" at
// mount time, before maybeShowBattleTutorial (below) marks the flag seen —
// drives in-fight coaching tips that should only ever fire once, on the
// player's actual first fight, not just the pre-fight explainer dialog.
export function isFirstEverBattle(): boolean {
  return !hasSeen(BATTLE_TUTORIAL_FLAG)
}

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
    p.textContent = '"Steady your hand," Shahrazad said. "The tale turns on what Sinbad plays next."'
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
    body.appendChild(skipLink(close, onContinue))
  })
}

export function showBattleHelp(): void {
  maybeShowBattleTutorial(() => {})
}

// A loaded save with real progress means the player already knows how to
// play — they just haven't seen these specific dialogs yet, since the flags
// they gate on didn't exist before this onboarding system shipped. Silently
// marks both seen so an experienced player picking the game back up never
// gets a beginner tutorial sprung on them. Safe to call on every load: once
// both flags are set, this is a no-op.
export function skipTutorialsForExperiencedPlayer(run: RunState): void {
  const hasProgress = run.page > 0 || run.night > 1 || run.level > 1
  if (!hasProgress) return
  markSeen(MAP_TUTORIAL_FLAG)
  markSeen(BATTLE_TUTORIAL_FLAG)
}
