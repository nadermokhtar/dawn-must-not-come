import { onTap } from './touch'

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

// CSS-only stand-in for DESIGN.md §8.3's "AP as brass astrolabe pips" —
// approximates the motif without depending on art that doesn't exist yet.
export function pipRow(current: number, max: number, opts: { color?: string } = {}): HTMLElement {
  const row = document.createElement('div')
  row.className = 'pip-row'
  for (let i = 0; i < max; i++) {
    const pip = document.createElement('div')
    pip.className = 'pip'
    if (i < current) {
      pip.classList.add('filled')
      if (opts.color) pip.style.background = opts.color
    }
    row.appendChild(pip)
  }
  return row
}

// CSS-only stand-in for "mana as blue inkwell fill".
export function fillMeter(current: number, max: number, opts: { color?: string; label?: string } = {}): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'fill-meter-wrap'

  const meter = document.createElement('div')
  meter.className = 'fill-meter'
  const fill = document.createElement('div')
  fill.className = 'fill-meter-fill'
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0
  fill.style.height = `${pct}%`
  if (opts.color) fill.style.background = opts.color
  meter.appendChild(fill)
  wrap.appendChild(meter)

  const caption = document.createElement('div')
  caption.className = 'fill-meter-caption'
  caption.textContent = opts.label ?? `${current}/${max}`
  wrap.appendChild(caption)

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
export function iconBadge(label: string, count?: number, opts: { onTap?: () => void } = {}): HTMLElement {
  const el = document.createElement('button')
  el.className = 'icon-badge'
  el.textContent = count !== undefined ? `${label} ${count}` : label
  if (opts.onTap) onTap(el, opts.onTap)
  return el
}

// Generic bottom-sheet overlay. `build` receives the (empty) body element to
// fill in; caller owns the content, this owns the overlay/backdrop/dismiss.
export function bottomSheet(title: string, itemCount: number | undefined, build: (body: HTMLElement) => void): void {
  const overlay = document.createElement('div')
  overlay.className = 'sheet-overlay'

  const sheet = document.createElement('div')
  sheet.className = 'sheet-panel'

  const heading = document.createElement('strong')
  heading.textContent = itemCount !== undefined ? `${title} (${itemCount})` : title
  sheet.appendChild(heading)

  const body = document.createElement('div')
  sheet.appendChild(body)
  build(body)

  overlay.appendChild(sheet)
  document.body.appendChild(overlay)
  onTap(overlay, (ev) => {
    if (ev.target === overlay) overlay.remove()
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
