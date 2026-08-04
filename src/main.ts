import './styles/tokens.css'
import './styles/base.css'
import './styles/cards.css'
import './styles/hud.css'
import './styles/map.css'
import { loadContent } from './data-loader/loadContent'
import { applyBattleReward, blessingEffects, createRun, recordDefeat } from './engine/run'
import { mountMapScreen } from './ui/screens/map'
import { mountBattleScreen } from './ui/screens/battle'

const appEl = document.getElementById('app')
if (!appEl) throw new Error('#app not found')
const app: HTMLElement = appEl

const content = loadContent()
const run = createRun('sinbad', Date.now())

let disposeCurrent: () => void = () => {}

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
  const message =
    kind === 'night_cleared'
      ? '&ldquo;Inshallah [God willing],&rdquo; said Scheherazade, &ldquo;we will continue the story tomorrow.&rdquo;'
      : '&ldquo;Astaghfirullah [I seek God&rsquo;s forgiveness],&rdquo; Scheherazade whispered, &ldquo;the tale ends here &mdash; for tonight.&rdquo;'
  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:1rem;text-align:center;padding:1rem;">
      <h1 style="color:var(--gold);font-weight:normal;">${title}</h1>
      <p style="opacity:0.85;font-style:italic;">${message}</p>
    </div>
  `
}

showMap()
