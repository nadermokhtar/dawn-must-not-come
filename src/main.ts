import './styles/tokens.css'
import './styles/base.css'
import './styles/cards.css'
import './styles/hud.css'
import './styles/map.css'
import { loadContent } from './data-loader/loadContent'
import { applyBattleReward, blessingEffects, createRun, recordDefeat } from './engine/run'
import { mountMapScreen } from './ui/screens/map'
import { mountBattleScreen } from './ui/screens/battle'
import { onTap } from './ui/touch'

const appEl = document.getElementById('app')
if (!appEl) throw new Error('#app not found')
const app: HTMLElement = appEl

const content = loadContent()
let run = createRun('sinbad', Date.now())

let disposeCurrent: () => void = () => {}

function startNewRun(): void {
  run = createRun('sinbad', Date.now())
  showMap()
}

function showMap(): void {
  disposeCurrent()
  disposeCurrent = mountMapScreen(app, run, content, {
    onBattleVerse: (enemyId) => showBattle(enemyId),
  })
}

function showBattle(enemyId: string): void {
  disposeCurrent()
  disposeCurrent = mountBattleScreen(app, {
    enemyId,
    deck: run.deck,
    playerStats: {
      hp: run.hp,
      maxHp: run.maxHp,
      apBase: run.apBase,
      mana: run.mana,
      manaMax: run.manaMax,
      handSize: run.handSize,
    },
    playerLevel: run.level,
    initialPlayerEffects: blessingEffects(run, content),
    onExit: (result) => {
      run.hp = result.hpRemaining
      if (result.outcome === 'win') {
        applyBattleReward(run, enemyId, content)
        if (run.result === 'night_cleared') {
          showEndScreen('night_cleared')
        } else {
          showMap()
        }
      } else {
        recordDefeat(run)
        showEndScreen('defeated')
      }
    },
  })
}

function showEndScreen(kind: 'night_cleared' | 'defeated'): void {
  disposeCurrent()
  disposeCurrent = () => {
    app.innerHTML = ''
  }
  const title = kind === 'night_cleared' ? 'Night Cleared' : 'Sinbad Falls'
  const kingLine =
    kind === 'night_cleared'
      ? '&ldquo;And does the voyage end there?&rdquo; the King asked.'
      : '&ldquo;Does the story end so?&rdquo; the King demanded, frowning.'
  const message =
    kind === 'night_cleared'
      ? '&ldquo;Inshallah [God willing],&rdquo; said Scheherazade, &ldquo;we will continue the story tomorrow.&rdquo;'
      : '&ldquo;Astaghfirullah [I seek God&rsquo;s forgiveness],&rdquo; Scheherazade whispered, &ldquo;the tale ends here &mdash; for tonight.&rdquo;'
  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:1rem;text-align:center;padding:1rem;background-image:linear-gradient(rgba(16,26,60,0.6),rgba(16,26,60,0.85)),url('/assets/backgrounds/bg_title.jpg');background-size:cover;background-position:center;">
      <h1 style="color:var(--gold);font-weight:normal;">${title}</h1>
      <p style="opacity:0.7;font-style:italic;">${kingLine}</p>
      <p style="opacity:0.85;font-style:italic;">${message}</p>
    </div>
  `
  const btn = document.createElement('button')
  btn.textContent = 'Begin a New Telling'
  btn.style.marginTop = '0.5rem'
  onTap(btn, startNewRun)
  app.querySelector('div')!.appendChild(btn)
}

showMap()
