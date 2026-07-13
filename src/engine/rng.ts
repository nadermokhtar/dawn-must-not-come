// mulberry32 — small, fast, deterministic. The internal state is a single
// uint32, which is why RngState is just `number`: saving/resuming a battle
// mid-fight only requires persisting that one value.
export type RngState = number

export interface Rng {
  next(): number
  int(n: number): number
  pick<T>(arr: T[]): T
  shuffle<T>(arr: T[]): T[]
  state(): RngState
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0

  function nextUint32(): number {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return (t ^ (t >>> 14)) >>> 0
  }

  const rng: Rng = {
    next() {
      return nextUint32() / 4294967296
    },
    int(n) {
      return Math.floor(rng.next() * n)
    },
    pick(arr) {
      const item = arr[rng.int(arr.length)]
      if (item === undefined) throw new Error('pick from empty array')
      return item
    },
    shuffle(arr) {
      const copy = arr.slice()
      for (let i = copy.length - 1; i > 0; i--) {
        const j = rng.int(i + 1)
        const tmp = copy[i]!
        copy[i] = copy[j]!
        copy[j] = tmp
      }
      return copy
    },
    state() {
      return a
    },
  }

  return rng
}

export function deriveSeed(runSeed: number, ...salts: (string | number)[]): number {
  let h = runSeed >>> 0
  for (const salt of salts) {
    const str = String(salt)
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 2654435761) >>> 0
    }
  }
  return h >>> 0
}
