import type { CardDef, Content, EffectInstance, VerseDef, VerseKind } from './types'
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
const WIN_HEAL_FRACTION = 0.15
const XP_PER_KILL = 10
export const XP_TO_LEVEL = 20
const HP_PER_LEVEL = 3
const MAX_LEVEL = 20
const LEVEL_GATE_HEADROOM = 1
const WONDER_HP_THRESHOLDS = [4, 8]
const WONDER_HP_BONUS = 5
const MERCY_DINAR_THRESHOLDS = [4]
const MERCY_DINAR_BONUS = 20
const BANK_INTEREST_RATE = 0.2
const SEALED_JAR_CURSE_CARD_IDS = ['curse_seasickness', 'curse_petty_grudge', 'curse_barnacles']

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
  // The verses currently offered on the map, persisted across screens. Per
  // DESIGN.md §3.1 / NotFM: picking one of the 3 shown Verses only replaces
  // that one — the other 2 stay put, so you can battle and come back to find
  // the Bazaar or Blessing verse still waiting. Empty means "needs a full
  // roll" (fresh run, after a reshuffle, or after advancing to a new Night).
  verseOptionIds: string[]
  bossDefeated: boolean
  resolvedForks: string[]
  bankedDinars: number
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
    verseOptionIds: [],
    bossDefeated: false,
    resolvedForks: [],
    bankedDinars: 0,
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

function eligibleVersePool(run: RunState, content: Content): VerseDef[] {
  return [...content.verses.values()].filter(
    (v) =>
      v.kind !== 'boss' &&
      v.night.includes(run.night) &&
      !(v.mustCrossOut && run.crossedOutVerseIds.includes(v.id)) &&
      isVerseLevelEligible(v, run, content),
  )
}

function weightedVersePool(pool: VerseDef[]): VerseDef[] {
  const weighted: VerseDef[] = []
  for (const v of pool) {
    const w = Math.max(1, Math.round(v.weight ?? 1))
    for (let i = 0; i < w; i++) weighted.push(v)
  }
  return weighted
}

// Picks up to `count` distinct eligible verses (skipping `exclude`),
// deterministic per (seed, night, page, rerollCount, salt) so replays/tests
// are stable — `salt` differentiates a full 3-up roll from a single
// slot-replacement roll so they don't collide on the same draw.
function rollDistinctVerses(run: RunState, content: Content, count: number, exclude: Set<string>, salt: string): VerseDef[] {
  const pool = eligibleVersePool(run, content).filter((v) => !exclude.has(v.id))
  if (pool.length === 0) return []

  const weighted = weightedVersePool(pool)
  const rng = createRng(deriveSeed(run.seed, 'night', run.night, 'page', run.page, 'reroll', run.rerollCount, salt))
  const chosen: VerseDef[] = []
  const usedIds = new Set<string>()
  let guard = 0
  while (chosen.length < count && chosen.length < pool.length && guard < 200) {
    guard++
    const pick = rng.pick(weighted)
    if (usedIds.has(pick.id)) continue
    usedIds.add(pick.id)
    chosen.push(pick)
  }
  return chosen
}

// 3-up selection per DESIGN.md §3.1. Deterministic per (seed, night, page,
// rerollCount) so replays/tests are stable, but a "Turn the Page" reshuffle
// (which bumps rerollCount without advancing the page) still yields a
// different draw. This is the "roll all 3 from scratch" path — used to
// bootstrap `currentVerseOptions` below, not called directly by the UI.
export function rollVerseOptions(run: RunState, content: Content): VerseDef[] {
  const boss = bossVerseFor(run, content)
  if (run.page >= run.pagesInNight && boss && !run.bossDefeated) {
    return [boss]
  }

  if (eligibleVersePool(run, content).length === 0) {
    throw new Error('verse pool exhausted for night ' + run.night)
  }
  return rollDistinctVerses(run, content, 3, new Set(), 'roll')
}

