import type { BattleState, CardDef, Content, CounterMatch } from './types'
import type { Rng } from './rng'
import type { Emit } from './events'
import { runOps, type OpContext, type OpFlags } from './primitives'

export type SetCounterResult = { error: string } | { ok: true }

export function setCounter(state: BattleState, content: Content, handUid: number, emit: Emit): SetCounterResult {
  const idx = state.player.hand.findIndex((c) => c.uid === handUid)
  if (idx === -1) return { error: 'not_in_hand' }
  const inst = state.player.hand[idx]!
  const cardDef = content.cards.get(inst.cardId)
  if (!cardDef || cardDef.type !== 'counter' || !cardDef.counter) return { error: 'not_a_counter' }
  if (state.player.ap < cardDef.cost.ap) return { error: 'insufficient_ap' }
  if (state.player.mana < cardDef.cost.mana) return { error: 'insufficient_mana' }

  state.player.ap -= cardDef.cost.ap
  state.player.mana -= cardDef.cost.mana
  state.player.hand.splice(idx, 1)
  state.player.counters.push(inst)
  emit({ type: 'counter_set', uid: inst.uid, cardId: inst.cardId })
  return { ok: true }
}

function matchesCounter(match: CounterMatch, moveCard: CardDef): boolean {
  if (match.action_type && match.action_type !== moveCard.type) return false
  if (match.dtype && match.dtype !== moveCard.damage?.dtype) return false
  if (match.tag && !(moveCard.tags ?? []).includes(match.tag)) return false
  return true
}

// Scans set counters in the order they were placed; the first match
// triggers, resolves, and is discarded. Returns whether the triggering
// action was negated.
export function checkCounters(
  state: BattleState,
  content: Content,
  moveCard: CardDef,
  rng: Rng,
  emit: Emit,
): boolean {
  for (let i = 0; i < state.player.counters.length; i++) {
    const inst = state.player.counters[i]!
    const counterDef = content.cards.get(inst.cardId)
    if (!counterDef?.counter) continue
    if (!matchesCounter(counterDef.counter.match, moveCard)) continue

    state.player.counters.splice(i, 1)
    state.player.discard.push(inst)

    const flags: OpFlags = { negated: false }
    const ctx: OpContext = { state, content, rng, owner: 'player', emit, flags }
    runOps(counterDef.counter.effects ?? [], ctx)

    const negated = counterDef.counter.negate === true || flags.negated
    emit({ type: 'counter_triggered', uid: inst.uid, cardId: inst.cardId, negated })
    return negated
  }
  return false
}
