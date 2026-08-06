import { describe, expect, it } from 'vitest'
import { applyDamage } from './damage'
import type { BattleState } from './types'
import { makeFixtureContent } from './testFixtures'

function makeState(overrides: Partial<{ playerEffects: BattleState['player']['effects'] }> = {}): BattleState {
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
      effects: overrides.playerEffects ?? [],
      drawPile: [],
      hand: [],
      discard: [],
      exhaust: [],
      counters: [],
      handSize: 5,
      drawBase: 3,
    },
    enemy: {
      hp: 20,
      maxHp: 20,
      ap: 0,
      apBase: 0,
      mana: 0,
      manaMax: 0,
      effects: [],
      enemyId: 'test_enemy',
      deckCursor: 0,
    },
    rngState: 1,
    nextUid: 1,
  }
}

describe('damage', () => {
  it('deals base damage against a neutral dtype', () => {
    const content = makeFixtureContent()
    const state = makeState()
    const events: unknown[] = []
    applyDamage(state, content, 'player', 'enemy', 'steel', 5, (e) => events.push(e))
    expect(state.enemy.hp).toBe(15)
  })

  it('halves damage against resist', () => {
    const content = makeFixtureContent()
    const state = makeState()
    state.enemy.enemyId = 'test_enemy_resist'
    applyDamage(state, content, 'player', 'enemy', 'steel', 10, () => {})
    expect(state.enemy.hp).toBe(15) // 10 * 0.5 = 5 dealt
  })

  it('doubles damage against weakness', () => {
    const content = makeFixtureContent()
    const state = makeState()
    state.enemy.enemyId = 'test_enemy_resist'
    applyDamage(state, content, 'player', 'enemy', 'ifrit_flame', 5, () => {})
    expect(state.enemy.hp).toBe(10) // 5 * 2 = 10 dealt
  })

  it('never rounds a positive hit down to zero', () => {
    const content = makeFixtureContent()
    const state = makeState()
    state.enemy.enemyId = 'test_enemy_resist'
    applyDamage(state, content, 'player', 'enemy', 'steel', 1, () => {})
    // 1 * 0.5 = 0.5, floors to 0, but min-1 rule keeps it at 1
    expect(state.enemy.hp).toBe(19)
  })

  it('armor absorbs stacks worth of damage and consumes them', () => {
    const content = makeFixtureContent()
    const state = makeState({ playerEffects: [{ effectId: 'armor', stacks: 3 }] })
    const events: unknown[] = []
    applyDamage(state, content, 'enemy', 'player', 'steel', 5, (e) => events.push(e))
    expect(state.player.hp).toBe(28) // 5 - 3 absorbed = 2 dealt
    expect(state.player.effects.find((e) => e.effectId === 'armor')).toBeUndefined()
  })

  it('true_strike bypasses armor but not resist/weak', () => {
    const content = makeFixtureContent()
    const state = makeState({ playerEffects: [{ effectId: 'armor', stacks: 3 }] })
    applyDamage(state, content, 'enemy', 'player', 'true_strike', 5, () => {})
    expect(state.player.hp).toBe(25) // full 5 damage, armor not consumed
    expect(state.player.effects.find((e) => e.effectId === 'armor')?.stacks).toBe(3)
  })
})
