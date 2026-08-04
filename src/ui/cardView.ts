import type { CardDef, DType } from '../engine/types'
import { createArtElement } from './artUrl'

const TYPE_GLYPHS: Record<CardDef['type'], string> = {
  attack: 'ATK',
  spell: 'SPL',
  counter: 'CTR',
  equipment: 'EQP',
  curse: 'CRS',
  item: 'ITM',
}

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

  if (card.damage) parts.push(`${card.damage.amount} ${prettyLabel(card.damage.dtype)}`)
  if (card.draw) parts.push(`Draw ${card.draw}`)

  for (const raw of card.effects ?? []) {
    const r = raw as Record<string, unknown>
    if (typeof r.apply === 'string') {
      parts.push(`Apply ${(r.stacks as number) ?? 1} ${prettyLabel(r.apply)}`)
    } else if (r.op === 'heal') {
      parts.push(`Heal ${r.amount}`)
    } else if (r.op === 'modify_resource') {
      const delta = r.delta as number
      parts.push(`${delta > 0 ? '+' : ''}${delta} ${(r.resource as string).replace('_', ' ')}`)
    } else if (r.op === 'deal_damage') {
      parts.push(`${r.amount} ${prettyLabel(r.dtype as DType)}`)
    }
  }

  if (card.counter) {
    const m = card.counter.match
    const cond = m.action_type ?? (m.dtype ? prettyLabel(m.dtype) : m.tag ? `"${m.tag}"` : 'action')
    parts.push(`Counter: negate next ${cond}`)
  }

  return parts.length > 0 ? parts.join(' · ') : (card.flavor ?? '')
}

export function createCardElement(card: CardDef, opts: { zoom?: boolean } = {}): HTMLElement {
  const el = document.createElement('div')
  el.className = opts.zoom ? 'card zoom-card' : 'card'
  el.dataset.cardId = card.id

  el.appendChild(createArtElement(frameRef(card), '', 'card-frame'))

  const artWindow = document.createElement('div')
  artWindow.className = 'card-art-window'
  artWindow.appendChild(createArtElement(card.art_ref, card.name))
  el.appendChild(artWindow)

  const cost = document.createElement('div')
  cost.className = 'card-cost'
  cost.textContent = card.cost.mana > 0 ? `${card.cost.ap}/${card.cost.mana}` : `${card.cost.ap}`
  el.appendChild(cost)

  const glyph = document.createElement('div')
  glyph.className = 'card-type-glyph'
  glyph.textContent = TYPE_GLYPHS[card.type]
  el.appendChild(glyph)

  if ((card.stars ?? 0) > 0) {
    const stars = document.createElement('div')
    stars.className = 'card-stars'
    stars.textContent = '★'.repeat(card.stars!)
    el.appendChild(stars)
  }

  const name = document.createElement('div')
  name.className = 'card-name'
  name.textContent = card.name
  el.appendChild(name)

  const text = document.createElement('div')
  text.className = 'card-text'
  text.textContent = describeCard(card)
  el.appendChild(text)

  return el
}
