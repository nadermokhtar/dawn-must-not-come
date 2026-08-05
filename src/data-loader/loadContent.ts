import type { BlessingDef, CardDef, Content, EffectDef, EnemyDef, StoryForkDef, VerseDef } from '../engine/types'
import {
  ValidationError,
  validateBlessing,
  validateCard,
  validateEffect,
  validateEnemy,
  validateStoryFork,
  validateVerse,
} from './validate'

interface JsonModule {
  default: unknown
}

const cardModules = import.meta.glob('/data/cards/**/*.json', { eager: true }) as Record<string, JsonModule>
const enemyModules = import.meta.glob('/data/enemies/**/*.json', { eager: true }) as Record<string, JsonModule>
const effectModules = import.meta.glob('/data/effects/**/*.json', { eager: true }) as Record<string, JsonModule>
const verseModules = import.meta.glob('/data/verses/**/*.json', { eager: true }) as Record<string, JsonModule>
const blessingModules = import.meta.glob('/data/blessings/**/*.json', { eager: true }) as Record<string, JsonModule>
const storyForkModules = import.meta.glob('/data/story_forks/**/*.json', { eager: true }) as Record<string, JsonModule>

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
  const { cards, enemies, effects, verses, blessings, storyForks } = content

  for (const enemy of enemies.values()) {
    for (const cardId of enemy.deck) {
      if (!cards.has(cardId)) {
        throw new ValidationError(`enemy "${enemy.id}": deck references unknown card "${cardId}"`)
      }
    }
    if (enemy.gimmick && !effects.has(enemy.gimmick)) {
      throw new ValidationError(`enemy "${enemy.id}": gimmick references unknown effect "${enemy.gimmick}"`)
    }
    if (enemy.story_fork_id && !storyForks.has(enemy.story_fork_id)) {
      throw new ValidationError(`enemy "${enemy.id}": story_fork_id references unknown story fork "${enemy.story_fork_id}"`)
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

  for (const verse of verses.values()) {
    for (const enemyId of verse.enemyPool ?? []) {
      if (!enemies.has(enemyId)) {
        throw new ValidationError(`verse "${verse.id}": enemyPool references unknown enemy "${enemyId}"`)
      }
    }
  }

  for (const blessing of blessings.values()) {
    if (!effects.has(blessing.effectId)) {
      throw new ValidationError(`blessing "${blessing.id}": effectId references unknown effect "${blessing.effectId}"`)
    }
  }
}

export function loadContent(): Content {
  const cards = loadArray<CardDef>(cardModules, validateCard, (c) => c.id)
  const effects = loadArray<EffectDef>(effectModules, validateEffect, (e) => e.id)
  const enemies = loadArray<EnemyDef>(enemyModules, validateEnemy, (e) => e.id)
  const verses = loadArray<VerseDef>(verseModules, validateVerse, (v) => v.id)
  const blessings = loadArray<BlessingDef>(blessingModules, validateBlessing, (b) => b.id)
  const storyForks = loadArray<StoryForkDef>(storyForkModules, validateStoryFork, (f) => f.id)

  const content: Content = { cards, enemies, effects, verses, blessings, storyForks }
  validateCrossReferences(content)
  return content
}
