const ASSET_BASE = '/assets/'

export function assetUrl(ref: string): string {
  return ASSET_BASE + ref
}

// Missing art (most of /assets/ui, several enemies, etc.) is expected during
// the vertical slice — art_ref values stay canonical in data so real art
// drops in later with zero data changes. This just keeps the UI legible
// until it does.
export function createArtElement(ref: string | undefined, label: string, className = ''): HTMLElement {
  if (!ref) return placeholderEl(label, className)

  const img = document.createElement('img')
  img.src = assetUrl(ref)
  img.alt = label
  img.className = className
  img.draggable = false
  img.onerror = () => {
    img.replaceWith(placeholderEl(label, className))
  }
  return img
}

function placeholderEl(label: string, className: string): HTMLElement {
  const div = document.createElement('div')
  div.className = `art-placeholder ${className}`.trim()
  div.textContent = label
  return div
}
