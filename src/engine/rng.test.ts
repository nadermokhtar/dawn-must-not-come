import { describe, expect, it } from 'vitest'
import { createRng, deriveSeed } from './rng'

describe('rng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    const seqA = Array.from({ length: 10 }, () => a.next())
    const seqB = Array.from({ length: 10 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('shuffles deterministically for the same seed', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8]
    const a = createRng(7).shuffle(items)
    const b = createRng(7).shuffle(items)
    expect(a).toEqual(b)
    expect(a.slice().sort()).toEqual(items)
  })

  it('deriveSeed is stable for the same inputs and varies with salts', () => {
    const s1 = deriveSeed(100, 1, 3, 'drunken_dockhand')
    const s2 = deriveSeed(100, 1, 3, 'drunken_dockhand')
    const s3 = deriveSeed(100, 1, 4, 'drunken_dockhand')
    expect(s1).toBe(s2)
    expect(s1).not.toBe(s3)
  })
})
