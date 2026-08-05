const ASSET_BASE = '/assets/'
const PLACEHOLDER_FONT = 'playfair-display'

export function assetUrl(ref: string): string {
  return ASSET_BASE + ref
}

function placeholderImageUrl(label: string): string {
  return `https://placehold.co/400x400?text=${encodeURIComponent(label)}&font=${PLACEHOLDER_FONT}`
}

// Missing art (most of /assets/ui, several enemies, etc.) is expected during
// the vertical slice — art_ref values stay canonical in data so real art
// drops in later with zero data changes. Falls back to a placehold.co image
// (readable text label, on-theme serif) and then, if that's unreachable
// (offline — this is otherwise a fully client-side game), to a local
// CSS-only placeholder so the UI never breaks.
export function createArtElement(ref: string | undefined, label: string, className = ''): HTMLElement {
  const img = document.createElement('img')
  img.alt = label
  img.className = className
  img.draggable = false
  img.src = ref ? assetUrl(ref) : placeholderImageUrl(label)

  img.onerror = () => {
    if (img.src !== placeholderImageUrl(label)) {
      img.onerror = () => img.replaceWith(placeholderEl(label, className))
      img.src = placeholderImageUrl(label)
    } else {
      img.replaceWith(placeholderEl(label, className))
    }
  }
  return img
}

function placeholderEl(label: string, className: string): HTMLElement {
  const div = document.createElement('div')
  div.className = `art-placeholder ${className}`.trim()
  div.textContent = label
  return div
}
