import type { BattleState, Content, EffectInstance, EnemyState, PlayerState } from './types'
import { applyDamage, checkWinLoss, isBattleOver } from './damage'
import { drawCards } from './deck'
import { runHooks } from './effects'
import { applyEffectStacks, runOps, type OpContext, type OpFlags } from './primitives'
import { pickEnemyMove } from './enemyAI'
import { checkCounters, setCounter } from './counters'
import { createRng, type Rng } from './rng'
import type { Emit, BattleEvent } from './events'

export interface PlayerStats {
  hp: number
  maxHp?: number
  apBase: number
  mana: number
  manaMax: number
  handSize: number
  drawPerTurn: number
}

export interface StartBattleArgs {
  playerStats: PlayerStats
  deck: string[]
  enemyId: string
  content: Content
  seed: number
  initialPlayerEffects?: EffectInstance[]
}

export interface BattleResult {
  state: BattleState
  events: BattleEvent[]
}

export function startBattle(args: StartBattleArgs): BattleResult {
  const events: BattleEvent[] = []
  const emit: Emit = (e) => events.push(e)
  const rng = createRng(args.seed)

  const enemyDef = args.content.enemies.get(args.enemyId)
  if (!enemyDef) throw new Error(`unknown enemy ${args.enemyId}`)

  let nextUid = 1
  const shuffledDeck = rng.shuffle(args.deck)
  const drawPile = shuffledDeck.map((cardId) => ({ uid: nextUid++, cardId }))

  const player: PlayerState = {
    hp: args.playerStats.hp,
    maxHp: args.playerStats.maxHp ?? args.playerStats.hp,
    ap: 0,
    apBase: args.playerStats.apBase,
    mana: args.playerStats.mana,
    manaMax: args.playerStats.manaMax,
    effects: args.initialPlayerEffects ?? [],
    drawPile,
    hand: [],
    discard: [],
    exhaust: [],
    counters: [],
    handSize: args.playerStats.handSize,
    drawBase: args.playerStats.drawPerTurn,
  }

  const enemy: EnemyState = {
    hp: enemyDef.hp,
    maxHp: enemyDef.hp,
    ap: 0,
    apBase: 0,
    mana: 0,
    manaMax: 0,
    effects: [],
    enemyId: args.enemyId,
    deckCursor: 0,
  }

  const state: BattleState = {
    turn: 1,
    phase: 'player',
    player,
    enemy,
    rngState: rng.state(),
    nextUid,
  }

  emit({ type: 'battle_start', playerHp: player.hp, enemyHp: enemy.hp })

  if (enemyDef.gimmick) {
    applyEffectStacks(state, args.content, 'enemy', enemyDef.gimmick, 1, emit)
  }
  runHooks(state, args.content, 'battle_start', 'player', rng, emit)

  if (enemyDef.first_move) {
    resolveEnemyTurn(state, args.content, rng, emit)
  }

  beginPlayerTurn(state, args.content, rng, emit)

  state.rngState = rng.state()
  return { state, events }
}

export type PlayCardResult = { events: BattleEvent[] } | { error: string }

export function playCard(state: BattleState, content: Content, handUid: number): PlayCardResult {
  if (isBattleOver(state)) return { error: 'battle_over' }

  const idx = state.player.hand.findIndex((c) => c.uid === handUid)
  if (idx === -1) return { error: 'not_in_hand' }
  const inst = state.player.hand[idx]!
  const cardDef = content.cards.get(inst.cardId)
  if (!cardDef) return { error: 'unknown_card' }

  const events: BattleEvent[] = []
  const emit: Emit = (e) => events.push(e)
  const rng = createRng(state.rngState)

  if (cardDef.type === 'counter') {
    const res = setCounter(state, content, handUid, emit)
    state.rngState = rng.state()
    if ('error' in res) return res
    return { events }
  }

  if (state.player.ap < cardDef.cost.ap) return { error: 'insufficient_ap' }
  if (state.player.mana < cardDef.cost.mana) return { error: 'insufficient_mana' }

  state.player.ap -= cardDef.cost.ap
  state.player.mana -= cardDef.cost.mana
  state.player.hand.splice(idx, 1)
  emit({ type: 'play_card', side: 'player', cardId: inst.cardId, uid: inst.uid })

  if (cardDef.damage) {
    applyDamage(state, content, 'player', 'enemy', cardDef.damage.dtype, cardDef.damage.amount, emit)
  }

  const flags: OpFlags = { negated: false }
  const ctx: OpContext = { state, content, rng, owner: 'player', emit, flags }
  runOps(cardDef.effects ?? [], ctx)

  if (cardDef.draw) drawCards(state, cardDef.draw, rng, emit)

  if (cardDef.exhaust) {
    state.player.exhaust.push(inst)
    emit({ type: 'exhaust', side: 'player', uid: inst.uid, cardId: inst.cardId })
  } else {
    state.player.discard.push(inst)
  }

  checkWinLoss(state, emit)
  state.rngState = rng.state()
  return { events }
}

