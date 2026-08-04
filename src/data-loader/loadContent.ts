import type { CardDef, Content, EffectDef, EnemyDef } from '../engine/types'
import { ValidationError, validateCard, validateEffect, validateEnemy } from './validate'

interface JsonModule {
  default: unknown
}

const cardModules = import.meta.glob('/data/cards/**/*.json', { eager: true }) as Record<string, JsonModule>
const enemyModules = import.meta.glob('/data/enemies/**/*.json', { eager: true }) as Record<string, JsonModule>
const effectModules = import.meta.glob('/data/effects/**/*.json', { eager: true }) as Record<string, JsonModule>

function loadArray<T>(
  modules: Record<string, JsonModule>,
  validate: (raw: unknown, ctx: string) => T,
  getId: (item: T) => string,
): Map<string, T> {
  const out = new Map<string, T>()
  for (const [path, mod] of Object.entries(modules)) {
    const arr = mod.default
    if (!Array.isArray(arr)) throw new ValidationError(`${path}: expected a JSON array`)
    arr.forEach((raw, i) => {
      const item = validate(raw, `${path}#${i}`)
      const id = getId(item)
      if (out.has(id)) throw new ValidationError(`${path}#${i}: duplicate id "${id}"`)
      out.set(id, item)
    })
  }
  return out
}

// Scans a raw (pre-normalization) op array for effect-id references, in both
// the card-authoring shorthand ({apply: "venom", ...}) and the full op form
// ({op: "apply_effect"|"remove_effect", id: "venom", ...}).
function collectEffectRefs(rawOps: unknown[] | undefined): string[] {
  if (!rawOps) return []
  const refs: string[] = []
  for (const raw of rawOps) {
    const r = raw as Record<string, unknown>
    if (typeof r.apply === 'string') refs.push(r.apply)
    if ((r.op === 'apply_effect' || r.op === 'remove_effect') && typeof r.id === 'string') refs.push(r.id)
  }
  return refs
}

// Exported separately from loadContent so tests can exercise it against
// hand-built Content maps without going through import.meta.glob.
export function validateCrossReferences(content: Content): void {
  const { cards, enemies, effects } = content

  for (const enemy of enemies.values()) {
    for (const cardId of enemy.deck) {
      if (!cards.has(cardId)) {
        throw new ValidationError(`enemy "${enemy.id}": deck references unknown card "${cardId}"`)
      }
    }
    if (enemy.gimmick && !effects.has(enemy.gimmick)) {
      throw new ValidationError(`enemy "${enemy.id}": gimmick references unknown effect "${enemy.gimmick}"`)
    }
  }

  for (const card of cards.values()) {
    for (const upgradeId of card.upgrades ?? []) {
      if (!cards.has(upgradeId)) {
        throw new ValidationError(`card "${card.id}": upgrades references unknown card "${upgradeId}"`)
      }
    }
    for (const effectId of collectEffectRefs(card.effects)) {
      if (!effects.has(effectId)) {
        throw new ValidationError(`card "${card.id}": effects references unknown effect "${effectId}"`)
      }
    }
    for (const effectId of collectEffectRefs(card.counter?.effects)) {
      if (!effects.has(effectId)) {
        throw new ValidationError(`card "${card.id}": counter.effects references unknown effect "${effectId}"`)
      }
    }
  }
}

export function loadContent(): Content {
  const cards = loadArray<CardDef>(cardModules, validateCard, (c) => c.id)
  const effects = loadArray<EffectDef>(effectModules, validateEffect, (e) => e.id)
  const enemies = loadArray<EnemyDef>(enemyModules, validateEnemy, (e) => e.id)

  const content: Content = { cards, enemies, effects }
  validateCrossReferences(content)
  return content
}
