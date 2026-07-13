import type { BattleState, Content, DType, EffectInstance, Side } from './types'
import { combatantOf } from './types'
import type { Emit } from './events'
import type { Rng } from './rng'
import { applyDamage, applyHeal } from './damage'
import { drawCards } from './deck'

// The op vocabulary: the single place game verbs exist. Card effects, effect
// hooks, counters, and gimmicks all compile down to these ops — new content
// should be expressible as data using this vocabulary; if it can't, add one
// op here rather than special-casing a feature elsewhere.

export type SideToken = 'player' | 'enemy' | 'owner' | 'self' | 'opponent'
export type Amount = number | '$stacks'

export interface DealDamageOp {
  op: 'deal_damage'
  amount: Amount
  dtype: DType
  to: SideToken
}
export interface HealOp {
  op: 'heal'
  amount: Amount
  to: SideToken
}
export interface ApplyEffectOp {
  op: 'apply_effect'
  id: string
  stacks: number
  target: SideToken
}
export interface ChangeStacksOp {
  op: 'change_stacks'
  delta: number
}
export interface RemoveEffectOp {
  op: 'remove_effect'
  id: string
  target: SideToken
}
export interface ModifyResourceOp {
  op: 'modify_resource'
  resource: 'ap' | 'mana' | 'mana_max'
  delta: number
  target: SideToken
}
export interface DrawOp {
  op: 'draw'
  count: number
  target: SideToken
}
export interface NegateOp {
  op: 'negate'
}

export type GameOp =
  | DealDamageOp
  | HealOp
  | ApplyEffectOp
  | ChangeStacksOp
  | RemoveEffectOp
  | ModifyResourceOp
  | DrawOp
  | NegateOp

export interface OpFlags {
  negated: boolean
}

export interface OpContext {
  state: BattleState
  content: Content
  rng: Rng
  owner: Side
  emit: Emit
  effectInstance?: EffectInstance
  flags?: OpFlags
}

export function resolveSide(token: SideToken, ownerSide: Side): Side {
  switch (token) {
    case 'player':
      return 'player'
    case 'enemy':
      return 'enemy'
    case 'self':
    case 'owner':
      return ownerSide
    case 'opponent':
      return ownerSide === 'player' ? 'enemy' : 'player'
  }
}

function resolveAmount(amount: Amount, ctx: OpContext): number {
  if (amount === '$stacks') {
    if (!ctx.effectInstance) throw new Error('$stacks used outside an effect-hook context')
    return ctx.effectInstance.stacks
  }
  return amount
}

// Card data may use the shorthand `{apply, stacks, target}` for apply_effect;
// everything else uses the full `{op, ...}` form.
export function normalizeOp(raw: unknown): GameOp {
  const r = raw as Record<string, unknown>
  if (typeof r.apply === 'string') {
    return {
      op: 'apply_effect',
      id: r.apply,
      stacks: (r.stacks as number) ?? 1,
      target: (r.target as SideToken) ?? 'opponent',
    }
  }
  return r as unknown as GameOp
}

export function applyEffectStacks(
  state: BattleState,
  content: Content,
  target: Side,
  effectId: string,
  stacks: number,
  emit: Emit,
): void {
  const combatant = combatantOf(state, target)
  const def = content.effects.get(effectId)
  const max = def?.max_stacks

  let inst = combatant.effects.find((e) => e.effectId === effectId)
  if (!inst) {
    inst = { effectId, stacks: 0 }
    combatant.effects.push(inst)
  }
  inst.stacks += stacks
  if (max !== undefined) inst.stacks = Math.min(inst.stacks, max)
  inst.stacks = Math.max(0, inst.stacks)

  emit({ type: 'apply_effect', target, effectId, stacks })
  emit({ type: 'effect_stacks_changed', side: target, effectId, stacks: inst.stacks })
}

export function removeEffectInstance(state: BattleState, target: Side, effectId: string, emit: Emit): void {
  const combatant = combatantOf(state, target)
  const idx = combatant.effects.findIndex((e) => e.effectId === effectId)
  if (idx === -1) return
  combatant.effects.splice(idx, 1)
  emit({ type: 'effect_expired', side: target, effectId })
}

function execOp(op: GameOp, ctx: OpContext): void {
  switch (op.op) {
    case 'deal_damage': {
      const amount = resolveAmount(op.amount, ctx)
      const target = resolveSide(op.to, ctx.owner)
      const source: Side = target === 'player' ? 'enemy' : 'player'
      applyDamage(ctx.state, ctx.content, source, target, op.dtype, amount, ctx.emit)
      break
    }
    case 'heal': {
      const amount = resolveAmount(op.amount, ctx)
      const target = resolveSide(op.to, ctx.owner)
      applyHeal(ctx.state, target, amount, ctx.emit)
      break
    }
    case 'apply_effect': {
      const target = resolveSide(op.target, ctx.owner)
      applyEffectStacks(ctx.state, ctx.content, target, op.id, op.stacks, ctx.emit)
      break
    }
    case 'change_stacks': {
      if (!ctx.effectInstance) throw new Error('change_stacks used outside an effect-hook context')
      ctx.effectInstance.stacks += op.delta
      ctx.emit({
        type: 'effect_stacks_changed',
        side: ctx.owner,
        effectId: ctx.effectInstance.effectId,
        stacks: ctx.effectInstance.stacks,
      })
      if (ctx.effectInstance.stacks <= 0) {
        const def = ctx.content.effects.get(ctx.effectInstance.effectId)
        if (def?.remove_at_zero ?? true) {
          removeEffectInstance(ctx.state, ctx.owner, ctx.effectInstance.effectId, ctx.emit)
        }
      }
      break
    }
    case 'remove_effect': {
      const target = resolveSide(op.target, ctx.owner)
      removeEffectInstance(ctx.state, target, op.id, ctx.emit)
      break
    }
    case 'modify_resource': {
      const target = resolveSide(op.target, ctx.owner)
      const combatant = combatantOf(ctx.state, target)
      let now: number
      switch (op.resource) {
        case 'ap':
          combatant.ap = Math.max(0, combatant.ap + op.delta)
          now = combatant.ap
          break
        case 'mana':
          combatant.mana = Math.max(0, combatant.mana + op.delta)
          now = combatant.mana
          break
        case 'mana_max':
          combatant.manaMax = Math.max(0, combatant.manaMax + op.delta)
          now = combatant.manaMax
          break
      }
      ctx.emit({ type: 'resource', side: target, resource: op.resource, delta: op.delta, now })
      break
    }
    case 'draw': {
      drawCards(ctx.state, op.count, ctx.rng, ctx.emit)
      break
    }
    case 'negate': {
      if (ctx.flags) ctx.flags.negated = true
      break
    }
  }
}

export function runOps(rawOps: unknown[], ctx: OpContext): void {
  for (const raw of rawOps) {
    execOp(normalizeOp(raw), ctx)
  }
}
