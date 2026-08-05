import type { BlessingDef, CardDef, Content, EffectDef, EnemyDef, StoryForkDef, VerseDef } from './types'

export function makeContent(overrides: {
  cards?: CardDef[]
  enemies?: EnemyDef[]
  effects?: EffectDef[]
  verses?: VerseDef[]
  blessings?: BlessingDef[]
  storyForks?: StoryForkDef[]
}): Content {
  const cards = new Map<string, CardDef>()
  const enemies = new Map<string, EnemyDef>()
  const effects = new Map<string, EffectDef>()
  const verses = new Map<string, VerseDef>()
  const blessings = new Map<string, BlessingDef>()
  const storyForks = new Map<string, StoryForkDef>()
  for (const c of overrides.cards ?? []) cards.set(c.id, c)
  for (const e of overrides.enemies ?? []) enemies.set(e.id, e)
  for (const e of overrides.effects ?? []) effects.set(e.id, e)
  for (const v of overrides.verses ?? []) verses.set(v.id, v)
  for (const b of overrides.blessings ?? []) blessings.set(b.id, b)
  for (const f of overrides.storyForks ?? []) storyForks.set(f.id, f)
  return { cards, enemies, effects, verses, blessings, storyForks }
}

export const FIXTURE_EFFECTS: EffectDef[] = [
  {
    id: 'armor',
    name: 'Armor',
    kind: 'buff',
    max_stacks: 99,
    remove_at_zero: true,
    modifiers: [{ pipeline: 'incoming_damage', op: 'absorb_stacks', ignore_dtypes: ['true_strike'] }],
  },
  {
    id: 'venom',
    name: 'Serpent Venom',
    kind: 'debuff',
    max_stacks: 99,
    remove_at_zero: true,
    hooks: [
      {
        on: 'turn_end',
        who: 'owner',
        do: [
          { op: 'deal_damage', amount: '$stacks', dtype: 'serpent_venom', to: 'self' },
          { op: 'change_stacks', delta: -1 },
        ],
      },
    ],
  },
  {
    id: 'burn',
    name: 'Ifrit Flame',
    kind: 'debuff',
    max_stacks: 99,
    remove_at_zero: true,
    hooks: [
      {
        on: 'turn_start',
        who: 'owner',
        do: [
          { op: 'deal_damage', amount: '$stacks', dtype: 'ifrit_flame', to: 'self' },
          { op: 'remove_effect', id: 'burn', target: 'self' },
        ],
      },
    ],
  },
  {
    id: 'clinging',
    name: 'Clinging',
    kind: 'debuff',
    permanent: true,
    hooks: [
      {
        on: 'turn_start',
        who: 'opponent',
        do: [{ op: 'modify_resource', resource: 'ap', delta: -1, target: 'opponent' }],
      },
    ],
  },
  {
    id: 'dizzy',
    name: 'Dizzy',
    kind: 'debuff',
    max_stacks: 1,
    remove_at_zero: true,
    modifiers: [{ pipeline: 'outgoing_damage', op: 'add_flat', value: -2 }],
  },
]

export const FIXTURE_CARDS: CardDef[] = [
  {
    id: 'test_attack',
    name: 'Test Strike',
    type: 'attack',
    cost: { ap: 1, mana: 0 },
    cost_type: 'ap',
    damage: { amount: 5, dtype: 'steel' },
  },
  {
    id: 'test_attack_costly',
    name: 'Test Heavy Strike',
    type: 'attack',
    cost: { ap: 2, mana: 0 },
    cost_type: 'ap',
    damage: { amount: 8, dtype: 'steel' },
  },
  {
    id: 'test_spell_mana',
    name: 'Test Rally',
    type: 'spell',
    cost: { ap: 0, mana: 1 },
    cost_type: 'mana',
    effects: [{ op: 'modify_resource', resource: 'ap', delta: 2, target: 'self' }],
  },
  {
    id: 'test_draw',
    name: 'Test Draw',
    type: 'spell',
    cost: { ap: 0, mana: 0 },
    cost_type: 'ap',
    draw: 2,
  },
  {
    id: 'test_apply_armor',
    name: 'Test Armor',
    type: 'spell',
    cost: { ap: 1, mana: 0 },
    cost_type: 'ap',
    effects: [{ apply: 'armor', stacks: 5, target: 'self' }],
  },
  {
    id: 'test_counter',
    name: 'Test Counter',
    type: 'counter',
    cost: { ap: 1, mana: 0 },
    cost_type: 'ap',
    counter: {
      match: { action_type: 'attack' },
      negate: true,
      effects: [{ op: 'deal_damage', amount: 3, dtype: 'steel', to: 'opponent' }],
    },
  },
  {
    id: 'test_counter_dtype',
    name: 'Test Fire Ward',
    type: 'counter',
    cost: { ap: 0, mana: 0 },
    cost_type: 'ap',
    counter: {
      match: { dtype: 'ifrit_flame' },
      negate: true,
      effects: [],
    },
  },
  {
    id: 'enemy_attack',
    name: 'Claw',
    type: 'attack',
    cost: { ap: 0, mana: 0 },
    cost_type: 'ap',
    damage: { amount: 4, dtype: 'steel' },
  },
  {
    id: 'enemy_attack2',
    name: 'Bite',
    type: 'attack',
    cost: { ap: 0, mana: 0 },
    cost_type: 'ap',
    damage: { amount: 6, dtype: 'steel' },
  },
  {
    id: 'enemy_spell',
    name: 'Screech',
    type: 'spell',
    cost: { ap: 0, mana: 0 },
    cost_type: 'ap',
  },
  {
    id: 'enemy_ifrit_attack',
    name: 'Cinder Spit',
    type: 'attack',
    cost: { ap: 0, mana: 0 },
    cost_type: 'ap',
    damage: { amount: 5, dtype: 'ifrit_flame' },
  },
]

