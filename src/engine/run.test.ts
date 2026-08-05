import { describe, expect, it } from 'vitest'
import {
  applyBattleReward,
  blessingEffects,
  buyCard,
  createRun,
  enterVerse,
  grantBlessing,
  removeCard,
  resolveChest,
  rollVerseOptions,
  upgradeCard,
  type RunState,
} from './run'
import { makeFixtureContent } from './testFixtures'

const content = makeFixtureContent({
  cards: [
    {
      id: 'test_upgradeable',
      type: 'attack',
      name: 'Test Upgradeable',
      cost: { ap: 1, mana: 0 },
      damage: { amount: 5, dtype: 'steel' },
      rarity: 'common',
      upgrades: ['test_upgradeable_plus'],
    },
    {
      id: 'test_upgradeable_plus',
      type: 'attack',
      name: 'Test Upgradeable+',
      cost: { ap: 1, mana: 0 },
      damage: { amount: 8, dtype: 'steel' },
      rarity: 'common',
    },
  ],
})

function baseRun(overrides: Partial<RunState> = {}): RunState {
  return { ...createRun('sinbad', 42), ...overrides }
}

describe('rollVerseOptions', () => {
  it('is deterministic for the same run state', () => {
    const run = baseRun()
    expect(rollVerseOptions(run, content)).toEqual(rollVerseOptions(run, content))
  })

  it('forces the boss verse once pagesInNight is reached', () => {
    const run = baseRun({ page: 22, pagesInNight: 22 })
    const options = rollVerseOptions(run, content)
    expect(options).toHaveLength(1)
    expect(options[0]!.kind).toBe('boss')
  })

  it('excludes crossed-out mustCrossOut verses', () => {
    const run = baseRun()
    enterVerse(run, 'verse_shop', content)
    expect(run.crossedOutVerseIds).toContain('verse_shop')
    for (let page = 0; page < 5; page++) {
      run.page = page
      const options = rollVerseOptions(run, content)
      expect(options.some((v) => v.id === 'verse_shop')).toBe(false)
    }
  })
})

describe('enterVerse', () => {
  it('advances the page for a normal verse', () => {
    const run = baseRun()
    enterVerse(run, 'verse_shop', content)
    expect(run.page).toBe(1)
  })

  it('does not advance the page for a boss verse', () => {
    const run = baseRun({ page: 22 })
    enterVerse(run, 'verse_boss', content)
    expect(run.page).toBe(22)
  })

  it('reshuffle verses bump rerollCount and do not advance the page', () => {
    const run = baseRun()
    const result = enterVerse(run, 'verse_turn_the_page', content)
    expect(result.reshuffled).toBe(true)
    expect(run.page).toBe(0)
    expect(run.rerollCount).toBe(1)
  })

  it('resolves a deterministic enemy from a battle verse enemyPool', () => {
    const run = baseRun()
    const result = enterVerse(run, 'verse_battle_a', content)
    expect(result.enemyId).toBe('test_enemy')
  })
})

describe('battle rewards', () => {
  it('awards flat dinars on a normal kill', () => {
    const run = baseRun()
    const before = run.dinars
    const { dinars } = applyBattleReward(run, 'test_enemy', content)
    expect(run.dinars).toBe(before + dinars)
    expect(run.result).toBeUndefined()
  })

  it('clears the night on a boss kill', () => {
    const run = baseRun()
    applyBattleReward(run, 'test_enemy_lethal', content)
    expect(run.bossDefeated).toBe(true)
    expect(run.result).toBe('night_cleared')
  })

  it('heals a fraction of missing HP on a win, capped at maxHp', () => {
    const run = baseRun({ hp: 10, maxHp: 30 })
    applyBattleReward(run, 'test_enemy', content)
    expect(run.hp).toBe(16)

    const fullRun = baseRun({ hp: 30, maxHp: 30 })
    applyBattleReward(fullRun, 'test_enemy', content)
    expect(fullRun.hp).toBe(30)
  })
})

describe('economy', () => {
  it('buyCard deducts dinars and adds the card to the deck', () => {
    const run = baseRun({ dinars: 100 })
    const before = run.deck.length
    const res = buyCard(run, 'test_attack', content)
    expect(res.ok).toBe(true)
    expect(run.dinars).toBe(60)
    expect(run.deck.length).toBe(before + 1)
  })

  it('buyCard fails without enough dinars', () => {
    const run = baseRun({ dinars: 0 })
    const res = buyCard(run, 'test_attack', content)
    expect(res).toEqual({ ok: false, error: 'insufficient_dinars' })
  })

  it('upgradeCard swaps the card id in the deck', () => {
    const run = baseRun({ dinars: 100, deck: ['test_upgradeable'] })
    const res = upgradeCard(run, 'test_upgradeable', content)
    expect(res.ok).toBe(true)
    expect(run.deck).toEqual(['test_upgradeable_plus'])
    expect(run.dinars).toBe(50)
  })

  it('upgradeCard fails when the card has no upgrade target', () => {
    const run = baseRun({ dinars: 100, deck: ['test_attack'] })
    const res = upgradeCard(run, 'test_attack', content)
    expect(res).toEqual({ ok: false, error: 'no_upgrade' })
  })

  it('removeCard removes one instance from the deck', () => {
    const run = baseRun({ dinars: 100, deck: ['test_attack', 'test_attack'] })
    const res = removeCard(run, 'test_attack')
    expect(res.ok).toBe(true)
    expect(run.deck).toEqual(['test_attack'])
    expect(run.dinars).toBe(40)
  })

  it('grantBlessing adds once and rejects duplicates', () => {
    const run = baseRun()
    expect(grantBlessing(run, 'test_blessing_armor', content)).toEqual({ ok: true })
    expect(run.blessings).toEqual(['test_blessing_armor'])
    expect(grantBlessing(run, 'test_blessing_armor', content)).toEqual({ ok: false, error: 'already_held' })
  })

  it('resolveChest grants flat dinars', () => {
    const run = baseRun()
    const before = run.dinars
    const { dinars } = resolveChest(run)
    expect(run.dinars).toBe(before + dinars)
  })
})

describe('blessingEffects', () => {
  it('maps owned blessings to effect instances', () => {
    const run = baseRun({ blessings: ['test_blessing_armor'] })
    expect(blessingEffects(run, content)).toEqual([{ effectId: 'armor', stacks: 5 }])
  })
})
