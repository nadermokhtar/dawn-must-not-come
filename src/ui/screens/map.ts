import type { Content, VerseDef, VerseKind } from '../../engine/types'
import {
  XP_TO_LEVEL,
  type RunState,
  buyCard,
  cardPrice,
  enterVerse,
  grantBlessing,
  removeCard,
  removePrice,
  resolveChest,
  rollVerseOptions,
  upgradeCard,
  upgradePrice,
} from '../../engine/run'
import { createRng, deriveSeed } from '../../engine/rng'
import { createArtElement } from '../artUrl'
import { onTap } from '../touch'
import { bottomSheet, flashMessage, iconBadge, statBar } from '../components'

export interface MapScreenHandlers {
  onBattleVerse: (enemyId: string) => void
}

const KIND_LABEL: Record<VerseKind, string> = {
  battle: 'Battle',
  shop: 'Bazaar',
  upgrade: 'Calligrapher',
  remove: 'House of Forgetting',
  blessing: 'Blessing',
  chest: 'Chest',
  event: 'Event',
  bank: 'Bank',
  boss: 'Boss',
}

export function mountMapScreen(root: HTMLElement, run: RunState, content: Content, handlers: MapScreenHandlers): () => void {
  let narration = '"The tale continues," said Scheherazade, "though the King grows restless for what comes next."'
  let options: VerseDef[] = []

  root.innerHTML = `
    <div class="map-screen" style="display:flex;flex-direction:column;height:100%;overflow:hidden;">
      <div id="mapHeader" class="map-header"></div>
      <div id="mapNarration" class="map-narration"></div>
      <div style="flex:1;"></div>
      <div id="verseRow" class="verse-row"></div>
    </div>
  `

  const mapHeader = root.querySelector<HTMLElement>('#mapHeader')!
  const mapNarration = root.querySelector<HTMLElement>('#mapNarration')!
  const verseRow = root.querySelector<HTMLElement>('#verseRow')!

  function renderHeader(): void {
    mapHeader.innerHTML = ''

    const title = document.createElement('div')
    title.className = 'map-title'
    title.textContent = `Night ${run.night} — Page ${run.page}/${run.pagesInNight}`
    mapHeader.appendChild(title)

    const statsRow = document.createElement('div')
    statsRow.className = 'map-stats-row'

    const hpWrap = document.createElement('div')
    hpWrap.className = 'map-stat'
    const hpLabel = document.createElement('span')
    hpLabel.className = 'map-stat-label'
    hpLabel.textContent = 'HP'
    hpWrap.appendChild(hpLabel)
    hpWrap.appendChild(statBar(run.hp, run.maxHp, { color: 'var(--turquoise)', showNumbers: true }))
    statsRow.appendChild(hpWrap)

    statsRow.appendChild(iconBadge('Dinars', run.dinars))
    statsRow.appendChild(iconBadge('Wonder', run.wonder))
    statsRow.appendChild(iconBadge('Mercy', run.mercy))
    mapHeader.appendChild(statsRow)

    const levelRow = document.createElement('div')
    levelRow.className = 'map-stats-row'
    const levelWrap = document.createElement('div')
    levelWrap.className = 'map-stat'
    const levelLabel = document.createElement('span')
    levelLabel.className = 'map-stat-label'
    levelLabel.textContent = `Lv ${run.level}`
    levelWrap.appendChild(levelLabel)
    levelWrap.appendChild(statBar(run.xp, XP_TO_LEVEL, { color: 'var(--gold)', showNumbers: true }))
    levelRow.appendChild(levelWrap)
    mapHeader.appendChild(levelRow)
  }

  function renderNarration(): void {
    mapNarration.innerHTML = ''
    mapNarration.appendChild(createArtElement('keyart/scheherazade_king.png', 'Scheherazade and the King', 'narration-portrait'))
    const text = document.createElement('div')
    text.className = 'narration-text'
    text.textContent = narration
    mapNarration.appendChild(text)
  }

  function renderVerseRow(): void {
    verseRow.innerHTML = ''
    for (const verse of options) {
      const tile = document.createElement('button')
      tile.className = `verse-tile kind-${verse.kind}`

      tile.appendChild(createArtElement(undefined, verse.name, 'verse-tile-art'))

      const name = document.createElement('div')
      name.className = 'verse-tile-name'
      name.textContent = verse.name
      tile.appendChild(name)

      const kind = document.createElement('div')
      kind.className = 'verse-tile-kind'
      kind.textContent = KIND_LABEL[verse.kind]
      tile.appendChild(kind)

      const enemyLevel = verse.enemyPool?.[0] ? content.enemies.get(verse.enemyPool[0])?.level : undefined
      if (enemyLevel !== undefined) {
        const levelBadge = document.createElement('div')
        levelBadge.className = 'verse-tile-level'
        levelBadge.textContent = `Lv ${enemyLevel}`
        tile.appendChild(levelBadge)
      }

      onTap(tile, () => selectVerse(verse))
      verseRow.appendChild(tile)
    }
  }

  function render(): void {
    renderHeader()
    renderNarration()
    renderVerseRow()
  }

  function rollAndShow(): void {
    options = rollVerseOptions(run, content)
    render()
  }

  function continueAfterSheet(verse: VerseDef): void {
    narration = verse.narration
    rollAndShow()
  }

  function selectVerse(verse: VerseDef): void {
    if (verse.reshuffle) {
      enterVerse(run, verse.id, content)
      narration = verse.narration
      rollAndShow()
      return
    }

    const result = enterVerse(run, verse.id, content)
    render()

    switch (verse.kind) {
      case 'battle':
      case 'boss':
        handlers.onBattleVerse(result.enemyId!)
        return
      case 'shop':
        openBazaar(verse)
        return
      case 'upgrade':
        openCalligrapher(verse)
        return
      case 'remove':
        openHouseOfForgetting(verse)
        return
      case 'blessing':
        openJinni(verse)
        return
      case 'chest':
        openChest(verse)
        return
      default:
        continueAfterSheet(verse)
    }
  }

  function openBazaar(verse: VerseDef): void {
    const pool = [...content.cards.values()].filter(
      (c) => (c.class === run.classId || c.class === undefined) && c.type !== 'curse' && !c.id.endsWith('_plus'),
    )
    const rng = createRng(deriveSeed(run.seed, 'bazaar', run.night, run.page))
    const offerings = rng.shuffle(pool).slice(0, 4)

    bottomSheet(verse.name, offerings.length, (body, close) => {
      appendNarrationLine(body, verse.narration)
      const list = document.createElement('div')
      list.className = 'economy-list'
      for (const card of offerings) {
        list.appendChild(economyRow(card.name, cardPrice(card.rarity), (rowBtn) => {
          const res = buyCard(run, card.id, content)
          if (res.ok) {
            flashMessage(rowBtn, 'Bought!')
            renderHeader()
            rowBtn.disabled = true
          } else {
            flashMessage(rowBtn, res.error === 'insufficient_dinars' ? 'Not enough dinars' : 'Unavailable')
          }
        }))
      }
      body.appendChild(list)
      appendLeaveButton(body, close, verse)
    })
  }

  function openCalligrapher(verse: VerseDef): void {
    const upgradeableIds = [...new Set(run.deck)].filter((id) => (content.cards.get(id)?.upgrades?.length ?? 0) > 0)

    bottomSheet(verse.name, upgradeableIds.length, (body, close) => {
      appendNarrationLine(body, verse.narration)
      const list = document.createElement('div')
      list.className = 'economy-list'
      for (const cardId of upgradeableIds) {
        const card = content.cards.get(cardId)!
        list.appendChild(economyRow(card.name, upgradePrice(), (rowBtn) => {
          const res = upgradeCard(run, cardId, content)
          if (res.ok) {
            flashMessage(rowBtn, 'Upgraded!')
            renderHeader()
            rowBtn.disabled = true
          } else {
            flashMessage(rowBtn, res.error === 'insufficient_dinars' ? 'Not enough dinars' : 'Unavailable')
          }
        }))
      }
      if (upgradeableIds.length === 0) {
        const p = document.createElement('p')
        p.textContent = 'Nothing in your deck is ready for the gold leaf yet.'
        list.appendChild(p)
      }
      body.appendChild(list)
      appendLeaveButton(body, close, verse)
    })
  }

  function openHouseOfForgetting(verse: VerseDef): void {
    const removableIds = [...new Set(run.deck)]

    bottomSheet(verse.name, removableIds.length, (body, close) => {
      appendNarrationLine(body, verse.narration)
      const list = document.createElement('div')
      list.className = 'economy-list'
      for (const cardId of removableIds) {
        const card = content.cards.get(cardId)
        if (!card) continue
        list.appendChild(economyRow(card.name, removePrice(), (rowBtn) => {
          const res = removeCard(run, cardId)
          if (res.ok) {
            flashMessage(rowBtn, 'Forgotten.')
            renderHeader()
            rowBtn.disabled = true
          } else {
            flashMessage(rowBtn, res.error === 'insufficient_dinars' ? 'Not enough dinars' : 'Unavailable')
          }
        }))
      }
      body.appendChild(list)
      appendLeaveButton(body, close, verse)
    })
  }

  function openJinni(verse: VerseDef): void {
    const available = [...content.blessings.values()].filter((b) => !run.blessings.includes(b.id))
    const rng = createRng(deriveSeed(run.seed, 'jinni', run.night, run.page))
    const chosen = available.length > 0 ? rng.pick(available) : undefined

    bottomSheet(verse.name, undefined, (body, close) => {
      appendNarrationLine(body, verse.narration)
      if (chosen) {
        grantBlessing(run, chosen.id, content)
        appendNarrationLine(body, chosen.narration)
      } else {
        appendNarrationLine(body, 'The Jinni has no ward left to give this night.')
      }
      appendLeaveButton(body, close, verse, 'Continue')
    })
  }

  function openChest(verse: VerseDef): void {
    const { dinars } = resolveChest(run)
    bottomSheet(verse.name, undefined, (body, close) => {
      appendNarrationLine(body, verse.narration)
      appendNarrationLine(body, `You find ${dinars} dinars within.`)
      appendLeaveButton(body, close, verse, 'Continue')
    })
  }

  function appendNarrationLine(body: HTMLElement, text: string): void {
    const p = document.createElement('p')
    p.className = 'sheet-narration'
    p.textContent = text
    body.appendChild(p)
  }

  function economyRow(label: string, price: number, onBuy: (btn: HTMLButtonElement) => void): HTMLElement {
    const row = document.createElement('div')
    row.className = 'economy-row'
    const text = document.createElement('span')
    text.textContent = `${label} — ${price} dinars`
    row.appendChild(text)
    const btn = document.createElement('button')
    btn.textContent = 'Take'
    onTap(btn, () => onBuy(btn))
    row.appendChild(btn)
    return row
  }

  function appendLeaveButton(body: HTMLElement, close: () => void, verse: VerseDef, label = 'Leave'): void {
    const btn = document.createElement('button')
    btn.textContent = label
    btn.className = 'sheet-leave-btn'
    onTap(btn, () => {
      close()
      continueAfterSheet(verse)
    })
    body.appendChild(btn)
  }

  rollAndShow()

  return function dispose(): void {
    root.innerHTML = ''
    document.querySelectorAll('.sheet-overlay').forEach((el) => el.remove())
  }
}
