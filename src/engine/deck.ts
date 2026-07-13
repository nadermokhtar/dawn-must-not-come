import type { BattleState } from './types'
import type { Rng } from './rng'
import type { Emit } from './events'

export const HAND_HARD_CAP = 10

function drawOne(state: BattleState, rng: Rng, emit: Emit): void {
  const p = state.player
  if (p.drawPile.length === 0) {
    if (p.discard.length === 0) return
    p.drawPile = rng.shuffle(p.discard)
    p.discard = []
    emit({ type: 'shuffle', side: 'player' })
  }
  const card = p.drawPile.shift()
  if (!card) return

  if (p.hand.length >= HAND_HARD_CAP) {
    emit({ type: 'hand_overflow', side: 'player', cardId: card.cardId, uid: card.uid })
    return
  }
  p.hand.push(card)
  emit({ type: 'draw', side: 'player', cardId: card.cardId, uid: card.uid })
}

export function drawCards(state: BattleState, count: number, rng: Rng, emit: Emit): void {
  for (let i = 0; i < count; i++) drawOne(state, rng, emit)
}
