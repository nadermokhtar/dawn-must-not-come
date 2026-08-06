import { describe, expect, it } from 'vitest'
import {
  applyBattleReward,
  blessingEffects,
  buyCard,
  createRun,
  depositBank,
  enterVerse,
  forkForEnemy,
  grantBlessing,
  grantXp,
  removeCard,
  resolveChest,
  resolveSealedJar,
  resolveStoryFork,
  rollVerseOptions,
  sampleClassCards,
  upgradeCard,
  withdrawBank,
  type RunState,
} from './run'
import { makeFixtureContent } from './testFixtures'

const content = makeFixtureContent({
  cards: [
    {
      id: 'test_upgradeable',
      type: 'attack',
      class: 'sinbad',
      name: 'Test Upgradeable',
      cost: { ap: 1, mana: 0 },
      cost_type: 'ap',
      damage: { amount: 5, dtype: 'steel' },
      rarity: 'common',
      upgrades: ['test_upgradeable_plus'],
    },
    {
      id: 'test_upgradeable_plus',
      type: 'attack',
      class: 'sinbad',
      name: 'Test Upgradeable+',
      cost: { ap: 1, mana: 0 },
      cost_type: 'ap',
      damage: { amount: 8, dtype: 'steel' },
      rarity: 'common',
    },
    { id: 'test_curse', type: 'affliction', class: 'sinbad', name: 'Test Curse', cost: { ap: 0, mana: 0 }, cost_type: 'ap' },
    // No `class` — mirrors a real enemy move card. Must never appear in a
    // player-facing sample (this is exactly the bug the strict class filter
    // in sampleClassCards fixes: a live playthrough surfaced enemy moves
    // leaking into level-up card rewards before this was tightened).
    { id: 'test_enemy_move', type: 'attack', name: 'Test Enemy Move', cost: { ap: 0, mana: 0 }, cost_type: 'ap', damage: { amount: 3, dtype: 'steel' } },
  ],
  enemies: [
    { id: 'test_enemy_lvl1', name: 'Level 1 Foe', level: 1, hp: 10, resist: [], weak: [], deck: ['enemy_attack'], ai: { mode: 'sequential' } },
    { id: 'test_enemy_lvl3', name: 'Level 3 Foe', level: 3, hp: 10, resist: [], weak: [], deck: ['enemy_attack'], ai: { mode: 'sequential' } },
    {
      id: 'test_enemy_forked',
      name: 'Forked Foe',
      hp: 10,
      resist: [],
      weak: [],
      deck: ['enemy_attack'],
      ai: { mode: 'sequential' },
      story_fork_id: 'test_fork',
    },
    { id: 'test_enemy_lethal_n2', name: 'Night 2 Boss', tier: 'boss', hp: 10, resist: [], weak: [], deck: ['enemy_attack'], ai: { mode: 'sequential' } },
  ],
  verses: [
    {
      id: 'verse_battle_lvl1',
      kind: 'battle',
      night: [1],
      name: 'Level 1 Battle',
      narration: 'A weaker foe.',
      weight: 3,
      enemyPool: ['test_enemy_lvl1'],
    },
    {
      id: 'verse_battle_lvl3',
      kind: 'battle',
      night: [1],
      name: 'Level 3 Battle',
      narration: 'A stronger foe.',
      weight: 3,
      enemyPool: ['test_enemy_lvl3'],
    },
    {
      id: 'verse_night2_stub',
      kind: 'event',
      night: [2],
      name: 'Night 2 Stub',
      narration: 'Night 2 exists.',
      weight: 1,
    },
  ],
  storyForks: [
    {
      id: 'test_fork',
      narration: 'A choice is offered.',
      options: [
        { id: 'wonder_choice', label: 'Choose wonder', wonderDelta: 5 },
        { id: 'mercy_choice', label: 'Choose mercy', mercyDelta: 5, dinarsDelta: 10 },
      ],
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

  it('advances to the next night on a boss kill when further night content exists', () => {
    const run = baseRun()
    const { nightAdvanced } = applyBattleReward(run, 'test_enemy_lethal', content)
    expect(nightAdvanced).toBe(true)
    expect(run.night).toBe(2)
    expect(run.page).toBe(0)
    expect(run.crossedOutVerseIds).toEqual([])
    expect(run.bossDefeated).toBe(false)
    expect(run.result).toBeUndefined()
  })

  it('ends the run on a boss kill when no further night content exists', () => {
    const run = baseRun({ night: 2 })
    const { nightAdvanced } = applyBattleReward(run, 'test_enemy_lethal_n2', content)
    expect(nightAdvanced).toBe(false)
    expect(run.bossDefeated).toBe(true)
    expect(run.result).toBe('night_cleared')
  })

  it('heals a fraction of missing HP on a win, capped at maxHp', () => {
    const run = baseRun({ hp: 10, maxHp: 30 })
    applyBattleReward(run, 'test_enemy', content)
    expect(run.hp).toBe(15)

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

describe('grantXp / leveling', () => {
  it('levels up roughly every 2 kills, growing maxHp and healing', () => {
    const run = baseRun({ hp: 30, maxHp: 30 })
    expect(grantXp(run, 10)).toEqual({ levelsGained: 0 })
    expect(run.level).toBe(1)

    expect(grantXp(run, 10)).toEqual({ levelsGained: 1 })
    expect(run.level).toBe(2)
    expect(run.maxHp).toBe(33)
    expect(run.hp).toBe(33)
  })

  it('applyBattleReward grants XP toward leveling', () => {
    const run = baseRun({ xp: 10 })
    const { levelsGained } = applyBattleReward(run, 'test_enemy', content)
    expect(levelsGained).toBe(1)
    expect(run.level).toBe(2)
  })

  it('does not level past MAX_LEVEL', () => {
    const run = baseRun({ level: 20, xp: 0 })
    grantXp(run, 1000)
    expect(run.level).toBe(20)
  })
})

describe('level-gated battle verses', () => {
  it('only offers battles within [level, level + 1]', () => {
    const lowLevelRun = baseRun({ level: 1 })
    let sawEligible = false
    for (let page = 0; page < 10; page++) {
      lowLevelRun.page = page
      const options = rollVerseOptions(lowLevelRun, content)
      if (options.some((v) => v.id === 'verse_battle_lvl1')) sawEligible = true
      expect(options.some((v) => v.id === 'verse_battle_lvl3')).toBe(false)
    }
    expect(sawEligible).toBe(true)

    const higherLevelRun = baseRun({ level: 3 })
    sawEligible = false
    for (let page = 0; page < 10; page++) {
      higherLevelRun.page = page
      const options = rollVerseOptions(higherLevelRun, content)
      if (options.some((v) => v.id === 'verse_battle_lvl3')) sawEligible = true
      expect(options.some((v) => v.id === 'verse_battle_lvl1')).toBe(false)
    }
    expect(sawEligible).toBe(true)
  })
})

describe('story forks', () => {
  it('forkForEnemy finds a fork tied to the enemy and hides it once resolved', () => {
    const run = baseRun()
    const found = forkForEnemy(run, 'test_enemy_forked', content)
    expect(found?.forkId).toBe('test_fork')

    run.resolvedForks.push('test_fork')
    expect(forkForEnemy(run, 'test_enemy_forked', content)).toBeUndefined()
  })

  it('forkForEnemy returns undefined for enemies with no story_fork_id', () => {
    const run = baseRun()
    expect(forkForEnemy(run, 'test_enemy', content)).toBeUndefined()
  })

  it('resolveStoryFork applies the chosen option deltas and records it', () => {
    // mercy 0 -> 5 crosses the mercy-4 threshold, so dinars gets the option's
    // own +10 plus the one-time +20 threshold bonus (covered separately below).
    const run = baseRun({ wonder: 0, mercy: 0, dinars: 0 })
    resolveStoryFork(run, 'test_fork', 'mercy_choice', content)
    expect(run.mercy).toBe(5)
    expect(run.dinars).toBe(30)
    expect(run.wonder).toBe(0)
    expect(run.resolvedForks).toEqual(['test_fork'])
  })

  it('clamps wonder/mercy/dinars/hp at 0 and hp at maxHp', () => {
    const run = baseRun({ mercy: 0, dinars: 0 })
    resolveStoryFork(run, 'test_fork', 'wonder_choice', content)
    expect(run.wonder).toBeGreaterThanOrEqual(0)
  })
})

describe('Wonder/Mercy thresholds', () => {
  it('grants +maxHp once when wonder crosses a threshold', () => {
    const run = baseRun({ wonder: 3, maxHp: 30, hp: 30 })
    resolveStoryFork(run, 'test_fork', 'wonder_choice', content) // wonder: 3 -> 8, crosses both 4 and 8
    expect(run.wonder).toBe(8)
    expect(run.maxHp).toBe(40) // +5 for threshold 4, +5 for threshold 8
    expect(run.flags['wonder_threshold_4']).toBe('granted')
    expect(run.flags['wonder_threshold_8']).toBe('granted')

    const before = run.maxHp
    run.wonder = 3 // simulate dropping back below, then re-crossing
    resolveStoryFork(run, 'test_fork', 'wonder_choice', content)
    expect(run.maxHp).toBe(before) // already granted, no double-dip
  })

  it('grants +dinars once when mercy crosses its threshold', () => {
    const run = baseRun({ mercy: 0, dinars: 0 })
    resolveStoryFork(run, 'test_fork', 'mercy_choice', content) // mercy 0 -> 5, crosses 4
    expect(run.dinars).toBe(30) // 10 from the option + 20 threshold bonus
    expect(run.flags['mercy_threshold_4']).toBe('granted')
  })
})

describe('sampleClassCards', () => {
  it('is deterministic and excludes afflictions, _plus variants, and class-less (enemy-only) cards', () => {
    const run = baseRun()
    const pool = sampleClassCards(run, content, 100, 'test')
    const a = sampleClassCards(run, content, 3, 'test')
    const b = sampleClassCards(run, content, 3, 'test')
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id))
    expect(pool.some((c) => c.type === 'affliction')).toBe(false)
    expect(pool.some((c) => c.id.endsWith('_plus'))).toBe(false)
    expect(pool.some((c) => c.id === 'test_enemy_move')).toBe(false)
    expect(pool.every((c) => c.class === run.classId)).toBe(true)
  })
})

describe('bank', () => {
  it('deposits and withdraws with interest', () => {
    const run = baseRun({ dinars: 50, bankedDinars: 0 })
    expect(depositBank(run, 50)).toEqual({ ok: true })
    expect(run.dinars).toBe(0)
    expect(run.bankedDinars).toBe(50)

    const { dinars } = withdrawBank(run)
    expect(dinars).toBe(60) // 50 + 20% interest
    expect(run.dinars).toBe(60)
    expect(run.bankedDinars).toBe(0)
  })

  it('deposit fails without enough dinars', () => {
    const run = baseRun({ dinars: 10 })
    expect(depositBank(run, 50)).toEqual({ ok: false, error: 'insufficient_dinars' })
  })
})

describe('resolveSealedJar', () => {
  it('always grants exactly one of a blessing or a curse card', () => {
    const run = baseRun()
    const outcome = resolveSealedJar(run, content)
    const isBlessing = 'blessingId' in outcome
    const isCurse = 'curseCardId' in outcome
    expect(isBlessing !== isCurse).toBe(true)
    if (isBlessing) expect(run.blessings).toContain(outcome.blessingId)
  })
})