// The verses to actually show on the map — persisted in `run.verseOptionIds`
// across screens (see the field's doc comment). Bootstraps or repairs by
// rolling however many slots are missing (fresh run, mid-run save from
// before this field existed, or a slot invalidated by a night/level change).
export function currentVerseOptions(run: RunState, content: Content): VerseDef[] {
  const boss = bossVerseFor(run, content)
  if (run.page >= run.pagesInNight && boss && !run.bossDefeated) {
    return [boss]
  }

  const stored = run.verseOptionIds
    .map((id) => content.verses.get(id))
    .filter((v): v is VerseDef => v !== undefined && v.night.includes(run.night) && isVerseLevelEligible(v, run, content))

  if (stored.length >= 3) return stored.slice(0, 3)

  const rolled = rollDistinctVerses(run, content, 3 - stored.length, new Set(stored.map((v) => v.id)), 'roll')
  const combined = [...stored, ...rolled]
  run.verseOptionIds = combined.map((v) => v.id)
  return combined
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
//
// Slot persistence (DESIGN.md §3.1 / NotFM): picking a Verse replaces only
// that one slot in `run.verseOptionIds` — the other 2 stay exactly as they
// were, so leaving for a battle and coming back still shows the Bazaar or
// Blessing verse that was sitting there. A reshuffle discards all 3 (the one
// documented exception); a boss clear also discards all 3, since the next
// roll belongs to a new page batch or a new Night entirely.
export function enterVerse(run: RunState, verseId: string, content: Content): EnterVerseResult {
  const verse = content.verses.get(verseId)
  if (!verse) throw new Error(`unknown verse ${verseId}`)

  if (verse.reshuffle) {
    run.rerollCount += 1
    run.verseOptionIds = []
    return { kind: verse.kind, verseId: verse.id, reshuffled: true }
  }

  if (verse.mustCrossOut && !run.crossedOutVerseIds.includes(verse.id)) {
    run.crossedOutVerseIds.push(verse.id)
  }

  const isBoss = verse.kind === 'boss'
  if (!isBoss) run.page += 1

  let enemyId: string | undefined
  if (verse.enemyPool && verse.enemyPool.length > 0) {
    const rng = createRng(deriveSeed(run.seed, 'enemy', run.night, run.page, verse.id))
    enemyId = rng.pick(verse.enemyPool)
  }

  if (isBoss) {
    run.verseOptionIds = []
  } else {
    const remaining = run.verseOptionIds.filter((id) => id !== verseId)
    const replacement = rollDistinctVerses(run, content, 1, new Set(remaining), `slot-${verseId}-${run.page}`)
    run.verseOptionIds = [...remaining, ...replacement.map((v) => v.id)]
  }

  return { kind: verse.kind, verseId: verse.id, enemyId, reshuffled: false }
}

function hasNightContent(content: Content, night: number): boolean {
  for (const v of content.verses.values()) {
    if (v.night.includes(night)) return true
  }
  return false
}

export function applyBattleReward(
  run: RunState,
  enemyId: string,
  content: Content,
): { dinars: number; levelsGained: number; nightAdvanced: boolean } {
  const enemy = content.enemies.get(enemyId)
  if (!enemy) throw new Error(`unknown enemy ${enemyId}`)
  const dinars = enemy.tier === 'boss' ? BOSS_REWARD_DINARS : KILL_REWARD_DINARS
  run.dinars += dinars
  const { levelsGained } = grantXp(run, XP_PER_KILL)
  run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * WIN_HEAL_FRACTION))

  let nightAdvanced = false
  if (enemy.tier === 'boss') {
    run.bossDefeated = true
    if (hasNightContent(content, run.night + 1)) {
      run.night += 1
      run.page = 0
      run.rerollCount = 0
      run.crossedOutVerseIds = []
      run.pagesInNight = PROGRESSION.nights?.[String(run.night)]?.pages ?? DEFAULT_PAGES_IN_NIGHT
      run.bossDefeated = false
      nightAdvanced = true
    } else {
      run.result = 'night_cleared'
    }
  }
  return { dinars, levelsGained, nightAdvanced }
}

export function recordDefeat(run: RunState): void {
  run.result = 'defeated'
}