export const FIXTURE_ENEMIES: EnemyDef[] = [
  {
    id: 'test_enemy',
    name: 'Test Enemy',
    hp: 20,
    resist: [],
    weak: [],
    deck: ['enemy_attack', 'enemy_attack2'],
    ai: { mode: 'sequential' },
  },
  {
    id: 'test_enemy_random',
    name: 'Test Random Enemy',
    hp: 20,
    resist: [],
    weak: [],
    deck: ['enemy_attack', 'enemy_attack2'],
    ai: { mode: 'random', weights: [1, 3] },
  },
  {
    id: 'test_enemy_first_move',
    name: 'Test Ambusher',
    hp: 20,
    resist: [],
    weak: [],
    deck: ['enemy_attack'],
    ai: { mode: 'sequential' },
    first_move: true,
  },
  {
    id: 'test_enemy_resist',
    name: 'Test Resistant Enemy',
    hp: 20,
    resist: ['steel'],
    weak: ['ifrit_flame'],
    deck: ['enemy_attack'],
    ai: { mode: 'sequential' },
  },
  {
    id: 'test_enemy_gimmick',
    name: 'Test Clinger',
    hp: 20,
    resist: [],
    weak: [],
    deck: ['enemy_attack'],
    ai: { mode: 'sequential' },
    gimmick: 'clinging',
  },
  {
    id: 'test_enemy_lowhp',
    name: 'Test Weakling',
    hp: 1,
    resist: [],
    weak: [],
    deck: ['enemy_attack'],
    ai: { mode: 'sequential' },
  },
  {
    id: 'test_enemy_lethal',
    name: 'Test Brute',
    tier: 'boss',
    hp: 100,
    resist: [],
    weak: [],
    deck: ['enemy_attack2'],
    ai: { mode: 'sequential' },
  },
]

export const FIXTURE_VERSES: VerseDef[] = [
  {
    id: 'verse_battle_a',
    kind: 'battle',
    night: [1],
    name: 'Test Battle A',
    narration: 'A foe blocks the way.',
    weight: 3,
    enemyPool: ['test_enemy'],
  },
  {
    id: 'verse_battle_b',
    kind: 'battle',
    night: [1],
    name: 'Test Battle B',
    narration: 'Another foe blocks the way.',
    weight: 3,
    enemyPool: ['test_enemy_resist'],
  },
  {
    id: 'verse_shop',
    kind: 'shop',
    night: [1],
    name: 'Test Bazaar',
    narration: 'Wares are for sale.',
    weight: 1,
    mustCrossOut: true,
  },
  {
    id: 'verse_turn_the_page',
    kind: 'event',
    night: [1],
    name: 'Turn the Page',
    narration: 'The page turns to reveal a new scene.',
    weight: 1,
    reshuffle: true,
  },
  {
    id: 'verse_boss',
    kind: 'boss',
    night: [1],
    name: 'Test Boss',
    narration: 'The boss awaits.',
    enemyPool: ['test_enemy_lethal'],
  },
]

export const FIXTURE_BLESSINGS: BlessingDef[] = [
  { id: 'test_blessing_armor', name: 'Test Ward', narration: 'A ward is granted.', effectId: 'armor', stacks: 5 },
]

export function makeFixtureContent(
  extra: {
    cards?: CardDef[]
    enemies?: EnemyDef[]
    effects?: EffectDef[]
    verses?: VerseDef[]
    blessings?: BlessingDef[]
    storyForks?: StoryForkDef[]
  } = {},
): Content {
  return makeContent({
    cards: [...FIXTURE_CARDS, ...(extra.cards ?? [])],
    enemies: [...FIXTURE_ENEMIES, ...(extra.enemies ?? [])],
    effects: [...FIXTURE_EFFECTS, ...(extra.effects ?? [])],
    verses: [...FIXTURE_VERSES, ...(extra.verses ?? [])],
    blessings: [...FIXTURE_BLESSINGS, ...(extra.blessings ?? [])],
    storyForks: [...(extra.storyForks ?? [])],
  })
}
