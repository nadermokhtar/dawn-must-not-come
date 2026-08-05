import { describe, expect, it } from 'vitest'
import { validateCard, validateEffect, validateEnemy, ValidationError } from './validate'
import { validateCrossReferences } from './loadContent'
import { makeContent, FIXTURE_CARDS, FIXTURE_EFFECTS, FIXTURE_ENEMIES } from '../engine/testFixtures'

const VALID_CARD = {
  id: 'x',
  name: 'X',
  type: 'attack',
  cost: { ap: 1, mana: 0 },
  cost_type: 'ap',
}

describe('validateCard rejects malformed cards', () => {
  it('rejects an unknown type', () => {
    expect(() => validateCard({ ...VALID_CARD, type: 'blessing' }, 'ctx')).toThrow(ValidationError)
  })

  it('rejects a missing cost', () => {
    const { cost, ...rest } = VALID_CARD
    expect(() => validateCard(rest, 'ctx')).toThrow(ValidationError)
  })

  it('rejects an unknown damage dtype', () => {
    expect(() => validateCard({ ...VALID_CARD, damage: { amount: 5, dtype: 'lightning' } }, 'ctx')).toThrow(
      ValidationError,
    )
  })

  it('rejects stars outside 0-3', () => {
    expect(() => validateCard({ ...VALID_CARD, stars: 4 }, 'ctx')).toThrow(ValidationError)
    expect(() => validateCard({ ...VALID_CARD, stars: -1 }, 'ctx')).toThrow(ValidationError)
  })

  it('rejects a non-array upgrades field', () => {
    expect(() => validateCard({ ...VALID_CARD, upgrades: 'sinbad_cutlass_strike_plus' }, 'ctx')).toThrow(
      ValidationError,
    )
  })

  it('rejects an empty-string art_ref', () => {
    expect(() => validateCard({ ...VALID_CARD, art_ref: '' }, 'ctx')).toThrow(ValidationError)
  })

  it('rejects a counter card with a non-object match', () => {
    expect(() =>
      validateCard({ ...VALID_CARD, type: 'counter', counter: { match: 'attack' } }, 'ctx'),
    ).toThrow(ValidationError)
  })

  it('accepts a well-formed card', () => {
    expect(() => validateCard(VALID_CARD, 'ctx')).not.toThrow()
  })
})

describe('validateEnemy / validateEffect reject malformed data', () => {
  it('rejects an enemy with an empty deck', () => {
    expect(() => validateEnemy({ id: 'e', name: 'E', hp: 10, deck: [] }, 'ctx')).toThrow(ValidationError)
  })

  it('rejects an effect with an unknown kind', () => {
    expect(() => validateEffect({ id: 'f', name: 'F', kind: 'mystical' }, 'ctx')).toThrow(ValidationError)
  })
})

describe('cross-reference validation', () => {
  it('rejects a card whose upgrades[] points at a nonexistent card', () => {
    const content = makeContent({
      cards: [...FIXTURE_CARDS, { ...VALID_CARD, id: 'bad_upgrade', upgrades: ['does_not_exist'] } as any],
      effects: FIXTURE_EFFECTS,
      enemies: FIXTURE_ENEMIES,
    })
    expect(() => validateCrossReferences(content)).toThrow(ValidationError)
  })

  it('rejects a card whose effects[] applies a nonexistent effect', () => {
    const content = makeContent({
      cards: [
        ...FIXTURE_CARDS,
        { ...VALID_CARD, id: 'bad_effect', effects: [{ apply: 'invisibility', stacks: 1, target: 'self' }] } as any,
      ],
      effects: FIXTURE_EFFECTS,
      enemies: FIXTURE_ENEMIES,
    })
    expect(() => validateCrossReferences(content)).toThrow(ValidationError)
  })

  it('rejects an enemy whose deck references a nonexistent card', () => {
    const content = makeContent({
      cards: FIXTURE_CARDS,
      effects: FIXTURE_EFFECTS,
      enemies: [...FIXTURE_ENEMIES, { id: 'bad_enemy', name: 'Bad', hp: 5, resist: [], weak: [], deck: ['ghost_card'] }],
    })
    expect(() => validateCrossReferences(content)).toThrow(ValidationError)
  })

  it('accepts a fully consistent content bundle', () => {
    const content = makeContent({ cards: FIXTURE_CARDS, effects: FIXTURE_EFFECTS, enemies: FIXTURE_ENEMIES })
    expect(() => validateCrossReferences(content)).not.toThrow()
  })
})
