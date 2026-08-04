import { describe, expect, it } from 'vitest'
import { drawCards, pileCounts } from './deck'
import { startBattle, playCard, endTurn } from './battle'
import { createRng } from './rng'
import type { BattleState } from './types'
import { makeFixtureContent } from './testFixtures'
import progression from '../../data/progression.json'

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
      exhaust: [{ uid: 1, cardId: 'test_attack' }, { uid: 2, cardId: 'test_attack' }],
      counters: [],
      handSize: 5,
    },
    enemy: {
      hp: 1000,
      maxHp: 1000,
      ap: 0,
      apBase: 0,
      mana: 0,
      manaMax: 0,
      effects: [],
      enemyId: 'test_enemy',
      deckCursor: 0,
    },
    rngState: 1,
    nextUid: 100,
  }
}

describe('exhaust pile', () => {
  it('is never touched by a reshuffle, even when the discard pile is shuffled into the draw pile', () => {
    const state = makeState()
    state.player.drawPile = []
    state.player.discard = [
      { uid: 10, cardId: 'test_attack' },
      { uid: 11, cardId: 'test_attack' },
    ]

    drawCards(state, 1, createRng(5), () => {})

    expect(state.player.exhaust.map((c) => c.uid)).toEqual([1, 2])
    // the reshuffled draw pile must only contain what came from discard
    const drawnAndRemaining = [...state.player.hand, ...state.player.drawPile].map((c) => c.uid)
    expect(drawnAndRemaining.sort()).toEqual([10, 11])
  })
})

describe('starter deck composition', () => {
  it('matches the documented 4/2/2/1/1 Sinbad starting deck', () => {
    const deck: string[] = progression.classes.sinbad.starting_deck
    expect(deck).toHaveLength(10)

    const counts: Record<string, number> = {}
    for (const id of deck) counts[id] = (counts[id] ?? 0) + 1

    expect(counts).toEqual({
      sinbad_cutlass_strike: 4,
      sinbad_raise_shield: 2,
      sinbad_rigging_grab: 2,
      sinbad_captains_rally: 1,
      sinbad_boarding_action: 1,
    })
  })
})

describe('pile-count conservation', () => {
  it('keeps draw+hand+discard+exhaust+counters equal to the deck size at every step', () => {
    const content = makeFixtureContent()
    const deck = [
      'test_attack',
      'test_attack',
      'test_attack_costly',
      'test_draw',
      'test_counter',
      'test_apply_armor',
      'test_attack',
      'test_attack',
      'test_spell_mana',
      'test_attack',
    ]
    const result = startBattle({
      playerStats: { hp: 100, apBase: 3, mana: 2, manaMax: 2, handSize: 5 },
      deck,
      enemyId: 'test_enemy_lowhp', // won't actually die; hp bumped below
      content,
      seed: 3,
    })
    const state = result.state
    state.enemy.hp = 1000
    state.enemy.maxHp = 1000

    expect(pileCounts(state).total).toBe(deck.length)

    for (let i = 0; i < 4 && state.phase === 'player'; i++) {
      const card = state.player.hand[0]
      if (card) playCard(state, content, card.uid)
      expect(pileCounts(state).total).toBe(deck.length)
      endTurn(state, content)
      expect(pileCounts(state).total).toBe(deck.length)
    }
  })
})