// DESIGN.md §4.2: Wonder must be >= Mercy to unlock the most dangerous hidden
// fights (not yet built); either stat crossing a threshold grants a one-time
// bonus, tracked in `flags` so it's never granted twice.
function applyWonderMercyThresholds(run: RunState): void {
  for (const t of WONDER_HP_THRESHOLDS) {
    const key = `wonder_threshold_${t}`
    if (run.wonder >= t && !run.flags[key]) {
      run.flags[key] = 'granted'
      run.maxHp += WONDER_HP_BONUS
      run.hp += WONDER_HP_BONUS
    }
  }
  for (const t of MERCY_DINAR_THRESHOLDS) {
    const key = `mercy_threshold_${t}`
    if (run.mercy >= t && !run.flags[key]) {
      run.flags[key] = 'granted'
      run.dinars += MERCY_DINAR_BONUS
    }
  }
}

// DESIGN.md §4.1: a Story Fork is offered once per enemy that carries a
// story_fork_id, keyed off resolvedForks so re-fighting a repeatable battle
// Verse doesn't re-trigger it.
export function forkForEnemy(run: RunState, enemyId: string, content: Content) {
  const enemy = content.enemies.get(enemyId)
  if (!enemy?.story_fork_id) return undefined
  if (run.resolvedForks.includes(enemy.story_fork_id)) return undefined
  const fork = content.storyForks.get(enemy.story_fork_id)
  return fork ? { forkId: enemy.story_fork_id, fork } : undefined
}

export function resolveStoryFork(run: RunState, forkId: string, optionId: string, content: Content): void {
  const fork = content.storyForks.get(forkId)
  const option = fork?.options.find((o) => o.id === optionId)
  if (!fork || !option) throw new Error(`unknown story fork option ${forkId}/${optionId}`)

  run.wonder = Math.max(0, run.wonder + (option.wonderDelta ?? 0))
  run.mercy = Math.max(0, run.mercy + (option.mercyDelta ?? 0))
  run.hp = Math.max(0, Math.min(run.maxHp, run.hp + (option.hpDelta ?? 0)))
  run.dinars = Math.max(0, run.dinars + (option.dinarsDelta ?? 0))
  if (!run.resolvedForks.includes(forkId)) run.resolvedForks.push(forkId)
  applyWonderMercyThresholds(run)
}

// Shared by the Bazaar (paid) and level-up rewards (free) so both offer
// from the same class-card pool with the same "no curses, no _plus variants"
// filtering, just seeded differently.
export function sampleClassCards(run: RunState, content: Content, count: number, salt: string): CardDef[] {
  const pool = [...content.cards.values()].filter(
    (c) => c.class === run.classId && c.type !== 'curse' && !c.id.endsWith('_plus'),
  )
  const rng = createRng(deriveSeed(run.seed, salt, run.night, run.page, run.level))
  return rng.shuffle(pool).slice(0, count)
}

// Coin Djinn (DESIGN.md §3.4): deposit now, withdraw later for interest.
// Withdrawing always empties the whole balance at once (no partial withdraw)
// to keep the UI a single button rather than an amount picker.
export function depositBank(run: RunState, amount: number): EconomyResult {
  if (amount <= 0 || run.dinars < amount) return { ok: false, error: 'insufficient_dinars' }
  run.dinars -= amount
  run.bankedDinars += amount
  return { ok: true }
}

export function withdrawBank(run: RunState): { dinars: number } {
  const payout = Math.round(run.bankedDinars * (1 + BANK_INTEREST_RATE))
  run.dinars += payout
  run.bankedDinars = 0
  return { dinars: payout }
}

// The Sealed Jar (DESIGN.md §3.4's Pandora's Box): risk/reward, deterministic
// per visit — either a blessing or a curse card, never both.
export function resolveSealedJar(run: RunState, content: Content): { blessingId: string } | { curseCardId: string } {
  const rng = createRng(deriveSeed(run.seed, 'sealed_jar', run.night, run.page))
  const goodOutcome = rng.next() < 0.5

  if (goodOutcome) {
    const available = [...content.blessings.values()].filter((b) => !run.blessings.includes(b.id))
    if (available.length > 0) {
      const blessing = rng.pick(available)
      run.blessings.push(blessing.id)
      return { blessingId: blessing.id }
    }
  }
  const curseCardId = rng.pick(SEALED_JAR_CURSE_CARD_IDS)
  run.deck.push(curseCardId)
  return { curseCardId }
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
