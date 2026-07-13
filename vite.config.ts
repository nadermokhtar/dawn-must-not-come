import { defineConfig, type Plugin } from 'vitest/config'
import { cpSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Serves /assets straight from the repo tree, but enforces two DESIGN.md §9.5
// rules in both dev and build: /assets/anchors never ships, and background
// .png masters are never loaded when a web-optimized .jpg sibling exists.
function assetTree(): Plugin {
  const root = __dirname
  let isBuild = false
  const blocked = (url: string): boolean => {
    if (url.startsWith('/assets/anchors/')) return true
    const png = url.match(/^\/assets\/backgrounds\/(.+)\.png$/)
    if (png && existsSync(resolve(root, `assets/backgrounds/${png[1]}.jpg`))) return true
    return false
  }
  return {
    name: 'asset-tree',
    configResolved(config) {
      isBuild = config.command === 'build'
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0] ?? ''
        if (blocked(url)) {
          res.statusCode = 404
          res.end('blocked by asset-tree: anchors and .png masters are never served')
          return
        }
        next()
      })
    },
    closeBundle() {
      if (!isBuild) return
      cpSync(resolve(root, 'assets'), resolve(root, 'dist/assets'), {
        recursive: true,
        filter: (src) => {
          const rel = src.slice(root.length).replaceAll('\\', '/')
          if (rel.startsWith('/assets/anchors')) return false
          if (rel.endsWith('MANIFEST.md')) return false
          return !blocked(rel)
        },
      })
    },
  }
}

export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    // Keep Vite's own hashed JS/CSS bundles out of dist/assets/, which
    // mirrors the repo's /assets art tree 1:1 (copied by asset-tree below).
    assetsDir: 'app',
  },
  plugins: [assetTree()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
