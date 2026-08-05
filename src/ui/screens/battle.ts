import { loadContent } from '../../data-loader/loadContent'
import { startBattle, playCard, endTurn, type PlayerStats } from '../../engine/battle'
import { pileCounts } from '../../engine/deck'
import type { BattleState, CardInstance, Content, EffectInstance } from '../../engine/types'
import type { BattleEvent } from '../../engine/events'
import { createCardElement } from '../cardView'
import { createArtElement } from '../artUrl'
import { onHold, onTap } from '../touch'
import { statBar, pipRow, fillMeter, statusBadge, iconBadge, bottomSheet, flashMessage } from '../components'

const LOG_CAP = 100
const ENEMY_HAND_SIZE = 3
const LOW_HP_BARK_THRESHOLD = 0.4

export interface BattleOutcome {
  outcome: 'win' | 'loss'
  hpRemaining: number
}

export interface BattleScreenOptions {
  enemyId: string
  playerStats: PlayerStats
  playerLevel?: number
  deck: string[]
  initialPlayerEffects?: EffectInstance[]
  onExit: (result: BattleOutcome) => void
}

// win/loss/damage/heal/effect changes matter more than draws/shuffles when
// picking the single line shown in the compact #recentLog readout.
const PRIORITY: Partial<Record<BattleEvent['type'], number>> = {
  win: 100,
  loss: 100,
  damage: 80,
  heal: 70,
  apply_effect: 60,
  counter_triggered: 55,
}

function glyphFor(effectId: string): string {
  return effectId
    .split('_')
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 3)
}

function sideLabel(side: 'player' | 'enemy', enemyName: string): string {
  return side === 'player' ? 'Sinbad' : enemyName
}

// Covers the full BattleEvent union so the log drawer can show everything
// the engine emits, not just damage/heal/win/loss. Returns null for events
// that are pure noise (nothing a tester needs to see).
function describeEvent(ev: BattleEvent, content: Content, enemyName: string): string | null {
  const cardName = (id: string) => content.cards.get(id)?.name ?? id
  const effectName = (id: string) => content.effects.get(id)?.name ?? id

  switch (ev.type) {
    case 'battle_start':
      return `The tale begins — Sinbad ${ev.playerHp} HP vs ${enemyName} ${ev.enemyHp} HP.`
    case 'turn_start':
      return `— Turn ${ev.turn} (${sideLabel(ev.side, enemyName)}) —`
    case 'turn_end':
      return null
    case 'draw':
      return `${sideLabel(ev.side, enemyName)} draws ${cardName(ev.cardId)}.`
    case 'play_card':
      return `${sideLabel(ev.side, enemyName)} plays ${cardName(ev.cardId)}.`
    case 'enemy_play':
      return `${enemyName} plays ${cardName(ev.cardId)}.`
    case 'damage':
      return `${sideLabel(ev.target, enemyName)} takes ${ev.final} ${ev.dtype.replace('_', ' ')} damage${ev.absorbed > 0 ? ` (${ev.absorbed} absorbed)` : ''}.`
    case 'heal':
      return `${sideLabel(ev.target, enemyName)} heals ${ev.amount}.`
    case 'apply_effect':
      return `${sideLabel(ev.target, enemyName)} gains ${ev.stacks} ${effectName(ev.effectId)}.`
    case 'effect_tick':
      return `${effectName(ev.effectId)} triggers on ${sideLabel(ev.side, enemyName)}.`
    case 'effect_stacks_changed':
      return `${sideLabel(ev.side, enemyName)}'s ${effectName(ev.effectId)} is now ×${ev.stacks}.`
    case 'effect_expired':
      return `${sideLabel(ev.side, enemyName)}'s ${effectName(ev.effectId)} fades.`
    case 'resource':
      return `${sideLabel(ev.side, enemyName)} ${ev.delta >= 0 ? '+' : ''}${ev.delta} ${ev.resource.replace('_', ' ')} (now ${ev.now}).`
    case 'counter_set':
      return `Sinbad sets ${cardName(ev.cardId)} face-down.`
    case 'counter_triggered':
      return `${cardName(ev.cardId)} triggers${ev.negated ? ' and negates the attack' : ''}.`
    case 'discard':
      return `${sideLabel(ev.side, enemyName)} discards ${cardName(ev.cardId)}.`
    case 'exhaust':
      return `${cardName(ev.cardId)} is exhausted.`
    case 'shuffle':
      return `${sideLabel(ev.side, enemyName)}'s discard is shuffled into the draw pile.`
    case 'hand_overflow':
      return `${cardName(ev.cardId)} is lost — hand is full.`
    case 'win':
      return 'Victory!'
    case 'loss':
      return 'Sinbad falls.'
  }
}