export function endTurn(state: BattleState, content: Content): { events: BattleEvent[] } {
  const events: BattleEvent[] = []
  const emit: Emit = (e) => events.push(e)
  if (isBattleOver(state)) return { events }

  const rng = createRng(state.rngState)

  emit({ type: 'turn_end', turn: state.turn, side: 'player' })
  runHooks(state, content, 'turn_end', 'player', rng, emit)
  checkWinLoss(state, emit)
  if (isBattleOver(state)) {
    state.rngState = rng.state()
    return { events }
  }

  discardDownToHandSize(state, emit)

  resolveEnemyTurn(state, content, rng, emit)
  if (isBattleOver(state)) {
    state.rngState = rng.state()
    return { events }
  }

  state.turn += 1
  beginPlayerTurn(state, content, rng, emit)

  state.rngState = rng.state()
  return { events }
}

function beginPlayerTurn(state: BattleState, content: Content, rng: Rng, emit: Emit): void {
  emit({ type: 'turn_start', turn: state.turn, side: 'player' })
  state.player.ap = state.player.apBase
  runHooks(state, content, 'turn_start', 'player', rng, emit)
  checkWinLoss(state, emit)
  if (isBattleOver(state)) return

  // Flat draw, not "fill up to handSize" — DESIGN.md §3.2: high card turnover
  // is the point, not a resource to hoard. handSize still matters (it caps
  // what carries over via the end-of-turn discard in discardDownToHandSize).
  drawCards(state, state.player.drawBase, rng, emit)
}

function resolveEnemyTurn(state: BattleState, content: Content, rng: Rng, emit: Emit): void {
  emit({ type: 'turn_start', turn: state.turn, side: 'enemy' })
  runHooks(state, content, 'turn_start', 'enemy', rng, emit)
  checkWinLoss(state, emit)
  if (isBattleOver(state)) return

  const enemyDef = content.enemies.get(state.enemy.enemyId)!
  const movesPerTurn = enemyDef.ai?.moves_per_turn ?? 1

  for (let i = 0; i < movesPerTurn; i++) {
    if (isBattleOver(state)) break
    const cardId = pickEnemyMove(state, content, rng)
    const moveCard = content.cards.get(cardId)
    if (!moveCard) throw new Error(`unknown move card ${cardId}`)
    emit({ type: 'enemy_play', cardId })

    const negated = checkCounters(state, content, moveCard, rng, emit)
    if (!negated) {
      if (moveCard.damage) {
        applyDamage(state, content, 'enemy', 'player', moveCard.damage.dtype, moveCard.damage.amount, emit)
      }
      const flags: OpFlags = { negated: false }
      const ctx: OpContext = { state, content, rng, owner: 'enemy', emit, flags }
      runOps(moveCard.effects ?? [], ctx)
    }
    checkWinLoss(state, emit)
  }

  emit({ type: 'turn_end', turn: state.turn, side: 'enemy' })
  runHooks(state, content, 'turn_end', 'enemy', rng, emit)
  checkWinLoss(state, emit)
}

export function discardDownToHandSize(state: BattleState, emit: Emit): void {
  while (state.player.hand.length > state.player.handSize) {
    const card = state.player.hand.shift()!
    state.player.discard.push(card)
    emit({ type: 'discard', side: 'player', uid: card.uid, cardId: card.cardId })
  }
}
