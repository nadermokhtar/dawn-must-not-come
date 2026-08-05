import type { Content, EffectInstance, VerseDef, VerseKind } from './types'
import { createRng, deriveSeed } from './rng'
import progression from '../../data/progression.json'

interface ProgressionClass {
  hp: number
  ap_base: number
  mana: number
  mana_max: number
  hand_size: number
  dinars: number
  starting_deck: string[]
}

interface ProgressionData {
  classes: Record<string, ProgressionClass>
  nights?: Record<string, { pages: number }>
  pricing?: {
    shop?: Record<string, number>
    upgrade?: number
    remove?: number
  }
}

const PROGRESSION = progression as unknown as ProgressionData
const DEFAULT_SHOP_PRICING: Record<string, number> = { common: 40, uncommon: 70, rare: 120 }
const DEFAULT_UPGRADE_PRICE = 50
const DEFAULT_REMOVE_PRICE = 60
const DEFAULT_PAGES_IN_NIGHT = 22
const BOSS_REWARD_DINARS = 50
const KILL_REWARD_DINARS = 10
const CHEST_REWARD_DINARS = 20
const WIN_HEAL_FRACTION = 0.2
const XP_PER_KILL = 10
export const XP_TO_LEVEL = 20
const HP_PER_LEVEL = 3
const MAX_LEVEL = 20
const LEVEL_GATE_HEADROOM = 1

export interface RunState {
  seed: number
  classId: string
  night: number
  page: number
  pagesInNight: number
  rerollCount: number
  level: number
  xp: number
  hp: number
  maxHp: number
  apBase: number
  mana: number
  manaMax: number
  handSize: number
  dinars: number
  wonder: number
  mercy: number
  deck: string[]
  equipment: string[]
  blessings: string[]
  flags: Record<string, string>
  crossedOutVerseIds: string[]
  bossDefeated: boolean
  result?: 'night_cleared' | 'defeated'
}

export function createRun(classId: string, seed: number): RunState {
  const cls = PROGRESSION.classes[classId]
  if (!cls) throw new Error(`unknown class ${classId}`)

  return {
    seed,
    classId,
    night: 1,
    page: 0,
    pagesInNight: PROGRESSION.nights?.['1']?.pages ?? DEFAULT_PAGES_IN_NIGHT,
    rerollCount: 0,
    level: 1,
    xp: 0,
    hp: cls.hp,
    maxHp: cls.hp,
    apBase: cls.ap_base,
    mana: cls.mana,
    manaMax: cls.mana_max,
    handSize: cls.hand_size,
    dinars: cls.dinars,
    wonder: 0,
    mercy: 0,
    deck: [...cls.starting_deck],
    equipment: [],
    blessings: [],
    flags: {},
    crossedOutVerseIds: [],
    bossDefeated: false,
  }
}

// Flat 20 XP/level so a 10-XP kill levels the player up roughly every other
// fight, regardless of how far into the run they are (matches the pacing the
// leveling system was asked to hit — not a scaling RPG curve).
export function grantXp(run: RunState, amount: number): { levelsGained: number } {
  run.xp += amount
  let levelsGained = 0
  while (run.xp >= XP_TO_LEVEL && run.level < MAX_LEVEL) {
    run.xp -= XP_TO_LEVEL
    run.level += 1
    run.maxHp += HP_PER_LEVEL
    run.hp = Math.min(run.maxHp, run.hp + HP_PER_LEVEL)
    levelsGained += 1
  }
  return { levelsGained }
}

function bossVerseFor(run: RunState, content: Content): VerseDef | undefined {
  for (const v of content.verses.values()) {
    if (v.kind === 'boss' && v.night.includes(run.night)) return v
  }
  return undefined
}

// Fairness gate: a battle Verse only offers a fight the player is ready for
// — its enemy must be within [run.level, run.level + headroom]. Non-battle
// Verses and enemies with no level assigned are always eligible.
function isVerseLevelEligible(verse: VerseDef, run: RunState, content: Content): boolean {
  if (verse.kind !== 'battle' || !verse.enemyPool) return true
  return verse.enemyPool.every((id) => {
    const level = content.enemies.get(id)?.level
    if (level === undefined) return true
    return level >= run.level && level <= run.level + LEVEL_GATE_HEADROOM
  })
}

// 3-up selection per DESIGN.md §3.1. Deterministic per (seed, night, page,
// rerollCount) so replays/tests are stable, but a "Turn the Page" reshuffle
// (which bumps rerollCount without advancing the page) still yields a
// different draw.
export function rollVerseOptions(run: RunState, content: Content): VerseDef[] {
  const boss = bossVerseFor(run, content)
  if (run.page >= run.pagesInNight && boss && !run.bossDefeated) {
    return [boss]
  }

  const pool = [...content.verses.values()].filter(
    (v) =>
      v.kind !== 'boss' &&
      v.night.includes(run.night) &&
      !(v.mustCrossOut && run.crossedOutVerseIds.includes(v.id)) &&
      isVerseLevelEligible(v, run, content),
  )
  if (pool.length === 0) throw new Error('verse pool exhausted for night ' + run.night)

  const weighted: VerseDef[] = []
  for (const v of pool) {
    const w = Math.max(1, Math.round(v.weight ?? 1))
    for (let i = 0; i < w; i++) weighted.push(v)
  }

  const rng = createRng(deriveSeed(run.seed, 'night', run.night, 'page', run.page, 'reroll', run.rerollCount))
  const chosen: VerseDef[] = []
  const usedIds = new Set<string>()
  let guard = 0
  while (chosen.length < 3 && chosen.length < pool.length && guard < 200) {
    guard++
    const pick = rng.pick(weighted)
    if (usedIds.has(pick.id)) continue
    usedIds.add(pick.id)
    chosen.push(pick)
  }
  return chosen
}

