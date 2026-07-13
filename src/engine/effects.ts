import type { BattleState, Content, EffectInstance, OpCondition, Side, TriggerPoint } from './types'
import type { Rng } from './rng'
import type { Emit } from './events'
import { runOps, type OpContext } from './primitives'

function hookFires(who: 'owner' | 'opponent' | undefined, ownerSide: Side, activeSide: Side): boolean {
  const w = who ?? 'owner'
  return w === 'owner' ? activeSide === ownerSide : activeSide !== ownerSide
}

function matchesWhen(
  when: OpCondition | undefined,
  state: BattleState,
  ownerSide: Side,
  inst: EffectInstance,
  rng: Rng,
): boolean {
  if (!when) return true
  if (when.turn_gte !== undefined && state.turn < when.turn_gte) return false
  if (when.hp_pct_lte !== undefined) {
    const c = ownerSide === 'player' ? state.player : state.enemy
    if (c.hp / c.maxHp > when.hp_pct_lte) return false
  }
  if (when.stacks_gte !== undefined && inst.stacks < when.stacks_gte) return false
  if (when.chance !== undefined && rng.next() > when.chance) return false
  return true
}

// battle_start/battle_end have no natural "side" — every owner's hooks for
// that trigger fire once, regardless of `who` or the passed activeSide.
export function runHooks(
  state: BattleState,
  content: Content,
  trigger: TriggerPoint,
  activeSide: Side,
  rng: Rng,
  emit: Emit,
): void {
  const sideAgnostic = trigger === 'battle_start' || trigger === 'battle_end'

  for (const ownerSide of ['player', 'enemy'] as const) {
    const combatant = ownerSide === 'player' ? state.player : state.enemy
    for (const inst of combatant.effects.slice()) {
      const def = content.effects.get(inst.effectId)
      if (!def?.hooks) continue
      for (const hook of def.hooks) {
        if (hook.on !== trigger) continue
        if (!sideAgnostic && !hookFires(hook.who, ownerSide, activeSide)) continue
        if (!matchesWhen(hook.when, state, ownerSide, inst, rng)) continue

        emit({ type: 'effect_tick', side: ownerSide, effectId: inst.effectId })
        const ctx: OpContext = { state, content, rng, owner: ownerSide, emit, effectInstance: inst }
        runOps(hook.do, ctx)
      }
    }
  }
}
