import { describe, expect, it } from 'vitest'
import { startBattle, playCard, endTurn } from './battle'
import type { BattleEvent } from './events'
import { makeFixtureContent } from './testFixtures'

function runScript(seed: number): BattleEvent[] {
  const content = makeFixtureContent()
  // Mixed card ids so the shuffle's seed-dependent ordering is actually
  // observable in the resulting event log (an all-identical deck would
  // shuffle into an indistinguishable sequence regardless of seed).
  const deck = Array.from({ length: 15 }, (_, i) => (i % 2 === 0 ? 'test_attack' : 'test_attack_costly'))
  const result = startBattle({
    playerStats: { hp: 30, apBase: 2, mana: 0, manaMax: 2, handSize: 5 },
    deck,
    enemyId: 'test_enemy',
    content,
    seed,
  })
  const events = [...result.events]
  const state = result.state

  for (let i = 0; i < 3 && state.phase === 'player'; i++) {
    const card = state.player.hand[0]
    if (card) {
      const res = playCard(state, content, card.uid)
      if ('events' in res) events.push(...res.events)
    }
    const res2 = endTurn(state, content)
    events.push(...res2.events)
  }

  return events
}

describe('replay determinism', () => {
  it('produces an identical event log for the same seed and action sequence', () => {
    const a = runScript(777)
    const b = runScript(777)
    expect(a).toEqual(b)
  })

  it('diverges for a different seed', () => {
    const a = runScript(777)
    const c = runScript(778)
    expect(a).not.toEqual(c)
  })
})
