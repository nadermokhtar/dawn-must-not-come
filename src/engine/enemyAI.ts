import type { BattleState, Content } from './types'
import type { Rng } from './rng'

export function pickEnemyMove(state: BattleState, content: Content, rng: Rng): string {
  const enemyDef = content.enemies.get(state.enemy.enemyId)
  if (!enemyDef) throw new Error(`unknown enemy ${state.enemy.enemyId}`)
  const mode = enemyDef.ai?.mode ?? 'sequential'

  if (mode === 'random') {
    const weights = enemyDef.ai?.weights ?? enemyDef.deck.map(() => 1)
    return weightedPick(rng, enemyDef.deck, weights)
  }

  const cardId = enemyDef.deck[state.enemy.deckCursor % enemyDef.deck.length]!
  state.enemy.deckCursor += 1
  return cardId
}

function weightedPick(rng: Rng, items: string[], weights: number[]): string {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rng.next() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i] ?? 1
    if (r <= 0) return items[i]!
  }
  return items[items.length - 1]!
}
