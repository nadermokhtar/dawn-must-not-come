import { describe, expect, it } from 'vitest'
import { loadContent } from './loadContent'

describe('loadContent (real /data)', () => {
  it('loads Phase 1 data without throwing and resolves every cross-reference', () => {
    const content = loadContent()
    expect(content.cards.size).toBeGreaterThan(0)
    expect(content.enemies.size).toBeGreaterThan(0)
    expect(content.effects.size).toBeGreaterThan(0)
    expect(content.enemies.has('drunken_dockhand')).toBe(true)
    expect(content.cards.has('sinbad_cutlass_strike')).toBe(true)
    expect(content.effects.has('venom')).toBe(true)
  })
})
