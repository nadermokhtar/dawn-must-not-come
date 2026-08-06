import { describe, expect, it } from 'vitest'
import { startBattle, playCard, endTurn, discardDownToHandSize } from './battle'
import { drawCards } from './deck'
import { createRng } from './rng'
import type { BattleState } from './types'
import { makeFixtureContent } from './testFixtures'

function makeState(overrides: Partial<BattleState> = {}): BattleState {
  return {
    turn: 1,
    phase: 'player',
    player: {
      hp: 1000,
      maxHp: 1000,
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
    ...overrides,
  }
}

describe('battle', () => {
  it('starts a battle by drawing drawPerTurn cards with AP at base', () => {
    const content = makeFixtureContent()
    const deck = Array.from({ length: 12 }, () => 'test_attack')
    const result = startBattle({
      playerStats: { hp: 30, apBase: 2, mana: 0, manaMax: 2, handSize: 5, drawPerTurn: 3 },
      deck,
      enemyId: 'test_enemy',
      content,
      seed: 1,
    })
    expect(result.state.player.hand).toHaveLength(3)
    expect(result.state.player.ap).toBe(2)
  })

  it('spends AP on play and rejects insufficient AP', () => {
    const content = makeFixtureContent()
    const state = makeState()
    state.player.ap = 2
    state.player.hand = [
      { uid: 1, cardId: 'test_attack_costly' }, // costs 2 AP
      { uid: 2, cardId: 'test_attack' }, // costs 1 AP
    ]

    const res1 = playCard(state, content, 1)
    expect('events' in res1).toBe(true)
    expect(state.player.ap).toBe(0)

    const res2 = playCard(state, content, 2)
    expect(res2).toEqual({ error: 'insufficient_ap' })
  })

  it('refreshes AP to base at the start of the next player turn', () => {
    const content = makeFixtureContent()
    const state = makeState()
    state.player.ap = 0
    state.player.apBase = 2

    endTurn(state, content)
    expect(state.player.ap).toBe(2)
  })

  it('persists mana across turns and gates spending on it', () => {
    const content = makeFixtureContent()
    const state = makeState()
    state.player.mana = 1
    state.player.manaMax = 2
    state.player.hand = [{ uid: 1, cardId: 'test_spell_mana' }] // costs 1 mana

    playCard(state, content, 1)
    expect(state.player.mana).toBe(0)

    endTurn(state, content) // AP refreshes, mana should NOT refresh
    expect(state.player.mana).toBe(0)

    state.player.hand = [{ uid: 2, cardId: 'test_spell_mana' }]
    const res = playCard(state, content, 2)
    expect(res).toEqual({ error: 'insufficient_mana' })
  })

  it('discards down to hand size at end of turn, oldest drawn first', () => {
    const state = makeState()
    state.player.handSize = 3
    state.player.hand = [
      { uid: 1, cardId: 'test_attack' },
      { uid: 2, cardId: 'test_attack' },
      { uid: 3, cardId: 'test_attack' },
      { uid: 4, cardId: 'test_attack' },
      { uid: 5, cardId: 'test_attack' },
    ]

    // Tested directly (not via the full endTurn()) so the very next turn's
    // flat drawBase draw — which now always fires, independent of hand size
    // — can't reshuffle these discards back into the draw pile before the
    // assertion runs.
    discardDownToHandSize(state, () => {})

    expect(state.player.discard.map((c) => c.uid)).toEqual([1, 2])
    expect(state.player.hand.map((c) => c.uid)).toEqual([3, 4, 5])
  })

  it('burns draws that would exceed the hard hand cap of 10', () => {
    const state = makeState()
    state.player.hand = Array.from({ length: 10 }, (_, i) => ({ uid: i + 1, cardId: 'test_attack' }))
    state.player.drawPile = [
      { uid: 101, cardId: 'test_attack' },
      { uid: 102, cardId: 'test_attack' },
    ]

    const events: unknown[] = []
    drawCards(state, 2, createRng(1), (e) => events.push(e))

    expect(state.player.hand).toHaveLength(10)
    expect(events.filter((e: any) => e.type === 'hand_overflow')).toHaveLength(2)
  })

  it('freezes state on win and rejects further actions', () => {
    const content = makeFixtureContent()
    const state = makeState()
    state.enemy.hp = 5
    state.player.hand = [{ uid: 1, cardId: 'test_attack' }] // deals 5

    const res = playCard(state, content, 1)
    expect('events' in res).toBe(true)
    expect(state.phase).toBe('over')
    expect(state.result).toBe('win')

    state.player.hand = [{ uid: 2, cardId: 'test_attack' }]
    const res2 = playCard(state, content, 2)
    expect(res2).toEqual({ error: 'battle_over' })
  })

  it('detects loss when the player is reduced to 0 hp', () => {
    const content = makeFixtureContent()
    const state = makeState()
    state.player.hp = 4
    state.enemy.hp = 1000
    state.enemy.enemyId = 'test_enemy_lethal' // deck: enemy_attack2, deals 6

    endTurn(state, content)

    expect(state.phase).toBe('over')
    expect(state.result).toBe('loss')
  })

  it('reshuffles the discard pile into the draw pile deterministically when empty', () => {
    const build = (): BattleState => {
      const s = makeState()
      s.player.drawPile = []
      s.player.discard = [
        { uid: 1, cardId: 'test_attack' },
        { uid: 2, cardId: 'test_attack' },
        { uid: 3, cardId: 'test_attack' },
      ]
      return s
    }

    const stateA = build()
    const eventsA: unknown[] = []
    drawCards(stateA, 1, createRng(42), (e) => eventsA.push(e))

    const stateB = build()
    const eventsB: unknown[] = []
    drawCards(stateB, 1, createRng(42), (e) => eventsB.push(e))

    expect(stateA.player.hand).toEqual(stateB.player.hand)
    expect(stateA.player.drawPile).toEqual(stateB.player.drawPile)
    expect(eventsA.some((e: any) => e.type === 'shuffle')).toBe(true)
  })
})