export function mountBattleScreen(root: HTMLElement, opts: BattleScreenOptions): () => void {
  const content = loadContent()

  let state: BattleState
  let selectedUid: number | null = null
  let logEntries: string[] = []

  let lowHpBarked = false

  root.innerHTML = `
    <div class="battle-screen" style="display:flex;flex-direction:column;height:100%;overflow:hidden;">
      <div id="enemyBanner" class="enemy-banner" style="padding:0.75rem 0.75rem 0;"></div>
      <div id="enemyHandStrip" class="enemy-hand-strip"></div>
      <div id="dialogueLine" class="battle-dialogue"></div>
      <div id="recentLog" style="padding:0.4rem 0.75rem;font-size:0.75rem;opacity:0.75;min-height:1.2em;"></div>
      <div style="flex:1;"></div>
      <div id="handStrip" class="hand-strip fanned"></div>
      <div id="iconBadgeRow" class="icon-badge-row"></div>
      <div id="hudBar" class="hud-bar"></div>
    </div>
  `

  const enemyBanner = root.querySelector<HTMLElement>('#enemyBanner')!
  const enemyHandStrip = root.querySelector<HTMLElement>('#enemyHandStrip')!
  const dialogueLine = root.querySelector<HTMLElement>('#dialogueLine')!
  const recentLog = root.querySelector<HTMLElement>('#recentLog')!
  const handStrip = root.querySelector<HTMLElement>('#handStrip')!
  const iconBadgeRow = root.querySelector<HTMLElement>('#iconBadgeRow')!
  const hudBar = root.querySelector<HTMLElement>('#hudBar')!

  function describeRecent(text: string): void {
    recentLog.textContent = text
  }

  let barkTimeoutId: ReturnType<typeof setTimeout> | undefined

  function bark(text: string): void {
    dialogueLine.textContent = text
  }

  // The frame story is Scheherazade narrating Sinbad's voyage to King
  // Shahryar (DESIGN.md §2) — so dialogue here is the King prompting with a
  // question and Scheherazade answering in narration, never Scheherazade
  // addressing Sinbad directly (that reads as her shouting orders at him).
  function barkExchange(kingLine: string, narrationLine: string): void {
    if (barkTimeoutId !== undefined) clearTimeout(barkTimeoutId)
    bark(kingLine)
    barkTimeoutId = setTimeout(() => bark(narrationLine), 1300)
  }

  function hitTargetsFrom(events: BattleEvent[]): Array<'player' | 'enemy'> {
    const seen = new Set<'player' | 'enemy'>()
    for (const ev of events) {
      if (ev.type === 'damage' && ev.final > 0) seen.add(ev.target)
    }
    return [...seen]
  }

  function triggerHitAnimation(target: 'player' | 'enemy'): void {
    if (target === 'enemy') {
      const wrap = enemyBanner.querySelector<HTMLElement>('.enemy-portrait-wrap')
      if (!wrap) return
      wrap.classList.remove('hit')
      void wrap.offsetWidth
      wrap.classList.add('hit')
      const streak = document.createElement('div')
      streak.className = 'slash-streak'
      wrap.appendChild(streak)
      streak.addEventListener('animationend', () => streak.remove())
    } else {
      hudBar.classList.remove('hit')
      void hudBar.offsetWidth
      hudBar.classList.add('hit')
    }
  }

  function revealEnemyPlays(events: BattleEvent[]): void {
    const plays = events.filter((ev) => ev.type === 'enemy_play')
    if (plays.length === 0) return
    const backs = [...enemyHandStrip.querySelectorAll<HTMLElement>('.card-back')]
    plays.forEach((ev, i) => {
      const back = backs[i % backs.length]
      if (!back) return
      const label = back.querySelector<HTMLElement>('.card-back-label')
      if (label) label.textContent = content.cards.get(ev.cardId)?.name ?? ev.cardId
      back.classList.remove('revealed')
      void back.offsetWidth
      back.classList.add('revealed')
    })
  }

  function maybeBarkLowHp(): void {
    if (lowHpBarked || state.player.hp <= 0) return
    if (state.player.hp / state.player.maxHp <= LOW_HP_BARK_THRESHOLD) {
      lowHpBarked = true
      barkExchange(
        `"Does he yet live?" the King asked, leaning forward.`,
        `"Barely," Scheherazade said. "Ya Allah [O God], Sinbad's strength was failing him."`,
      )
    }
  }

  function applyAndRender(events: BattleEvent[]): void {
    summarizeEvents(events)
    render()
    for (const target of hitTargetsFrom(events)) triggerHitAnimation(target)
    revealEnemyPlays(events)
    maybeBarkLowHp()
  }

  function summarizeEvents(events: BattleEvent[]): void {
    const enemyName = content.enemies.get(state.enemy.enemyId)!.name
    let best: { text: string; priority: number } | null = null

    for (const ev of events) {
      const text = describeEvent(ev, content, enemyName)
      if (text === null) continue
      logEntries.push(text)
      const priority = PRIORITY[ev.type] ?? 0
      if (!best || priority > best.priority) best = { text, priority }
    }

    if (logEntries.length > LOG_CAP) logEntries = logEntries.slice(-LOG_CAP)
    if (best) describeRecent(best.text)
  }

  function begin(): void {
    const result = startBattle({
      playerStats: opts.playerStats,
      deck: opts.deck,
      enemyId: opts.enemyId,
      content,
      seed: Math.floor(Date.now() % 1_000_000) + 1,
      initialPlayerEffects: opts.initialPlayerEffects,
    })
    state = result.state
    selectedUid = null
    logEntries = []
    lowHpBarked = false
    const enemyDef = content.enemies.get(opts.enemyId)!
    barkExchange(
      `"What creature bars his way now?" the King asked.`,
      `"${enemyDef.tier === 'boss' ? 'A terror' : 'A trial'}," Scheherazade said, "for Sinbad had come upon ${enemyDef.name}."`,
    )
    applyAndRender(result.events)
  }

  function affordability(cardId: string): { ok: boolean; missingAp: number; missingMana: number } {
    const def = content.cards.get(cardId)!
    const missingAp = Math.max(0, def.cost.ap - state.player.ap)
    const missingMana = Math.max(0, def.cost.mana - state.player.mana)
    return { ok: missingAp === 0 && missingMana === 0, missingAp, missingMana }
  }

  function onCardTap(inst: CardInstance, cardEl: HTMLElement): void {
    if (state.phase !== 'player') return

    const aff = affordability(inst.cardId)
    if (!aff.ok) {
      const parts: string[] = []
      if (aff.missingAp > 0) parts.push(`${aff.missingAp} AP`)
      if (aff.missingMana > 0) parts.push(`${aff.missingMana} Mana`)
      flashMessage(cardEl, `Needs ${parts.join(' + ')}`)
      cardEl.classList.remove('denied')
      void cardEl.offsetWidth // restart the shake animation on repeat taps
      cardEl.classList.add('denied')
      return
    }

    if (selectedUid === inst.uid) {
      const res = playCard(state, content, inst.uid)
      selectedUid = null
      if ('error' in res) {
        const msg = `Can't play that: ${res.error.replace(/_/g, ' ')}.`
        logEntries.push(msg)
        describeRecent(msg)
        render()
      } else {
        applyAndRender(res.events)
      }
    } else {
      selectedUid = inst.uid
      render()
    }
  }

  function showZoom(cardDef: Parameters<typeof createCardElement>[0]): void {
    const overlay = document.createElement('div')
    overlay.className = 'zoom-overlay'
    overlay.appendChild(createCardElement(cardDef, { zoom: true }))
    document.body.appendChild(overlay)
    onTap(overlay, () => overlay.remove())
  }

  function showPileList(title: string, cards: CardInstance[]): void {
    bottomSheet(title, cards.length, (body) => {
      const list = document.createElement('ul')
      if (cards.length === 0) {
        const li = document.createElement('li')
        li.textContent = '—'
        list.appendChild(li)
      }
      for (const c of cards) {
        const li = document.createElement('li')
        li.textContent = content.cards.get(c.cardId)?.name ?? c.cardId
        list.appendChild(li)
      }
      body.appendChild(list)
    })
  }

  function showLogDrawer(): void {
    bottomSheet('Recent Events', logEntries.length, (body) => {
      const list = document.createElement('ul')
      if (logEntries.length === 0) {
        const li = document.createElement('li')
        li.textContent = '—'
        list.appendChild(li)
      }
      for (const entry of [...logEntries].reverse()) {
        const li = document.createElement('li')
        li.textContent = entry
        list.appendChild(li)
      }
      body.appendChild(list)
    })
  }

  function renderEnemyBanner(): void {
    const enemyDef = content.enemies.get(state.enemy.enemyId)!
    enemyBanner.innerHTML = ''

    const portraitWrap = document.createElement('div')
    portraitWrap.className = 'enemy-portrait-wrap'
    portraitWrap.appendChild(createArtElement(enemyDef.art_ref, enemyDef.name, 'enemy-portrait'))

    const turnBadge = document.createElement('div')
    turnBadge.className = 'enemy-turn-badge'
    turnBadge.textContent = `Turn ${state.turn}`
    portraitWrap.appendChild(turnBadge)

    const nameplate = document.createElement('div')
    nameplate.className = 'enemy-nameplate'
    const nameEl = document.createElement('div')
    nameEl.className = 'enemy-name'
    nameEl.textContent = enemyDef.name
    nameplate.appendChild(nameEl)

    const subtitleText = [
      enemyDef.night ? `Night ${enemyDef.night}` : null,
      enemyDef.tier,
      enemyDef.level !== undefined ? `Lv ${enemyDef.level}` : null,
    ]
      .filter(Boolean)
      .join(' · ')
    if (subtitleText) {
      const subtitle = document.createElement('div')
      subtitle.className = 'enemy-subtitle'
      subtitle.textContent = subtitleText
      nameplate.appendChild(subtitle)
    }

    nameplate.appendChild(statBar(state.enemy.hp, state.enemy.maxHp, { color: 'var(--madder)', showNumbers: true }))
    portraitWrap.appendChild(nameplate)
    enemyBanner.appendChild(portraitWrap)

    const badgeRow = document.createElement('div')
    badgeRow.className = 'status-badge-row'
    for (const e of state.enemy.effects) {
      const def = content.effects.get(e.effectId)
      badgeRow.appendChild(statusBadge(glyphFor(e.effectId), e.stacks, def?.kind ?? 'neutral', def?.name ?? e.effectId))
    }
    enemyBanner.appendChild(badgeRow)
  }

  // The enemy has no real "hand" in the engine — moves come off its deck via
  // the AI. This is a purely decorative fan of face-down backs so the enemy
  // reads as a combatant holding cards, not just a health bar; revealEnemyPlays
  // flips one to show the name after an enemy_play event.
  function renderEnemyHandStrip(): void {
    enemyHandStrip.innerHTML = ''
    for (let i = 0; i < ENEMY_HAND_SIZE; i++) {
      const back = document.createElement('div')
      back.className = 'card card-back'
      const label = document.createElement('div')
      label.className = 'card-back-label'
      back.appendChild(label)
      enemyHandStrip.appendChild(back)
    }
  }

  function renderHandStrip(): void {
    handStrip.classList.toggle('active', state.phase === 'player')
    handStrip.innerHTML = ''

    state.player.hand.forEach((inst, i) => {
      const def = content.cards.get(inst.cardId)!
      const el = createCardElement(def)
      el.style.setProperty('--i', String(i))
      if (inst.uid === selectedUid) el.classList.add('selected')
      if (!affordability(inst.cardId).ok) el.classList.add('unaffordable')

      let heldTriggered = false
      onHold(
        el,
        () => {
          heldTriggered = true
          showZoom(def)
        },
        { ms: 350 },
      )
      onTap(el, () => {
        if (heldTriggered) {
          heldTriggered = false
          return
        }
        onCardTap(inst, el)
      })

      handStrip.appendChild(el)
    })
  }

  function renderIconBadges(): void {
    iconBadgeRow.innerHTML = ''
    const counts = pileCounts(state)
    const defs: Array<[string, number, CardInstance[]]> = [
      ['Draw', counts.drawPile, state.player.drawPile],
      ['Discard', counts.discard, state.player.discard],
      ['Exhaust', counts.exhaust, state.player.exhaust],
      ['Set', counts.counters, state.player.counters],
    ]
    for (const [label, count, cards] of defs) {
      iconBadgeRow.appendChild(iconBadge(label, count, { onTap: () => showPileList(label, cards) }))
    }
    iconBadgeRow.appendChild(iconBadge('Log', logEntries.length, { onTap: showLogDrawer }))
  }

  function renderHud(): void {
    hudBar.innerHTML = ''

    const row1 = document.createElement('div')
    row1.className = 'hud-row'
    row1.appendChild(pipRow(state.player.ap, state.player.apBase, { color: 'var(--gold)' }))
    row1.appendChild(statBar(state.player.hp, state.player.maxHp, { color: 'var(--turquoise)', showNumbers: true }))
    row1.appendChild(
      fillMeter(state.player.mana, state.player.manaMax, {
        color: 'var(--turquoise)',
        label: `${state.player.mana}/${state.player.manaMax}`,
      }),
    )
    hudBar.appendChild(row1)

    if (state.player.effects.length > 0) {
      const badgeRow = document.createElement('div')
      badgeRow.className = 'status-badge-row'
      for (const e of state.player.effects) {
        const def = content.effects.get(e.effectId)
        badgeRow.appendChild(
          statusBadge(glyphFor(e.effectId), e.stacks, def?.kind ?? 'neutral', def?.name ?? e.effectId),
        )
      }
      hudBar.appendChild(badgeRow)
    }

    const row2 = document.createElement('div')
    row2.className = 'hud-row'
    const turnText = document.createElement('span')
    turnText.className = 'hud-turn-text'
    turnText.textContent = opts.playerLevel !== undefined ? `Turn ${state.turn} · Lv ${opts.playerLevel}` : `Turn ${state.turn}`
    row2.appendChild(turnText)

    const endTurnBtn = document.createElement('button')
    endTurnBtn.textContent = 'End Turn'
    endTurnBtn.style.flex = '1'
    endTurnBtn.disabled = state.phase !== 'player'
    onTap(endTurnBtn, () => {
      const res = endTurn(state, content)
      applyAndRender(res.events)
    })
    row2.appendChild(endTurnBtn)
    hudBar.appendChild(row2)
  }

  function renderEndBanner(): void {
    const existing = root.querySelector('.end-banner')
    if (existing) existing.remove()
    if (state.phase !== 'over') return

    const won = state.result === 'win'
    const banner = document.createElement('div')
    banner.className = 'end-banner'
    banner.innerHTML = `<h2>${won ? 'Victory' : 'Defeat'}</h2>`
    const btn = document.createElement('button')
    btn.textContent = won ? 'Continue' : 'Return to the Manuscript'
    banner.appendChild(btn)
    onTap(btn, () => opts.onExit({ outcome: won ? 'win' : 'loss', hpRemaining: state.player.hp }))
    root.querySelector('.battle-screen')!.appendChild(banner)
  }

  function render(): void {
    renderEnemyBanner()
    renderEnemyHandStrip()
    renderHandStrip()
    renderIconBadges()
    renderHud()
    renderEndBanner()
  }

  begin()

  return function dispose(): void {
    if (barkTimeoutId !== undefined) clearTimeout(barkTimeoutId)
    root.innerHTML = ''
    document.querySelectorAll('.zoom-overlay, .sheet-overlay').forEach((el) => el.remove())
  }
}
