import type { BlessingDef, CardDef, EffectDef, EnemyDef, StoryForkDef, VerseDef } from '../engine/types'

export class ValidationError extends Error {}

const CARD_TYPES = ['attack', 'spell', 'counter', 'equipment', 'affliction', 'item']
const COST_TYPES = ['ap', 'mana', 'mixed']
const DTYPES = ['steel', 'true_strike', 'ifrit_flame', 'tide', 'storm', 'serpent_venom']
const EFFECT_KINDS = ['buff', 'debuff', 'neutral']
const VERSE_KINDS = ['battle', 'shop', 'upgrade', 'remove', 'blessing', 'chest', 'event', 'bank', 'boss']

function assert(cond: unknown, ctx: string, msg: string): asserts cond {
  if (!cond) throw new ValidationError(`${ctx}: ${msg}`)
}

export function validateCard(raw: unknown, ctx: string): CardDef {
  assert(typeof raw === 'object' && raw !== null, ctx, 'expected an object')
  const r = raw as Record<string, unknown>
  assert(typeof r.id === 'string' && r.id.length > 0, ctx, 'id must be a non-empty string')
  ctx = `${ctx} (${r.id})`
  assert(typeof r.name === 'string', ctx, 'name must be a string')
  assert(typeof r.type === 'string' && CARD_TYPES.includes(r.type), ctx, `type must be one of ${CARD_TYPES.join('|')}`)
  assert(typeof r.cost === 'object' && r.cost !== null, ctx, 'cost must be an object')
  const cost = r.cost as Record<string, unknown>
  assert(typeof cost.ap === 'number', ctx, 'cost.ap must be a number')
  assert(typeof cost.mana === 'number', ctx, 'cost.mana must be a number')
  assert(
    typeof r.cost_type === 'string' && COST_TYPES.includes(r.cost_type),
    ctx,
    `cost_type must be one of ${COST_TYPES.join('|')}`,
  )

  if (r.damage !== undefined) {
    assert(typeof r.damage === 'object' && r.damage !== null, ctx, 'damage must be an object')
    const dmg = r.damage as Record<string, unknown>
    assert(typeof dmg.amount === 'number', ctx, 'damage.amount must be a number')
    assert(
      typeof dmg.dtype === 'string' && DTYPES.includes(dmg.dtype),
      ctx,
      `damage.dtype must be one of ${DTYPES.join('|')}`,
    )
  }
  if (r.effects !== undefined) assert(Array.isArray(r.effects), ctx, 'effects must be an array')
  if (r.tags !== undefined) assert(Array.isArray(r.tags), ctx, 'tags must be an array')
  if (r.counter !== undefined) {
    assert(typeof r.counter === 'object' && r.counter !== null, ctx, 'counter must be an object')
    const counter = r.counter as Record<string, unknown>
    assert(typeof counter.match === 'object' && counter.match !== null, ctx, 'counter.match must be an object')
    if (counter.effects !== undefined) assert(Array.isArray(counter.effects), ctx, 'counter.effects must be an array')
  }
  if (r.stars !== undefined) {
    assert(typeof r.stars === 'number' && r.stars >= 0 && r.stars <= 3, ctx, 'stars must be a number 0-3')
  }
  if (r.upgrades !== undefined) {
    assert(Array.isArray(r.upgrades), ctx, 'upgrades must be an array')
    assert(
      (r.upgrades as unknown[]).every((u) => typeof u === 'string' && u.length > 0),
      ctx,
      'upgrades must be an array of non-empty strings',
    )
  }
  if (r.art_ref !== undefined) {
    assert(typeof r.art_ref === 'string' && r.art_ref.length > 0, ctx, 'art_ref must be a non-empty string')
  }

  return r as unknown as CardDef
}

export function validateEnemy(raw: unknown, ctx: string): EnemyDef {
  assert(typeof raw === 'object' && raw !== null, ctx, 'expected an object')
  const r = raw as Record<string, unknown>
  assert(typeof r.id === 'string' && r.id.length > 0, ctx, 'id must be a non-empty string')
  ctx = `${ctx} (${r.id})`
  assert(typeof r.name === 'string', ctx, 'name must be a string')
  assert(typeof r.hp === 'number', ctx, 'hp must be a number')
  assert(r.resist === undefined || Array.isArray(r.resist), ctx, 'resist must be an array')
  assert(r.weak === undefined || Array.isArray(r.weak), ctx, 'weak must be an array')
  assert(Array.isArray(r.deck) && r.deck.length > 0, ctx, 'deck must be a non-empty array')
  if (r.level !== undefined) {
    assert(typeof r.level === 'number' && r.level >= 1 && r.level <= 20, ctx, 'level must be a number 1-20')
  }
  if (r.story_fork_id !== undefined) {
    assert(typeof r.story_fork_id === 'string' && r.story_fork_id.length > 0, ctx, 'story_fork_id must be a non-empty string')
  }

  r.resist = r.resist ?? []
  r.weak = r.weak ?? []
  return r as unknown as EnemyDef
}

