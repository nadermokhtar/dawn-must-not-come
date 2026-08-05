import type { CardDef, Content, VerseDef, VerseKind } from '../../engine/types'
import { createInspectableCardElement } from '../cardView'
import {
  XP_TO_LEVEL,
  type RunState,
  buyCard,
  cardPrice,
  currentVerseOptions,
  depositBank,
  enterVerse,
  grantBlessing,
  removeCard,
  removePrice,
  resolveChest,
  resolveSealedJar,
  sampleClassCards,
  upgradeCard,
  upgradePrice,
  withdrawBank,
} from '../../engine/run'
import { createRng, deriveSeed } from '../../engine/rng'
import { createArtElement } from '../artUrl'
import { onTap } from '../touch'
import { ceremonyDialog, flashMessage, iconBadge, statBar } from '../components'
import { showMapHelp } from '../onboarding'

export interface MapScreenHandlers {
  onBattleVerse: (enemyId: string) => void
  onStateChange?: () => void
  onRestart: () => void
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

    const titleRow = document.createElement('div')
    titleRow.className = 'map-title-row'
    const title = document.createElement('div')
    title.className = 'map-title'
    title.textContent = `Night ${run.night} — Page ${run.page}/${run.pagesInNight}`
    titleRow.appendChild(title)

    const headerBtns = document.createElement('div')
    headerBtns.className = 'map-header-btns'
    const restartBtn = document.createElement('button')
    restartBtn.className = 'help-btn'
    restartBtn.textContent = '↻'
    restartBtn.title = 'Restart the run'
    onTap(restartBtn, handlers.onRestart)
    headerBtns.appendChild(restartBtn)
    const helpBtn = document.createElement('button')
    helpBtn.className = 'help-btn'
    helpBtn.textContent = '?'
    helpBtn.title = 'How to read the map'
    onTap(helpBtn, showMapHelp)
    headerBtns.appendChild(helpBtn)
    titleRow.appendChild(headerBtns)

    mapHeader.appendChild(titleRow)

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

    statsRow.appendChild(iconBadge('Dinars', run.dinars, { tooltip: 'Dinars: spend at the Bazaar, Calligrapher, or House of Forgetting.' }))
    statsRow.appendChild(
      iconBadge('Wonder', run.wonder, { tooltip: 'Wonder: rises with merciful/curious Story Fork choices — crosses a threshold for a bonus.' }),
    )
    statsRow.appendChild(
      iconBadge('Mercy', run.mercy, { tooltip: 'Mercy: rises with compassionate Story Fork choices — crosses a threshold for a bonus.' }),
    )
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

