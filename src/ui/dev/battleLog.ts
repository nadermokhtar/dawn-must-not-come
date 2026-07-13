import { loadContent } from '../../data-loader/loadContent'
import { startBattle, playCard, endTurn, type BattleResult } from '../../engine/battle'
import type { BattleState } from '../../engine/types'
import type { BattleEvent } from '../../engine/events'
import { onTap } from '../touch'

const STARTER_DECK = [
  'sinbad_cutlass_strike',
  'sinbad_cutlass_strike',
  'sinbad_cutlass_strike',
  'sinbad_cutlass_strike',
  'sinbad_raise_shield',
  'sinbad_raise_shield',
  'sinbad_rigging_grab',
  'sinbad_rigging_grab',
  'sinbad_captains_rally',
  'sinbad_boarding_action',
  'sinbad_parry',
]

export function mountBattleLog(root: HTMLElement): void {
  const content = loadContent()
  let state: BattleState
  let log: string[] = []

  root.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;padding:0.5rem;gap:0.5rem;overflow:hidden;box-sizing:border-box;">
      <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
        <label>Enemy <select id="enemy"></select></label>
        <label>Seed <input id="seed" type="number" value="1" style="width:4rem;"></label>
        <button id="restart">Restart</button>
      </div>
      <div id="hp" style="font-family:monospace;white-space:pre-wrap;font-size:0.8rem;"></div>
      <div id="hand" style="display:flex;flex-wrap:wrap;gap:0.4rem;"></div>
      <button id="endTurn">End Turn</button>
      <pre id="log" style="flex:1;overflow-y:auto;background:#0b1330;padding:0.5rem;font-size:0.7rem;margin:0;"></pre>
    </div>
  `

  const enemySelect = root.querySelector<HTMLSelectElement>('#enemy')!
  for (const id of content.enemies.keys()) {
    const opt = document.createElement('option')
    opt.value = id
    opt.textContent = id
    enemySelect.appendChild(opt)
  }

  const seedInput = root.querySelector<HTMLInputElement>('#seed')!
  const restartBtn = root.querySelector<HTMLButtonElement>('#restart')!
  const endTurnBtn = root.querySelector<HTMLButtonElement>('#endTurn')!
  const hpEl = root.querySelector<HTMLElement>('#hp')!
  const handEl = root.querySelector<HTMLElement>('#hand')!
  const logEl = root.querySelector<HTMLElement>('#log')!

  function restart(): void {
    const enemyId = enemySelect.value || content.enemies.keys().next().value!
    const seed = Number(seedInput.value) || 1
    const result: BattleResult = startBattle({
      playerStats: { hp: 30, apBase: 2, mana: 0, manaMax: 2, handSize: 5 },
      deck: STARTER_DECK,
      enemyId,
      content,
      seed,
    })
    state = result.state
    log = []
    printEvents(result.events)
    render()
  }

  function printEvents(events: BattleEvent[]): void {
    for (const ev of events) log.push(formatEvent(ev))
    logEl.textContent = log.join('\n')
    logEl.scrollTop = logEl.scrollHeight
  }

  function render(): void {
    hpEl.textContent =
      `Player HP: ${state.player.hp}/${state.player.maxHp}  AP: ${state.player.ap}/${state.player.apBase}  Mana: ${state.player.mana}/${state.player.manaMax}\n` +
      `Enemy  HP: ${state.enemy.hp}/${state.enemy.maxHp}\n` +
      `Player effects: ${state.player.effects.map((e) => `${e.effectId}x${e.stacks}`).join(', ') || '—'}\n` +
      `Enemy effects:  ${state.enemy.effects.map((e) => `${e.effectId}x${e.stacks}`).join(', ') || '—'}\n` +
      `Phase: ${state.phase}${state.result ? ` (${state.result})` : ''}`

    handEl.innerHTML = ''
    for (const card of state.player.hand) {
      const def = content.cards.get(card.cardId)!
      const btn = document.createElement('button')
      const affordable = state.player.ap >= def.cost.ap && state.player.mana >= def.cost.mana
      btn.disabled = state.phase !== 'player' || !affordable
      const dmg = def.damage ? ` — ${def.damage.amount} ${def.damage.dtype}` : ''
      btn.textContent = `${def.name} (${def.cost.ap}AP/${def.cost.mana}M)${dmg}`
      onTap(btn, () => {
        const res = playCard(state, content, card.uid)
        if ('error' in res) {
          log.push(`! ${res.error}`)
          logEl.textContent = log.join('\n')
        } else {
          printEvents(res.events)
        }
        render()
      })
      handEl.appendChild(btn)
    }

    endTurnBtn.disabled = state.phase !== 'player'
  }

  onTap(restartBtn, restart)
  onTap(endTurnBtn, () => {
    const res = endTurn(state, content)
    printEvents(res.events)
    render()
  })

  restart()
}

function formatEvent(ev: BattleEvent): string {
  if (ev.type === 'damage') {
    return `damage: ${ev.source}→${ev.target} base ${ev.base} ${ev.dtype} ×${ev.multiplier} absorbed ${ev.absorbed} → ${ev.final}`
  }
  return JSON.stringify(ev)
}
