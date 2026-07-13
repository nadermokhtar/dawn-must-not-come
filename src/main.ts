import './styles/tokens.css'
import './styles/base.css'

const app = document.getElementById('app')
if (!app) throw new Error('#app not found')

const params = new URLSearchParams(location.search)

if (params.get('dev') === 'battle') {
  const { mountBattleLog } = await import('./ui/dev/battleLog')
  mountBattleLog(app)
} else {
  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:1rem;text-align:center;padding:1rem;">
      <h1 style="color:var(--gold);font-weight:normal;">Dawn Must Not Come</h1>
      <p style="opacity:0.7;">No game screen yet — try <code>?dev=battle</code></p>
    </div>
  `
}
