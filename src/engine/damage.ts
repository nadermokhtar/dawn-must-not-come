import type { BattleState, Content, DType, Side } from './types'
import { combatantOf } from './types'
import type { Emit } from './events'

function applyOutgoingModifiers(state: BattleState, content: Content, side: Side, amount: number): number {
  let result = amount
  for (const inst of combatantOf(state, side).effects) {
    const def = content.effects.get(inst.effectId)
    if (!def?.modifiers) continue
    for (const mod of def.modifiers) {
      if (mod.pipeline !== 'outgoing_damage') continue
      if (mod.op === 'add_flat') result += mod.value ?? 0
      if (mod.op === 'multiply') result *= mod.value ?? 1
    }
  }
  return result
}

function applyIncomingModifiers(
  state: BattleState,
  content: Content,
  side: Side,
  dtype: DType,
  amount: number,
  emit: Emit,
): { amount: number; absorbed: number } {
  let result = amount
  let absorbed = 0
  const combatant = combatantOf(state, side)

  for (const inst of combatant.effects.slice()) {
    const def = content.effects.get(inst.effectId)
    if (!def?.modifiers) continue
    for (const mod of def.modifiers) {
      if (mod.pipeline !== 'incoming_damage') continue
      if (mod.ignore_dtypes?.includes(dtype)) continue

      if (mod.op === 'absorb_stacks') {
        const take = Math.min(inst.stacks, result)
        if (take <= 0) continue
        inst.stacks -= take
        result -= take
        absorbed += take
        emit({ type: 'effect_stacks_changed', side, effectId: inst.effectId, stacks: inst.stacks })
        if (inst.stacks <= 0 && (def.remove_at_zero ?? true)) {
          const idx = combatant.effects.findIndex((e) => e.effectId === inst.effectId)
          if (idx !== -1) combatant.effects.splice(idx, 1)
          emit({ type: 'effect_expired', side, effectId: inst.effectId })
        }
      }
      if (mod.op === 'add_flat') result += mod.value ?? 0
      if (mod.op === 'multiply') result *= mod.value ?? 1
    }
  }

  return { amount: Math.max(0, result), absorbed }
}

// The one pipeline for all damage: outgoing modifiers -> resist/weak ->
// floor (min 1 if positive) -> incoming modifiers (armor etc).
export function applyDamage(
  state: BattleState,
  content: Content,
  source: Side,
  target: Side,
  dtype: DType,
  baseAmount: number,
  emit: Emit,
): void {
  if (baseAmount <= 0) return

  const afterOutgoing = applyOutgoingModifiers(state, content, source, baseAmount)

  const enemyDef = target === 'enemy' ? content.enemies.get(state.enemy.enemyId) : undefined
  let multiplier = 1
  if (enemyDef?.resist.includes(dtype)) multiplier = 0.5
  if (enemyDef?.weak.includes(dtype)) multiplier = 2

  const afterMultiplier = afterOutgoing * multiplier
  const rounded = afterMultiplier > 0 ? Math.max(1, Math.floor(afterMultiplier)) : 0

  const { amount: final, absorbed } = applyIncomingModifiers(state, content, target, dtype, rounded, emit)

  const combatant = combatantOf(state, target)
  combatant.hp = Math.max(0, combatant.hp - final)

  emit({ type: 'damage', source, target, dtype, base: baseAmount, multiplier, absorbed, final })
  checkWinLoss(state, emit)
}

export function applyHeal(state: BattleState, target: Side, amount: number, emit: Emit): void {
  if (amount <= 0) return
  const combatant = combatantOf(state, target)
  combatant.hp = Math.min(combatant.maxHp, combatant.hp + amount)
  emit({ type: 'heal', target, amount })
}

// Routed through a function (rather than comparing state.phase inline) so
// TS re-reads the property fresh instead of holding onto a stale narrowed
// literal type across calls that mutate it, like checkWinLoss.
export function isBattleOver(state: BattleState): boolean {
  return state.phase === 'over'
}

export function checkWinLoss(state: BattleState, emit: Emit): void {
  if (state.phase === 'over') return
  if (state.enemy.hp <= 0) {
    state.phase = 'over'
    state.result = 'win'
    emit({ type: 'win' })
  } else if (state.player.hp <= 0) {
    state.phase = 'over'
    state.result = 'loss'
    emit({ type: 'loss' })
  }
}
