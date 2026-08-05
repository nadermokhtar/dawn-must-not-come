export type Side = 'player' | 'enemy'

export type DType = 'steel' | 'true_strike' | 'ifrit_flame' | 'tide' | 'storm' | 'serpent_venom'

export type CardType = 'attack' | 'spell' | 'counter' | 'equipment' | 'curse' | 'item'

export interface CardInstance {
  uid: number
  cardId: string
}

export interface EffectInstance {
  effectId: string
  stacks: number
}

export interface CombatantState {
  hp: number
  maxHp: number
  ap: number
  apBase: number
  mana: number
  manaMax: number
  effects: EffectInstance[]
}

export interface PlayerState extends CombatantState {
  drawPile: CardInstance[]
  hand: CardInstance[]
  discard: CardInstance[]
  exhaust: CardInstance[]
  counters: CardInstance[]
  handSize: number
}

export interface EnemyState extends CombatantState {
  enemyId: string
  deckCursor: number
}

export interface BattleState {
  turn: number
  phase: 'player' | 'over'
  player: PlayerState
  enemy: EnemyState
  rngState: number
  result?: 'win' | 'loss'
  nextUid: number
}

export function combatantOf(state: BattleState, side: Side): CombatantState {
  return side === 'player' ? state.player : state.enemy
}

// --- Content (data-driven definitions loaded from /data) ---

export interface CardCost {
  ap: number
  mana: number
}

export interface CardDamage {
  amount: number
  dtype: DType
}

export interface CounterMatch {
  action_type?: CardType
  dtype?: DType
  tag?: string
}

export interface CardCounter {
  match: CounterMatch
  negate?: boolean
  effects?: unknown[]
}

export interface CardDef {
  id: string
  class?: string
  name: string
  type: CardType
  cost: CardCost
  damage?: CardDamage
  effects?: unknown[]
  draw?: number
  exhaust?: boolean
  tags?: string[]
  counter?: CardCounter
  stars?: number
  upgrades?: string[]
  rarity?: string
  flavor?: string
  art_ref?: string
}

export interface EnemyAI {
  mode?: 'sequential' | 'random'
  weights?: number[]
  moves_per_turn?: number
}

export interface EnemyDef {
  id: string
  name: string
  night?: number
  tier?: string
  level?: number
  hp: number
  resist: DType[]
  weak: DType[]
  deck: string[]
  ai?: EnemyAI
  gimmick?: string
  first_move?: boolean
  story_fork_id?: string
  art_ref?: string
}

export type TriggerPoint =
  | 'battle_start'
  | 'turn_start'
  | 'turn_end'
  | 'card_played'
  | 'damage_taken'
  | 'battle_end'

export interface OpCondition {
  turn_gte?: number
  hp_pct_lte?: number
  stacks_gte?: number
  chance?: number
}

export interface EffectHook {
  on: TriggerPoint
  who?: 'owner' | 'opponent'
  when?: OpCondition
  do: unknown[]
}

export interface EffectModifier {
  pipeline: 'incoming_damage' | 'outgoing_damage'
  op: 'absorb_stacks' | 'add_flat' | 'multiply'
  value?: number
  ignore_dtypes?: DType[]
}

export interface EffectDef {
  id: string
  name: string
  kind: 'buff' | 'debuff' | 'neutral'
  max_stacks?: number
  permanent?: boolean
  remove_at_zero?: boolean
  hooks?: EffectHook[]
  modifiers?: EffectModifier[]
}

export type VerseKind = 'battle' | 'shop' | 'upgrade' | 'remove' | 'blessing' | 'chest' | 'event' | 'bank' | 'boss'

export interface VerseDef {
  id: string
  kind: VerseKind
  night: number[]
  name: string
  narration: string
  weight?: number
  mustCrossOut?: boolean
  reshuffle?: boolean
  enemyPool?: string[]
}

export interface BlessingDef {
  id: string
  name: string
  narration: string
  effectId: string
  stacks: number
  art_ref?: string
}

export interface Content {
  cards: Map<string, CardDef>
  enemies: Map<string, EnemyDef>
  effects: Map<string, EffectDef>
  verses: Map<string, VerseDef>
  blessings: Map<string, BlessingDef>
}
