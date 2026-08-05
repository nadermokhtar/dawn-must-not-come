import type { CardDef, CardType, DType } from '../engine/types'
import { createArtElement } from './artUrl'
import { onTap } from './touch'

const TYPE_LABEL: Record<CardType, string> = {
  attack: 'Attack',
  spell: 'Spell',
  counter: 'Counter',
  equipment: 'Equip',
  curse: 'Curse',
  item: 'Item',
}

const TYPE_COLOR_VAR: Record<CardType, string> = {
  attack: 'var(--card-attack)',
  spell: 'var(--card-spell)',
  counter: 'var(--card-counter)',
  equipment: 'var(--card-equipment)',
  curse: 'var(--card-curse)',
  item: 'var(--card-item)',
}

const TEXT_FONT_MAX = 12
const TEXT_FONT_FLOOR = 10
const TEXT_FONT_STEP = 0.5

function prettyLabel(id: string): string {
  return id
    .split('_')
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(' ')
}

function frameRef(card: CardDef): string {
  if ((card.stars ?? 0) > 0) return 'frames/frame_starred.png'
  switch (card.rarity) {
    case 'rare':
      return 'frames/frame_rare.png'
    case 'epic':
      return 'frames/frame_epic.png'
    default:
      return 'frames/frame_common.png'
  }
}

export function describeCard(card: CardDef): string {
  const parts: string[] = []

  if (card.damage) parts.push(`Deal ${card.damage.amount} ${prettyLabel(card.damage.dtype)} damage.`)
  if (card.draw) parts.push(`Draw ${card.draw} card${card.draw === 1 ? '' : 's'}.`)

  for (const raw of card.effects ?? []) {
    const r = raw as Record<string, unknown>
    if (typeof r.apply === 'string') {
      parts.push(`Apply ${(r.stacks as number) ?? 1} ${prettyLabel(r.apply)}.`)
    } else if (r.op === 'heal') {
      parts.push(`Heal ${r.amount}.`)
    } else if (r.op === 'modify_resource') {
      const delta = r.delta as number
      parts.push(`${delta > 0 ? '+' : ''}${delta} ${(r.resource as string).replace('_', ' ')}.`)
    } else if (r.op === 'deal_damage') {
      parts.push(`Deal ${r.amount} ${prettyLabel(r.dtype as DType)} damage.`)
    }
  }

  if (card.counter) {
    const m = card.counter.match
    const cond = m.action_type ?? (m.dtype ? prettyLabel(m.dtype) : m.tag ? `"${m.tag}"` : 'action')
    parts.push(`Counter: negate next ${cond}.`)
  }

  return parts.length > 0 ? parts.join(' ') : (card.flavor ?? '')
}

function costBadge(amount: number, kind: 'ap' | 'mana'): HTMLElement {
  const badge = document.createElement('div')
  badge.className = `card-cost-badge cost-${kind}`
  badge.textContent = String(amount)
  return badge
}

// Shrinks the ability-text box's font from TEXT_FONT_MAX down to TEXT_FONT_FLOOR
// until it fits without overflow, then clamps any remainder with an ellipsis.
// Deferred to the next frame because the element has no layout box (and thus
// scrollHeight/clientHeight read 0) until the caller appends it to the DOM,
// which always happens synchronously in the same task that created it.
function fitCardText(textEl: HTMLElement): void {
  requestAnimationFrame(() => {
    let fontSize = TEXT_FONT_MAX
    textEl.style.fontSize = `${fontSize}px`
    while (textEl.scrollHeight > textEl.clientHeight && fontSize > TEXT_FONT_FLOOR) {
      fontSize -= TEXT_FONT_STEP
      textEl.style.fontSize = `${fontSize}px`
    }
    if (textEl.scrollHeight > textEl.clientHeight) {
      const lineHeight = fontSize * 1.25
      const lines = Math.max(1, Math.floor(textEl.clientHeight / lineHeight))
      textEl.style.setProperty('--clamp-lines', String(lines))
      textEl.classList.add('card-text-clamped')
    }
  })
}

export function createCardElement(card: CardDef, opts: { zoom?: boolean } = {}): HTMLElement {
  const el = document.createElement('div')
  el.className = opts.zoom ? 'card zoom-card' : 'card'
  el.classList.add(`cost-type-${card.cost_type}`)
  el.dataset.cardId = card.id

  el.appendChild(createArtElement(frameRef(card), '', 'card-frame'))

  const inner = document.createElement('div')
  inner.className = 'card-inner'
  el.appendChild(inner)

  if (card.cost_type === 'mixed') {
    const stack = document.createElement('div')
    stack.className = 'card-cost-stack'
    stack.appendChild(costBadge(card.cost.ap, 'ap'))
    stack.appendChild(costBadge(card.cost.mana, 'mana'))
    el.appendChild(stack)
  } else {
    el.appendChild(costBadge(card.cost_type === 'mana' ? card.cost.mana : card.cost.ap, card.cost_type))
  }

  const banner = document.createElement('div')
  banner.className = 'card-name-banner'
  banner.style.background = TYPE_COLOR_VAR[card.type]
  banner.textContent = card.name
  inner.appendChild(banner)

  const artWindow = document.createElement('div')
  artWindow.className = 'card-art-window'
  artWindow.appendChild(createArtElement(card.art_ref, card.name))
  inner.appendChild(artWindow)

  if ((card.stars ?? 0) > 0) {
    const stars = document.createElement('div')
    stars.className = 'card-stars'
    stars.textContent = '★'.repeat(card.stars!)
    inner.appendChild(stars)
  }

  const textBox = document.createElement('div')
  textBox.className = 'card-text-box'
  textBox.textContent = describeCard(card)
  inner.appendChild(textBox)
  if (!opts.zoom) fitCardText(textBox)

  const ribbon = document.createElement('div')
  ribbon.className = 'card-type-ribbon'
  ribbon.style.background = TYPE_COLOR_VAR[card.type]
  ribbon.textContent = TYPE_LABEL[card.type]
  inner.appendChild(ribbon)

  return el
}

// Full-screen-ish detail view — the same "tap-hold in battle" zoom, reused
// wherever a card is shown for picking (Bazaar, Calligrapher, House of
// Forgetting, level-up rewards) so players can read the full, unclamped
// ability text before committing to a choice.
export function showCardZoom(card: CardDef): void {
  const overlay = document.createElement('div')
  overlay.className = 'zoom-overlay'
  overlay.appendChild(createCardElement(card, { zoom: true }))
  document.body.appendChild(overlay)
  onTap(overlay, () => overlay.remove())
}

// A card face that just opens the zoom view on tap — for picker/list contexts
// (shop, upgrade, remove, rewards) where the card itself carries no other
// action; the caller renders its own explicit action button alongside it.
export function createInspectableCardElement(card: CardDef): HTMLElement {
  const el = createCardElement(card)
  onTap(el, () => showCardZoom(card))
  return el
}
