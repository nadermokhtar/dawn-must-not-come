import { createRun, type RunState } from '../engine/run'

const STORAGE_KEY = 'dawn-must-not-come:run'

// Scope note (see README/CLAUDE.md): this persists RunState (map-level
// progress) only, not mid-battle BattleState — closing the tab mid-fight
// loses that one fight, not the run.
export function saveRun(run: RunState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(run))
  } catch {
    // Private browsing / storage-full / disabled storage: losing
    // persistence silently is better than crashing the game over it.
  }
}

// Backfills onto fresh createRun() defaults so a save from before a
// RunState field was added doesn't leave that field undefined and crash
// code that assumes it exists.
export function loadRun(): RunState | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as Partial<RunState>
    if (typeof parsed !== 'object' || parsed === null) return undefined
    if (typeof parsed.classId !== 'string' || typeof parsed.seed !== 'number') return undefined
    return { ...createRun(parsed.classId, parsed.seed), ...parsed }
  } catch {
    return undefined
  }
}

export function clearRun(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

// Per-profile (per-browser), not per-run — a fresh run must NOT re-trigger
// tutorials the player has already dismissed, unlike RunState which resets
// every createRun(). Generic string flags rather than one key per tutorial
// so new one-time hints can be added without touching persistence code.
const SEEN_KEY = 'dawn-must-not-come:seen'

function loadSeenFlags(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    return Array.isArray(arr) ? new Set(arr.filter((x): x is string => typeof x === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

export function hasSeen(flag: string): boolean {
  return loadSeenFlags().has(flag)
}

export function markSeen(flag: string): void {
  try {
    const flags = loadSeenFlags()
    flags.add(flag)
    localStorage.setItem(SEEN_KEY, JSON.stringify([...flags]))
  } catch {
    // Private browsing / storage-full: worst case the tutorial reappears
    // next time, which is harmless.
  }
}