    handlers.onStateChange?.()
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
    options = currentVerseOptions(run, content)
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
        if (verse.id === 'verse_sealed_jar') openSealedJar(verse)
        else openChest(verse)
        return
      case 'bank':
        openBank(verse)
        return
      default:
        continueAfterSheet(verse)
    }
  }

  function openBazaar(verse: VerseDef): void {
    const offerings = sampleClassCards(run, content, 4, 'bazaar')

    ceremonyDialog({ title: verse.name, portraitLabel: 'Grimalkin Shop', ribbonColor: 'var(--gold)', closable: true }, (body, close) => {
      appendNarrationLine(body, verse.narration)
      const row = document.createElement('div')
      row.className = 'ceremony-choice-row'
      for (const card of offerings) {
        row.appendChild(
          economyCol(card, cardPrice(card.rarity), 'Take', (rowBtn) => {
            const res = buyCard(run, card.id, content)
            if (res.ok) {
              flashMessage(rowBtn, 'Bought!')
              renderHeader()
              rowBtn.disabled = true
            } else {
              flashMessage(rowBtn, res.error === 'insufficient_dinars' ? 'Not enough dinars' : 'Unavailable')
            }
          }),
        )
      }
      body.appendChild(row)
      appendLeaveButton(body, close, verse)
    })
  }

  function openCalligrapher(verse: VerseDef): void {
    const upgradeableIds = [...new Set(run.deck)].filter((id) => (content.cards.get(id)?.upgrades?.length ?? 0) > 0)

    ceremonyDialog({ title: verse.name, portraitLabel: 'The Calligrapher', ribbonColor: 'var(--gold)', closable: true }, (body, close) => {
      appendNarrationLine(body, verse.narration)
      if (upgradeableIds.length === 0) {
        appendNarrationLine(body, 'Nothing in your deck is ready for the gold leaf yet.')
      } else {
        const row = document.createElement('div')
        row.className = 'ceremony-choice-row'
        for (const cardId of upgradeableIds) {
          const card = content.cards.get(cardId)!
          // Show the upgraded face, not the current one — the point of
          // browsing here is seeing what the gold leaf buys.
          const upgraded = content.cards.get(card.upgrades![0]!) ?? card
          row.appendChild(
            economyCol(upgraded, upgradePrice(), 'Upgrade', (rowBtn) => {
              const res = upgradeCard(run, cardId, content)
              if (res.ok) {
                flashMessage(rowBtn, 'Upgraded!')
                renderHeader()
                rowBtn.disabled = true
              } else {
                flashMessage(rowBtn, res.error === 'insufficient_dinars' ? 'Not enough dinars' : 'Unavailable')
              }
            }),
          )
        }
        body.appendChild(row)
      }
      appendLeaveButton(body, close, verse)
    })
  }

  function openHouseOfForgetting(verse: VerseDef): void {
    const removableIds = [...new Set(run.deck)]

    ceremonyDialog(
      { title: verse.name, portraitLabel: 'House of Forgetting', ribbonColor: 'var(--copper-green)', closable: true },
      (body, close) => {
        appendNarrationLine(body, verse.narration)
        const row = document.createElement('div')
        row.className = 'ceremony-choice-row'
        for (const cardId of removableIds) {
          const card = content.cards.get(cardId)
          if (!card) continue
          row.appendChild(
            economyCol(card, removePrice(), 'Forget', (rowBtn) => {
              const res = removeCard(run, cardId)
              if (res.ok) {
                flashMessage(rowBtn, 'Forgotten.')
                renderHeader()
                rowBtn.disabled = true
              } else {
                flashMessage(rowBtn, res.error === 'insufficient_dinars' ? 'Not enough dinars' : 'Unavailable')
              }
            }),
          )
        }
        body.appendChild(row)
        appendLeaveButton(body, close, verse)
      },
    )
  }

  function openJinni(verse: VerseDef): void {
    const available = [...content.blessings.values()].filter((b) => !run.blessings.includes(b.id))
    const rng = createRng(deriveSeed(run.seed, 'jinni', run.night, run.page))
    const chosen = available.length > 0 ? rng.pick(available) : undefined

    ceremonyDialog({ title: verse.name, portraitLabel: 'The Jinni of the Lamp', ribbonColor: 'var(--turquoise)' }, (body, close) => {
      appendNarrationLine(body, verse.narration)
      const single = document.createElement('div')
      single.className = 'ceremony-single'
      if (chosen) {
        grantBlessing(run, chosen.id, content)
        single.appendChild(blessingIcon(chosen.name, chosen.art_ref))
        const name = document.createElement('strong')
        name.textContent = chosen.name
        single.appendChild(name)
        const desc = document.createElement('p')
        desc.className = 'sheet-narration'
        desc.textContent = chosen.narration
        single.appendChild(desc)
      } else {
        const desc = document.createElement('p')
        desc.className = 'sheet-narration'
        desc.textContent = 'The Jinni has no ward left to give this night.'
        single.appendChild(desc)
      }
      body.appendChild(single)
      appendLeaveButton(body, close, verse, 'Continue')
    })
  }

  function openChest(verse: VerseDef): void {
    const { dinars } = resolveChest(run)
    ceremonyDialog({ title: verse.name, portraitLabel: 'A Chest', ribbonColor: 'var(--gold)' }, (body, close) => {
      appendNarrationLine(body, verse.narration)
      const single = document.createElement('div')
      single.className = 'ceremony-single'
      single.appendChild(blessingIcon('Dinars', undefined))
      const desc = document.createElement('p')
      desc.className = 'sheet-narration'
      desc.textContent = `You find ${dinars} dinars within.`
      single.appendChild(desc)
      body.appendChild(single)
      appendLeaveButton(body, close, verse, 'Pick Up')
    })
  }

  function openSealedJar(verse: VerseDef): void {
    const outcome = resolveSealedJar(run, content)
    ceremonyDialog({ title: verse.name, portraitLabel: 'The Sealed Jar', ribbonColor: 'var(--madder)' }, (body, close) => {
      appendNarrationLine(body, verse.narration)
      const single = document.createElement('div')
      single.className = 'ceremony-single'
      if ('blessingId' in outcome) {
        const blessing = content.blessings.get(outcome.blessingId)
        single.appendChild(blessingIcon(blessing?.name ?? 'A Blessing', blessing?.art_ref))
        const desc = document.createElement('p')
        desc.className = 'sheet-narration'
        desc.textContent = blessing?.narration ?? 'A blessing slips free of the jar.'
        single.appendChild(desc)
      } else {
        const curse = content.cards.get(outcome.curseCardId)
        single.appendChild(blessingIcon(curse?.name ?? 'A Curse', curse?.art_ref))
        const desc = document.createElement('p')
        desc.className = 'sheet-narration'
        desc.textContent = `Something ill-tempered slips free — ${curse?.name ?? outcome.curseCardId} finds its way into the deck.`
        single.appendChild(desc)
      }
      body.appendChild(single)
      appendLeaveButton(body, close, verse, 'Continue')
    })
  }

  function openBank(verse: VerseDef): void {
    ceremonyDialog({ title: verse.name, portraitLabel: 'The Coin Djinn', ribbonColor: 'var(--turquoise)' }, (body, close) => {
      appendNarrationLine(body, verse.narration)

      const status = document.createElement('p')
      status.className = 'sheet-narration'
      const refreshStatus = () => {
        status.textContent = `Banked: ${run.bankedDinars} dinars · On hand: ${run.dinars} dinars.`
      }
      refreshStatus()
      body.appendChild(status)

      const actions = document.createElement('div')
      actions.className = 'ceremony-actions'

      const depositBtn = document.createElement('button')
      depositBtn.textContent = 'Deposit all'
      onTap(depositBtn, () => {
        const res = depositBank(run, run.dinars)
        if (res.ok) {
          refreshStatus()
          renderHeader()
        } else {
          flashMessage(depositBtn, 'Nothing to deposit')
        }
      })
      actions.appendChild(depositBtn)

      const withdrawBtn = document.createElement('button')
      withdrawBtn.textContent = 'Withdraw all (+20% interest)'
      onTap(withdrawBtn, () => {
        if (run.bankedDinars <= 0) {
          flashMessage(withdrawBtn, 'Nothing banked')
          return
        }
        const { dinars } = withdrawBank(run)
        flashMessage(withdrawBtn, `+${dinars} dinars!`)
        refreshStatus()
        renderHeader()
      })
      actions.appendChild(withdrawBtn)
      body.appendChild(actions)

      appendLeaveButton(body, close, verse, 'Leave')
    })
  }

  function appendNarrationLine(body: HTMLElement, text: string): void {
    const p = document.createElement('p')
    p.className = 'sheet-narration'
    p.textContent = text
    body.appendChild(p)
  }

  // A single non-card reward/loss (Blessing, Chest dinars, Sealed Jar curse)
  // shown as an icon circle — these aren't CardDef objects so they don't get
  // the full card face treatment, but still read as a "here's the thing"
  // moment consistent with the rest of the ceremony shell.
  function blessingIcon(label: string, artRef: string | undefined): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'ceremony-icon-circle'
    wrap.appendChild(createArtElement(artRef, label))
    return wrap
  }

  // Renders the actual card face (tap it to zoom for the full, unclamped
  // ability text) so players can see what they're buying/upgrading/forgetting,
  // not just its name — the price and action button sit below it. Columns lay
  // out side by side (via .ceremony-choice-row) so every option is visible
  // at once for easy comparison, matching the reference layout's proportions.
  function economyCol(card: CardDef, price: number, actionLabel: string, onBuy: (btn: HTMLButtonElement) => void): HTMLElement {
    const col = document.createElement('div')
    col.className = 'ceremony-choice-col'
    col.appendChild(createInspectableCardElement(card))

    const priceLabel = document.createElement('span')
    priceLabel.className = 'ceremony-price'
    priceLabel.textContent = `${price} dinars`
    col.appendChild(priceLabel)

    const btn = document.createElement('button')
    btn.textContent = actionLabel
    onTap(btn, () => onBuy(btn))
    col.appendChild(btn)
    return col
  }

  function appendLeaveButton(body: HTMLElement, close: () => void, verse: VerseDef, label = 'Leave'): void {
    const btn = document.createElement('button')
    btn.textContent = label
    btn.className = 'ceremony-continue-btn'
    onTap(btn, () => {
      close()
      continueAfterSheet(verse)
    })
    body.appendChild(btn)
  }

  rollAndShow()

  return function dispose(): void {
    root.innerHTML = ''
    document.querySelectorAll('.sheet-overlay, .ceremony-overlay').forEach((el) => el.remove())
  }
}
