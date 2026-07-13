import type { Side, DType } from './types'

export type BattleEvent =
  | { type: 'battle_start'; playerHp: number; enemyHp: number }
  | { type: 'turn_start'; turn: number; side: Side }
  | { type: 'turn_end'; turn: number; side: Side }
  | { type: 'draw'; side: Side; cardId: string; uid: number }
  | { type: 'play_card'; side: Side; cardId: string; uid: number }
  | { type: 'enemy_play'; cardId: string }
  | {
      type: 'damage'
      source: Side
      target: Side
      dtype: DType
      base: number
      multiplier: number
      absorbed: number
      final: number
    }
  | { type: 'heal'; target: Side; amount: number }
  | { type: 'apply_effect'; target: Side; effectId: string; stacks: number }
  | { type: 'effect_tick'; side: Side; effectId: string }
  | { type: 'effect_stacks_changed'; side: Side; effectId: string; stacks: number }
  | { type: 'effect_expired'; side: Side; effectId: string }
  | { type: 'resource'; side: Side; resource: 'ap' | 'mana' | 'mana_max'; delta: number; now: number }
  | { type: 'counter_set'; uid: number; cardId: string }
  | { type: 'counter_triggered'; uid: number; cardId: string; negated: boolean }
  | { type: 'discard'; side: Side; uid: number; cardId: string }
  | { type: 'exhaust'; side: Side; uid: number; cardId: string }
  | { type: 'shuffle'; side: Side }
  | { type: 'hand_overflow'; side: Side; cardId: string; uid: number }
  | { type: 'win' }
  | { type: 'loss' }

export type Emit = (event: BattleEvent) => void
