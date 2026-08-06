import { describe, expect, it } from 'vitest'
import { runHooks } from './effects'
import { applyEffectStacks } from './primitives'
import { applyDamage } from './damage'
import { startBattle } from './battle'
import { createRng } from './rng'
import type { BattleState, EffectDef } from './types'
import { makeFixtureContent } from './testFixtures'

function makeState(): BattleState {
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

describe('effects', () => {
  it('applies and merges stacks, clamped to max_stacks', () => {
    const content = makeFixtureContent()
    const state = makeState()
    applyEffectStacks(state, content, 'player', 'armor', 5, () => {})
    applyEffectStacks(state, content, 'player', 'armor', 3, () => {})
    expect(state.player.effects.find((e) => e.effectId === 'armor')?.stacks).toBe(8)

    applyEffectStacks(state, content, 'player', 'dizzy', 1, () => {})
    applyEffectStacks(state, content, 'player', 'dizzy', 5, () => {}) // dizzy max_stacks: 1
    expect(state.player.effects.find((e) => e.effectId === 'dizzy')?.stacks).toBe(1)
  })

  it('venom ticks $stacks damage at owner turn_end, decays by 1, and expires at 0', () => {
    const content = makeFixtureContent()
    const state = makeState()
    const rng = createRng(1)
    state.enemy.effects.push({ effectId: 'venom', stacks: 3 })

    runHooks(state, content, 'turn_end', 'enemy', rng, () => {})
    expect(state.enemy.hp).toBe(17) // 20 - 3
    expect(state.enemy.effects.find((e) => e.effectId === 'venom')?.stacks).toBe(2)

    runHooks(state, content, 'turn_end', 'enemy', rng, () => {})
    expect(state.enemy.hp).toBe(15) // 17 - 2
    expect(state.enemy.effects.find((e) => e.effectId === 'venom')?.stacks).toBe(1)

    runHooks(state, content, 'turn_end', 'enemy', rng, () => {})
    expect(state.enemy.hp).toBe(14) // 15 - 1
    expect(state.enemy.effects.find((e) => e.effectId === 'venom')).toBeUndefined()
  })

  it('burn bursts $stacks damage at owner turn_start then clears entirely', () => {
    const content = makeFixtureContent()
    const state = makeState()
    const rng = createRng(1)
    state.player.effects.push({ effectId: 'burn', stacks: 4 })

    runHooks(state, content, 'turn_start', 'player', rng, () => {})
    expect(state.player.hp).toBe(26)
    expect(state.player.effects.find((e) => e.effectId === 'burn')).toBeUndefined()
  })

  it('clinging (owned by enemy, who: opponent) drains player AP at player turn_start', () => {
    const content = makeFixtureContent()
    const state = makeState()
    const rng = createRng(1)
    state.enemy.effects.push({ effectId: 'clinging', stacks: 1 })
    state.player.ap = 2

    runHooks(state, content, 'turn_start', 'player', rng, () => {})
    expect(state.player.ap).toBe(1)

    // clinging should NOT fire on the enemy's own turn_start
    runHooks(state, content, 'turn_start', 'enemy', rng, () => {})
    expect(state.player.ap).toBe(1)
  })

  it('runs player effects before enemy effects in a fixed, deterministic order', () => {
    const orderEffects: EffectDef[] = [
      {
        id: 'order_a',
        name: 'Order A',
        kind: 'neutral',
        hooks: [{ on: 'battle_start', do: [{ op: 'modify_resource', resource: 'ap', delta: 0, target: 'self' }] }],
      },
      {
        id: 'order_b',
        name: 'Order B',
        kind: 'neutral',
        hooks: [{ on: 'battle_start', do: [{ op: 'modify_resource', resource: 'ap', delta: 0, target: 'self' }] }],
      },
      {
        id: 'order_c',
        name: 'Order C',
        kind: 'neutral',
        hooks: [{ on: 'battle_start', do: [{ op: 'modify_resource', resource: 'ap', delta: 0, target: 'self' }] }],
      },
    ]
    const content = makeFixtureContent({ effects: orderEffects })
    const state = makeState()
    state.player.effects.push({ effectId: 'order_a', stacks: 1 }, { effectId: 'order_b', stacks: 1 })
    state.enemy.effects.push({ effectId: 'order_c', stacks: 1 })

    const ticks: string[] = []
    const rng = createRng(1)
    runHooks(state, content, 'battle_start', 'player', rng, (e) => {
      if (e.type === 'effect_tick') ticks.push(e.effectId)
    })

    expect(ticks).toEqual(['order_a', 'order_b', 'order_c'])
  })

  it('dizzy reduces the carrier outgoing damage via add_flat', () => {
    const content = makeFixtureContent()
    const state = makeState()
    state.enemy.effects.push({ effectId: 'dizzy', stacks: 1 })

    applyDamage(state, content, 'enemy', 'player', 'steel', 5, () => {})
    expect(state.player.hp).toBe(27) // 30 - (5 - 2)
  })

  it('auto-applies an enemy gimmick as a battle_start effect', () => {
    const content = makeFixtureContent()
    const result = startBattle({
      playerStats: { hp: 30, apBase: 2, mana: 0, manaMax: 2, handSize: 5, drawPerTurn: 3 },
      deck: ['test_attack'],
      enemyId: 'test_enemy_gimmick',
      content,
      seed: 1,
    })
    expect(result.state.enemy.effects).toEqual([{ effectId: 'clinging', stacks: 1 }])
  })
})
