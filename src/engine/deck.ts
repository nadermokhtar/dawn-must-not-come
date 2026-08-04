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

export interface PileCounts {
  drawPile: number
  hand: number
  discard: number
  exhaust: number
  counters: number
  total: number
}

// Never touches exhaust: reshuffles only pull from discard, so an exhausted
// card is gone for the rest of the battle by construction.
export function pileCounts(state: BattleState): PileCounts {
  const p = state.player
  return {
    drawPile: p.drawPile.length,
    hand: p.hand.length,
    discard: p.discard.length,
    exhaust: p.exhaust.length,
    counters: p.counters.length,
    total: p.drawPile.length + p.hand.length + p.discard.length + p.exhaust.length + p.counters.length,
  }
}