export function validateEffect(raw: unknown, ctx: string): EffectDef {
  assert(typeof raw === 'object' && raw !== null, ctx, 'expected an object')
  const r = raw as Record<string, unknown>
  assert(typeof r.id === 'string' && r.id.length > 0, ctx, 'id must be a non-empty string')
  ctx = `${ctx} (${r.id})`
  assert(typeof r.name === 'string', ctx, 'name must be a string')
  assert(
    typeof r.kind === 'string' && EFFECT_KINDS.includes(r.kind),
    ctx,
    `kind must be one of ${EFFECT_KINDS.join('|')}`,
  )
  if (r.hooks !== undefined) assert(Array.isArray(r.hooks), ctx, 'hooks must be an array')
  if (r.modifiers !== undefined) assert(Array.isArray(r.modifiers), ctx, 'modifiers must be an array')

  return r as unknown as EffectDef
}

export function validateVerse(raw: unknown, ctx: string): VerseDef {
  assert(typeof raw === 'object' && raw !== null, ctx, 'expected an object')
  const r = raw as Record<string, unknown>
  assert(typeof r.id === 'string' && r.id.length > 0, ctx, 'id must be a non-empty string')
  ctx = `${ctx} (${r.id})`
  assert(typeof r.name === 'string', ctx, 'name must be a string')
  assert(typeof r.narration === 'string', ctx, 'narration must be a string')
  assert(typeof r.kind === 'string' && VERSE_KINDS.includes(r.kind), ctx, `kind must be one of ${VERSE_KINDS.join('|')}`)
  assert(
    Array.isArray(r.night) && r.night.every((n) => typeof n === 'number'),
    ctx,
    'night must be an array of numbers',
  )
  if (r.weight !== undefined) assert(typeof r.weight === 'number', ctx, 'weight must be a number')
  if (r.mustCrossOut !== undefined) assert(typeof r.mustCrossOut === 'boolean', ctx, 'mustCrossOut must be a boolean')
  if (r.reshuffle !== undefined) assert(typeof r.reshuffle === 'boolean', ctx, 'reshuffle must be a boolean')
  if (r.enemyPool !== undefined) {
    assert(
      Array.isArray(r.enemyPool) && r.enemyPool.every((e) => typeof e === 'string'),
      ctx,
      'enemyPool must be an array of strings',
    )
  }

  return r as unknown as VerseDef
}

export function validateBlessing(raw: unknown, ctx: string): BlessingDef {
  assert(typeof raw === 'object' && raw !== null, ctx, 'expected an object')
  const r = raw as Record<string, unknown>
  assert(typeof r.id === 'string' && r.id.length > 0, ctx, 'id must be a non-empty string')
  ctx = `${ctx} (${r.id})`
  assert(typeof r.name === 'string', ctx, 'name must be a string')
  assert(typeof r.narration === 'string', ctx, 'narration must be a string')
  assert(typeof r.effectId === 'string' && r.effectId.length > 0, ctx, 'effectId must be a non-empty string')
  assert(typeof r.stacks === 'number', ctx, 'stacks must be a number')
  if (r.art_ref !== undefined) {
    assert(typeof r.art_ref === 'string' && r.art_ref.length > 0, ctx, 'art_ref must be a non-empty string')
  }

  return r as unknown as BlessingDef
}

export function validateStoryFork(raw: unknown, ctx: string): StoryForkDef {
  assert(typeof raw === 'object' && raw !== null, ctx, 'expected an object')
  const r = raw as Record<string, unknown>
  assert(typeof r.id === 'string' && r.id.length > 0, ctx, 'id must be a non-empty string')
  ctx = `${ctx} (${r.id})`
  assert(typeof r.narration === 'string', ctx, 'narration must be a string')
  assert(Array.isArray(r.options) && r.options.length >= 2, ctx, 'options must be an array of at least 2')
  for (const raw of r.options) {
    assert(typeof raw === 'object' && raw !== null, ctx, 'each option must be an object')
    const opt = raw as Record<string, unknown>
    assert(typeof opt.id === 'string' && opt.id.length > 0, ctx, 'option.id must be a non-empty string')
    assert(typeof opt.label === 'string' && opt.label.length > 0, ctx, 'option.label must be a non-empty string')
    for (const key of ['wonderDelta', 'mercyDelta', 'hpDelta', 'dinarsDelta']) {
      if (opt[key] !== undefined) assert(typeof opt[key] === 'number', ctx, `option.${key} must be a number`)
    }
  }

  return r as unknown as StoryForkDef
}