export interface EnterVerseResult {
  kind: VerseKind
  verseId: string
  enemyId?: string
  reshuffled: boolean
}

// Page/cross-out bookkeeping for picking one of the 3 offered Verses.
// Reshuffle Verses ("Turn the Page") don't consume a page; everything else
// does, including battles (a Verse is spent by visiting it, win or lose).
export function enterVerse(run: RunState, verseId: string, content: Content): EnterVerseResult {
  const verse = content.verses.get(verseId)
  if (!verse) throw new Error(`unknown verse ${verseId}`)

  if (verse.reshuffle) {
    run.rerollCount += 1
    return { kind: verse.kind, verseId: verse.id, reshuffled: true }
  }

  if (verse.mustCrossOut && !run.crossedOutVerseIds.includes(verse.id)) {
    run.crossedOutVerseIds.push(verse.id)
  }
  if (verse.kind !== 'boss') run.page += 1

  let enemyId: string | undefined
  if (verse.enemyPool && verse.enemyPool.length > 0) {
    const rng = createRng(deriveSeed(run.seed, 'enemy', run.night, run.page, verse.id))
    enemyId = rng.pick(verse.enemyPool)
  }

  return { kind: verse.kind, verseId: verse.id, enemyId, reshuffled: false }
}

export function applyBattleReward(run: RunState, enemyId: string, content: Content): { dinars: number; levelsGained: number } {
  const enemy = content.enemies.get(enemyId)
  if (!enemy) throw new Error(`unknown enemy ${enemyId}`)
  const dinars = enemy.tier === 'boss' ? BOSS_REWARD_DINARS : KILL_REWARD_DINARS
  run.dinars += dinars
  const { levelsGained } = grantXp(run, XP_PER_KILL)
  run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * WIN_HEAL_FRACTION))
  if (enemy.tier === 'boss') {
    run.bossDefeated = true
    run.result = 'night_cleared'
  }
  return { dinars, levelsGained }
}

export function recordDefeat(run: RunState): void {
  run.result = 'defeated'
}

export function blessingEffects(run: RunState, content: Content): EffectInstance[] {
  const effects: EffectInstance[] = []
  for (const id of run.blessings) {
    const blessing = content.blessings.get(id)
    if (blessing) effects.push({ effectId: blessing.effectId, stacks: blessing.stacks })
  }
  return effects
}

export type EconomyResult = { ok: true } | { ok: false; error: string }

export function cardPrice(rarity: string | undefined): number {
  const pricing = PROGRESSION.pricing?.shop ?? DEFAULT_SHOP_PRICING
  return pricing[rarity ?? 'common'] ?? pricing.common ?? DEFAULT_SHOP_PRICING.common!
}

export function upgradePrice(): number {
  return PROGRESSION.pricing?.upgrade ?? DEFAULT_UPGRADE_PRICE
}

export function removePrice(): number {
  return PROGRESSION.pricing?.remove ?? DEFAULT_REMOVE_PRICE
}

export function buyCard(run: RunState, cardId: string, content: Content): EconomyResult {
  const card = content.cards.get(cardId)
  if (!card) return { ok: false, error: 'unknown_card' }
  const price = cardPrice(card.rarity)
  if (run.dinars < price) return { ok: false, error: 'insufficient_dinars' }
  run.dinars -= price
  run.deck.push(cardId)
  return { ok: true }
}

export function upgradeCard(run: RunState, cardId: string, content: Content): EconomyResult & { upgradedId?: string } {
  const idx = run.deck.indexOf(cardId)
  if (idx === -1) return { ok: false, error: 'not_in_deck' }
  const targetId = content.cards.get(cardId)?.upgrades?.[0]
  if (!targetId) return { ok: false, error: 'no_upgrade' }
  const price = upgradePrice()
  if (run.dinars < price) return { ok: false, error: 'insufficient_dinars' }
  run.dinars -= price
  run.deck[idx] = targetId
  return { ok: true, upgradedId: targetId }
}

export function removeCard(run: RunState, cardId: string): EconomyResult {
  const idx = run.deck.indexOf(cardId)
  if (idx === -1) return { ok: false, error: 'not_in_deck' }
  const price = removePrice()
  if (run.dinars < price) return { ok: false, error: 'insufficient_dinars' }
  run.dinars -= price
  run.deck.splice(idx, 1)
  return { ok: true }
}

export function grantBlessing(run: RunState, blessingId: string, content: Content): EconomyResult {
  if (!content.blessings.has(blessingId)) return { ok: false, error: 'unknown_blessing' }
  if (run.blessings.includes(blessingId)) return { ok: false, error: 'already_held' }
  run.blessings.push(blessingId)
  return { ok: true }
}

export function resolveChest(run: RunState): { dinars: number } {
  run.dinars += CHEST_REWARD_DINARS
  return { dinars: CHEST_REWARD_DINARS }
}
