const lastTapAt = new WeakMap<Element, number>()

const TAP_DEBOUNCE_MS = 250
const TAP_MOVE_TOLERANCE_PX = 10

export function onTap(el: HTMLElement, fn: (ev: PointerEvent) => void): () => void {
  let startX = 0
  let startY = 0

  const onDown = (ev: PointerEvent) => {
    startX = ev.clientX
    startY = ev.clientY
  }

  const onUp = (ev: PointerEvent) => {
    const dx = Math.abs(ev.clientX - startX)
    const dy = Math.abs(ev.clientY - startY)
    if (dx > TAP_MOVE_TOLERANCE_PX || dy > TAP_MOVE_TOLERANCE_PX) return

    const now = ev.timeStamp
    const last = lastTapAt.get(el) ?? -Infinity
    if (now - last < TAP_DEBOUNCE_MS) return
    lastTapAt.set(el, now)

    fn(ev)
  }

  el.addEventListener('pointerdown', onDown)
  el.addEventListener('pointerup', onUp)

  return () => {
    el.removeEventListener('pointerdown', onDown)
    el.removeEventListener('pointerup', onUp)
  }
}

export function onHold(
  el: HTMLElement,
  fn: (ev: PointerEvent) => void,
  opts: { ms?: number } = {},
): () => void {
  const ms = opts.ms ?? 350
  let startX = 0
  let startY = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  const clear = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }

  const onDown = (ev: PointerEvent) => {
    startX = ev.clientX
    startY = ev.clientY
    clear()
    timer = setTimeout(() => fn(ev), ms)
  }

  const onMove = (ev: PointerEvent) => {
    const dx = Math.abs(ev.clientX - startX)
    const dy = Math.abs(ev.clientY - startY)
    if (dx > TAP_MOVE_TOLERANCE_PX || dy > TAP_MOVE_TOLERANCE_PX) clear()
  }

  el.addEventListener('pointerdown', onDown)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', clear)
  el.addEventListener('pointercancel', clear)
  el.addEventListener('pointerleave', clear)

  return () => {
    clear()
    el.removeEventListener('pointerdown', onDown)
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerup', clear)
    el.removeEventListener('pointercancel', clear)
    el.removeEventListener('pointerleave', clear)
  }
}
