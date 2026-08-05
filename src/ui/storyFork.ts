import type { StoryForkDef } from '../engine/types'
import { bottomSheet } from './components'
import { onTap } from './touch'

// DESIGN.md §4.1: "And what did Sinbad do then, O King?" — a 2-3 option
// narrative choice, presented right after the battle that unlocked it.
export function showStoryFork(fork: StoryForkDef, onChoice: (optionId: string) => void): void {
  bottomSheet(fork.narration, undefined, (body, close) => {
    for (const option of fork.options) {
      const btn = document.createElement('button')
      btn.textContent = option.label
      btn.className = 'sheet-leave-btn'
      onTap(btn, () => {
        close()
        onChoice(option.id)
      })
      body.appendChild(btn)
    }
  })
}
