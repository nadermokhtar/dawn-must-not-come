import { onTap } from './touch'
import { createArtElement } from './artUrl'

// Generic, reusable DOM widgets — no battle-domain knowledge (no BattleState/
// BattleEvent/Content imports) so later screens (map, bazaar...) can reuse
// them without pulling in battle-specific code.

export interface BarOptions {
  color: string
  height?: number
  showNumbers?: boolean
}

export function statBar(current: number, max: number, opts: BarOptions): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'stat-bar'
  if (opts.height) wrap.style.height = `${opts.height}px`

  const fill = document.createElement('div')
  fill.className = 'stat-bar-fill'
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0
  fill.style.width = `${pct}%`
  fill.style.background = opts.color
  wrap.appendChild(fill)

  if (opts.showNumbers) {
    const numbers = document.createElement('div')
    numbers.className = 'stat-bar-numbers'
    numbers.textContent = `${Math.max(0, Math.round(current))}/${Math.round(max)}`
    wrap.appendChild(numbers)
  }

  return wrap
}

// title = native hover tooltip (desktop); tap = flashMessage (touch has no
// hover) — every icon-only widget gets both so nothing is unexplained on
// either input method.
function withTooltip(el: HTMLElement, text: string): void {
  el.title = text
  onTap(el, () => flashMessage(el, text))
}

const ARMOR_TOOLTIP = 'Armor: absorbs damage until depleted, then breaks.'
const AP_TOOLTIP = 'Action Points (AP): spent to play cards, refill each turn.'

// CSS clip-path shield — armor value for player/enemy. No dedicated art asset
// exists yet for the vertical slice, so the shape is drawn in CSS.
export function armorBadge(value: number): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'armor-badge'
  const glyph = document.createElement('div')
  glyph.className = 'armor-badge-glyph'
  wrap.appendChild(glyph)
  const num = document.createElement('span')
  num.className = 'armor-badge-value'
  num.textContent = String(value)
  wrap.appendChild(num)
  withTooltip(wrap, ARMOR_TOOLTIP)
  return wrap
}

// CSS clip-path hourglass — AP display (DESIGN.md §8.3's "AP as brass
// astrolabe pips" reinterpreted per the reference layout's hourglass motif).
export function hourglassStat(current: number, max?: number): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'hourglass-stat'
  const glyph = document.createElement('div')
  glyph.className = 'hourglass-glyph'
  wrap.appendChild(glyph)
  const num = document.createElement('span')
  num.className = 'hourglass-value'
  num.textContent = max !== undefined ? `${current}/${max}` : String(current)
  wrap.appendChild(num)
  withTooltip(wrap, AP_TOOLTIP)
  return wrap
}

export type BadgeKind = 'buff' | 'debuff' | 'neutral'

// Tap reveals the full effect name — keeps an abbreviated glyph badge fully
// inspectable without a separate menu, which is the point for testing.
export function statusBadge(glyph: string, stacks: number, kind: BadgeKind, fullName: string): HTMLElement {
  const badge = document.createElement('div')
  badge.className = `status-badge kind-${kind}`

  const glyphEl = document.createElement('span')
  glyphEl.className = 'status-badge-glyph'
  glyphEl.textContent = glyph
  badge.appendChild(glyphEl)

  if (stacks > 1) {
    const stacksEl = document.createElement('span')
    stacksEl.className = 'status-badge-stacks'
    stacksEl.textContent = String(stacks)
    badge.appendChild(stacksEl)
  }

  onTap(badge, () => flashMessage(badge, `${fullName} ×${stacks}`))
  return badge
}

// Generalizes the old .pile-badge — pile counters and the log-drawer trigger
// share this one visual language and code path.
export function iconBadge(
  label: string,
  count?: number,
  opts: { onTap?: () => void; compact?: boolean; tooltip?: string } = {},
): HTMLElement {
  const el = document.createElement('button')
  el.className = opts.compact ? 'icon-badge icon-badge-compact' : 'icon-badge'
  el.textContent = count !== undefined ? `${label} ${count}` : label
  if (opts.tooltip) el.title = opts.tooltip
  if (opts.onTap) {
    onTap(el, opts.onTap)
  } else if (opts.tooltip) {
    onTap(el, () => flashMessage(el, opts.tooltip!))
  }
  return el
}

// Generic bottom-sheet overlay. `build` receives the (empty) body element to
// fill in; caller owns the content, this owns the overlay/backdrop/dismiss.
export function bottomSheet(
  title: string,
  itemCount: number | undefined,
  build: (body: HTMLElement, close: () => void) => void,
): void {
  const overlay = document.createElement('div')
  overlay.className = 'sheet-overlay'

  const sheet = document.createElement('div')
  sheet.className = 'sheet-panel'

  const heading = document.createElement('strong')
  heading.textContent = itemCount !== undefined ? `${title} (${itemCount})` : title
  sheet.appendChild(heading)

  const body = document.createElement('div')
  sheet.appendChild(body)
  const close = () => overlay.remove()
  build(body, close)

  overlay.appendChild(sheet)
  document.body.appendChild(overlay)
  onTap(overlay, (ev) => {
    if (ev.target === overlay) close()
  })
}

// Transient toast anchored near an element — used to explain why an action
// was denied (e.g. insufficient AP) instead of failing silently.
export function flashMessage(anchor: HTMLElement, text: string, ms = 1600): void {
  const rect = anchor.getBoundingClientRect()
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.textContent = text
  toast.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 160))}px`
  toast.style.top = `${Math.max(8, rect.top - 36)}px`
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), ms)
}

export interface CeremonyOptions {
  title: string
  portraitRef?: string
  portraitLabel: string
  ribbonColor?: string
  closable?: boolean
}

// The shared "big moment" overlay — a glowing portrait, a ribbon-banner
// title, and a panel body — used for every screen that stops the player to
// present a choice or a result at consistent proportions: Victory, level-up
// rewards, the Bazaar, the Calligrapher, the House of Forgetting, Blessings,
// chests. Distinct from `bottomSheet` (which stays a plain slide-up list for
// pile views/the event log — those don't need ceremony).
export function ceremonyDialog(
  opts: CeremonyOptions,
  build: (body: HTMLElement, close: () => void) => void,
): { close: () => void } {
  const overlay = document.createElement('div')
  overlay.className = 'ceremony-overlay'

  const frame = document.createElement('div')
  frame.className = 'ceremony-frame'

  const portraitWrap = document.createElement('div')
  portraitWrap.className = 'ceremony-portrait-wrap'
  portraitWrap.appendChild(createArtElement(opts.portraitRef, opts.portraitLabel, 'ceremony-portrait'))
  frame.appendChild(portraitWrap)

  const ribbon = document.createElement('div')
  ribbon.className = 'ceremony-ribbon'
  if (opts.ribbonColor) ribbon.style.background = opts.ribbonColor
  ribbon.textContent = opts.title
  frame.appendChild(ribbon)

  const panel = document.createElement('div')
  panel.className = 'ceremony-panel'

  const close = () => overlay.remove()

  if (opts.closable) {
    const closeBtn = document.createElement('button')
    closeBtn.className = 'ceremony-close'
    closeBtn.textContent = '✕'
    closeBtn.title = 'Close'
    onTap(closeBtn, close)
    panel.appendChild(closeBtn)
  }

  frame.appendChild(panel)
  overlay.appendChild(frame)
  document.body.appendChild(overlay)

  build(panel, close)

  return { close }
}
