import type { CardDef, EffectDef, EnemyDef } from '../engine/types'

export class ValidationError extends Error {}

const CARD_TYPES = ['attack', 'spell', 'counter', 'equipment', 'curse', 'item']
const DTYPES = ['steel', 'true_strike', 'ifrit_flame', 'tide', 'storm', 'serpent_venom']
const EFFECT_KINDS = ['buff', 'debuff', 'neutral']

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
