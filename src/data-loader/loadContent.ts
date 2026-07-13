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

export function loadContent(): Content {
  const cards = loadArray<CardDef>(cardModules, validateCard, (c) => c.id)
  const effects = loadArray<EffectDef>(effectModules, validateEffect, (e) => e.id)
  const enemies = loadArray<EnemyDef>(enemyModules, validateEnemy, (e) => e.id)

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

  return { cards, enemies, effects }
}
