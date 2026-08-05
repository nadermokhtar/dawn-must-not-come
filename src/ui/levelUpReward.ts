import type { CardDef } from '../engine/types'
import { bottomSheet } from './components'
import { onTap } from './touch'

// DESIGN.md §3.4: level-ups grant card rewards. Free pick of 1 of 3 (or skip),
// distinct from the Bazaar's paid offer even though both draw from
// sampleClassCards.
export function showLevelUpReward(newLevel: number, choices: CardDef[], onPick: (cardId: string | null) => void): void {
  bottomSheet(`Level ${newLevel}!`, undefined, (body, close) => {
    const p = document.createElement('p')
    p.className = 'sheet-narration'
    p.textContent = 'Choose a card to add to your deck.'
    body.appendChild(p)

    for (const card of choices) {
      const btn = document.createElement('button')
      btn.textContent = card.name
      btn.className = 'sheet-leave-btn'
      onTap(btn, () => {
        close()
        onPick(card.id)
      })
      body.appendChild(btn)
    }

    const skipBtn = document.createElement('button')
    skipBtn.textContent = 'Skip'
    skipBtn.className = 'sheet-leave-btn'
    onTap(skipBtn, () => {
      close()
      onPick(null)
    })
    body.appendChild(skipBtn)
  })
}
