import { describe, expect, it } from 'vitest'
import { checkCounters, setCounter } from './counters'
import { createRng } from './rng'
import type { BattleState } from './types'
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
      hand: [{ uid: 1, cardId: 'test_counter' }],
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
      enemyId: 'test_enemy',
      deckCursor: 0,
    },
    rngState: 1,
    nextUid: 2,
  }
}

describe('counters', () => {
  it('sets a counter face-down, paying its cost and removing it from hand', () => {
    const content = makeFixtureContent()
    const state = makeState()
    state.player.ap = 1
    const res = setCounter(state, content, 1, () => {})
    expect(res).toEqual({ ok: true })
    expect(state.player.hand).toHaveLength(0)
    expect(state.player.counters).toHaveLength(1)
    expect(state.player.ap).toBe(0)
  })

  it('triggers on a matching attack action but not on a spell', () => {
    const content = makeFixtureContent()
    const state = makeState()
    state.player.counters.push({ uid: 1, cardId: 'test_counter' })

    const spellCard = content.cards.get('enemy_spell')!
    const negatedSpell = checkCounters(state, content, spellCard, createRng(1), () => {})
    expect(negatedSpell).toBe(false)
    expect(state.player.counters).toHaveLength(1) // untouched

    const attackCard = content.cards.get('enemy_attack')!
    const negatedAttack = checkCounters(state, content, attackCard, createRng(1), () => {})
    expect(negatedAttack).toBe(true)
    expect(state.player.counters).toHaveLength(0)
  })

  it('matches by dtype when the counter declares one', () => {
    const content = makeFixtureContent()
    const state = makeState()
    state.player.counters.push({ uid: 1, cardId: 'test_counter_dtype' })

    const steelAttack = content.cards.get('enemy_attack')!
    expect(checkCounters(state, content, steelAttack, createRng(1), () => {})).toBe(false)
    expect(state.player.counters).toHaveLength(1)

    const fireAttack = content.cards.get('enemy_ifrit_attack')!
    expect(checkCounters(state, content, fireAttack, createRng(1), () => {})).toBe(true)
    expect(state.player.counters).toHaveLength(0)
  })

  it('negate cancels the triggering action (checked by the caller)', () => {
    const content = makeFixtureContent()
    const state = makeState()
    state.player.counters.push({ uid: 1, cardId: 'test_counter' })

    const attackCard = content.cards.get('enemy_attack')!
    const negated = checkCounters(state, content, attackCard, createRng(1), () => {})
    expect(negated).toBe(true)
    // The counter's own riposte damage still lands on the enemy...
    expect(state.enemy.hp).toBe(17)
    // ...but a caller that respects `negated` would skip the attack's own damage,
    // which is exactly what battle.ts's resolveEnemyTurn does.
  })

  it('is consumed once and checked in first-set-first-checked order', () => {
    const content = makeFixtureContent()
    const state = makeState()
    state.player.counters.push({ uid: 1, cardId: 'test_counter' }, { uid: 2, cardId: 'test_counter' })

    const attackCard = content.cards.get('enemy_attack')!
    checkCounters(state, content, attackCard, createRng(1), () => {})
    expect(state.player.counters).toHaveLength(1)
    expect(state.player.counters[0]!.uid).toBe(2)
  })

  it('persists across turns until a matching action triggers it', () => {
    const content = makeFixtureContent()
    const state = makeState()
    state.player.counters.push({ uid: 1, cardId: 'test_counter' })

    const spellCard = content.cards.get('enemy_spell')!
    checkCounters(state, content, spellCard, createRng(1), () => {})
    checkCounters(state, content, spellCard, createRng(1), () => {})
    expect(state.player.counters).toHaveLength(1) // still set after two non-matching checks

    const attackCard = content.cards.get('enemy_attack')!
    checkCounters(state, content, attackCard, createRng(1), () => {})
    expect(state.player.counters).toHaveLength(0)
  })
})
