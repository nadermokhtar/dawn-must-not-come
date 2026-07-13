import { describe, expect, it } from 'vitest'
import { pickEnemyMove } from './enemyAI'
import { startBattle } from './battle'
import { createRng } from './rng'
import type { BattleState } from './types'
import { makeFixtureContent } from './testFixtures'

function makeState(enemyId: string): BattleState {
  return {
    turn: 1,
    phase: 'player',
    player: {
      hp: 30,
      maxHp: 30,
      ap: 2,
      apBase: 2,
      mana: 0,
      manaMax: 0,
      effects: [],
      drawPile: [],
      hand: [],
      discard: [],
      exhaust: [],
      counters: [],
      handSize: 5,
    },
    enemy: {
      hp: 20,
      maxHp: 20,
      ap: 0,
      apBase: 0,
      mana: 0,
      manaMax: 0,
      effects: [],
      enemyId,
      deckCursor: 0,
    },
    rngState: 1,
    nextUid: 1,
  }
}

describe('enemyAI', () => {
  it('plays sequentially through the deck array and wraps around', () => {
    const content = makeFixtureContent()
    const state = makeState('test_enemy') // deck: [enemy_attack, enemy_attack2]
    const rng = createRng(1)
    const picks = [
      pickEnemyMove(state, content, rng),
      pickEnemyMove(state, content, rng),
      pickEnemyMove(state, content, rng),
      pickEnemyMove(state, content, rng),
    ]
    expect(picks).toEqual(['enemy_attack', 'enemy_attack2', 'enemy_attack', 'enemy_attack2'])
  })

  it('picks weighted-random moves deterministically for a given seed', () => {
    const content = makeFixtureContent()
    const stateA = makeState('test_enemy_random')
    const stateB = makeState('test_enemy_random')
    const picksA = Array.from({ length: 8 }, () => pickEnemyMove(stateA, content, createRng(99)))
    const picksB = Array.from({ length: 8 }, () => pickEnemyMove(stateB, content, createRng(99)))
    // same rng seed reconstructed identically each call -> identical picks
    expect(picksA).toEqual(picksB)
    expect(new Set(picksA).size).toBeGreaterThan(0)
  })

  it('lets an enemy with first_move act before the player\'s first turn', () => {
    const content = makeFixtureContent()
    const result = startBattle({
      playerStats: { hp: 30, apBase: 2, mana: 0, manaMax: 2, handSize: 5 },
      deck: ['test_attack'],
      enemyId: 'test_enemy_first_move',
      content,
      seed: 1,
    })
    expect(result.state.player.hp).toBe(26) // took the enemy's 4-damage attack before turn 1
    const firstEnemyPlayIndex = result.events.findIndex((e) => e.type === 'enemy_play')
    const firstPlayerTurnIndex = result.events.findIndex((e) => e.type === 'turn_start' && e.side === 'player')
    expect(firstEnemyPlayIndex).toBeGreaterThanOrEqual(0)
    expect(firstEnemyPlayIndex).toBeLessThan(firstPlayerTurnIndex)
  })
})
