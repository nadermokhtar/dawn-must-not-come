import type { CardDef } from '../engine/types'
import { ceremonyDialog } from './components'
import { createInspectableCardElement } from './cardView'
import { onTap } from './touch'

// DESIGN.md §3.4: level-ups grant card rewards. Free pick of 1 of 3 (or skip),
// distinct from the Bazaar's paid offer even though both draw from
// sampleClassCards.
export function showLevelUpReward(newLevel: number, choices: CardDef[], onPick: (cardId: string | null) => void): void {
  ceremonyDialog(
    { title: `Level ${newLevel}!`, portraitLabel: 'Level Up', ribbonColor: 'var(--gold)' },
    (body, close) => {
      const p = document.createElement('p')
      p.className = 'sheet-narration'
      p.textContent = 'Choose a card to add to your deck.'
      body.appendChild(p)

      const row = document.createElement('div')
      row.className = 'ceremony-choice-row'
      for (const card of choices) {
        const col = document.createElement('div')
        col.className = 'ceremony-choice-col'
        col.appendChild(createInspectableCardElement(card))
        const pickBtn = document.createElement('button')
        pickBtn.textContent = 'Pick'
        onTap(pickBtn, () => {
          close()
          onPick(card.id)
        })
        col.appendChild(pickBtn)
        row.appendChild(col)
      }
      body.appendChild(row)

      const skipBtn = document.createElement('button')
      skipBtn.textContent = 'Skip'
      skipBtn.className = 'ceremony-continue-btn'
      onTap(skipBtn, () => {
        close()
        onPick(null)
      })
      body.appendChild(skipBtn)
    },
  )
}
