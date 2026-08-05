import './styles/tokens.css'
import './styles/base.css'
import './styles/cards.css'
import './styles/hud.css'
import './styles/map.css'
import './styles/ceremony.css'
import { loadContent } from './data-loader/loadContent'
import {
  applyBattleReward,
  blessingEffects,
  createRun,
  forkForEnemy,
  recordDefeat,
  resolveStoryFork,
  sampleClassCards,
  XP_TO_LEVEL,
  type RunState,
} from './engine/run'
import { mountMapScreen } from './ui/screens/map'
import { mountBattleScreen } from './ui/screens/battle'
import { showStoryFork } from './ui/storyFork'
import { showLevelUpReward } from './ui/levelUpReward'
import { showBasmalaIntro, maybeShowMapTutorial, skipTutorialsForExperiencedPlayer } from './ui/onboarding'
import { ceremonyDialog } from './ui/components'
import { onTap } from './ui/touch'
import { loadRun, saveRun } from './run/persistence'

const appEl = document.getElementById('app')
if (!appEl) throw new Error('#app not found')
const app: HTMLElement = appEl

const content = loadContent()
const loadedRun = loadRun()
let run: RunState = loadedRun ?? createRun('sinbad', Date.now())
// A loaded save with real progress predates these tutorials — that player
// already knows how to play, so never spring a beginner explainer on them.
if (loadedRun) skipTutorialsForExperiencedPlayer(loadedRun)

let disposeCurrent: () => void = () => {}

function startNewRun(): void {
  run = createRun('sinbad', Date.now())
  saveRun(run)
  // DESIGN.md §8.5: every telling opens with the basmala — a new run, not a
  // resumed one, so this only fires here and on a true cold start below.
  showBasmalaIntro(showMap)
}

function showMap(): void {
  saveRun(run)
  disposeCurrent()
  disposeCurrent = mountMapScreen(app, run, content, {
    onBattleVerse: (enemyId) => showBattle(enemyId),
    onStateChange: () => saveRun(run),
    onRestart: confirmRestart,
  })
  // No-op after the first time ever (persisted per-profile) — overlays a
  // one-time "how Verses work" explainer on top of the freshly mounted map.
  maybeShowMapTutorial(() => {})
}

// Restarting mid-run discards real progress, so it's confirmed rather than
// instant — a mis-tap on the header button shouldn't erase a telling.
function confirmRestart(): void {
  ceremonyDialog({ title: 'Begin Anew?', portraitLabel: 'The King', ribbonColor: 'var(--madder)' }, (body, close) => {
    const p = document.createElement('p')
    p.className = 'sheet-narration'
    p.textContent = '"Enough," the King might say. "Start the tale again, from the first page?" This abandons your current telling — there is no return to it.'
    body.appendChild(p)

    const actions = document.createElement('div')
    actions.className = 'ceremony-actions'
    const cancelBtn = document.createElement('button')
    cancelBtn.textContent = 'Keep Telling'
    onTap(cancelBtn, close)
    actions.appendChild(cancelBtn)
    const confirmBtn = document.createElement('button')
    confirmBtn.textContent = 'Begin Anew'
    onTap(confirmBtn, () => {
      close()
      startNewRun()
    })
    actions.appendChild(confirmBtn)
    body.appendChild(actions)
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
    playerXp: run.xp,
    xpToLevel: XP_TO_LEVEL,
    initialPlayerEffects: blessingEffects(run, content),
    onExit: (result) => {
      run.hp = result.hpRemaining
      if (result.outcome === 'win') {
        afterWin(enemyId)
      } else {
        recordDefeat(run)
        saveRun(run)
        showEndScreen('defeated')
      }
    },
  })
}

// Win flow is a chain of optional interruptions before landing back on the
// map (or an end/transition screen): Story Fork first (it's about the fight
// that just happened), then a level-up reward if XP crossed a level this
// battle. The battle screen (with its own end-banner) is disposed first so
// these bottomSheets aren't hidden behind it (the end-banner is a higher
// z-index full-screen overlay).
function afterWin(enemyId: string): void {
  const reward = applyBattleReward(run, enemyId, content)
  const fork = forkForEnemy(run, enemyId, content)
  disposeCurrent()
  disposeCurrent = () => {
    app.innerHTML = ''
  }

  function afterReward(): void {
    saveRun(run)
    if (reward.nightAdvanced) {
      showNightTransition(run.night)
    } else if (run.result === 'night_cleared') {
      showEndScreen('night_cleared')
    } else {
      showMap()
    }
  }

  function afterFork(): void {
    if (reward.levelsGained > 0) {
      const choices = sampleClassCards(run, content, 3, 'levelup')
      showLevelUpReward(run.level, choices, (cardId) => {
        if (cardId) run.deck.push(cardId)
        afterReward()
      })
    } else {
      afterReward()
    }
  }

  if (fork) {
    showStoryFork(fork.fork, (optionId) => {
      resolveStoryFork(run, fork.forkId, optionId, content)
      afterFork()
    })
  } else {
    afterFork()
  }
}

function showTitleCard(opts: { title: string; kingLine: string; message: string; buttonLabel: string; onButton: () => void }): void {
  disposeCurrent()
  disposeCurrent = () => {
    app.innerHTML = ''
  }
  app.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:1rem;text-align:center;padding:1rem;background-image:linear-gradient(rgba(16,26,60,0.6),rgba(16,26,60,0.85)),url('/assets/backgrounds/bg_title.jpg');background-size:cover;background-position:center;">
      <h1 style="color:var(--gold);font-weight:normal;">${opts.title}</h1>
      <p style="opacity:0.7;font-style:italic;">${opts.kingLine}</p>
      <p style="opacity:0.85;font-style:italic;">${opts.message}</p>
    </div>
  `
  const btn = document.createElement('button')
  btn.textContent = opts.buttonLabel
  btn.style.marginTop = '0.5rem'
  onTap(btn, opts.onButton)
  app.querySelector('div')!.appendChild(btn)
}

function showEndScreen(kind: 'night_cleared' | 'defeated'): void {
  if (kind === 'night_cleared') {
    showTitleCard({
      title: 'Night Cleared',
      kingLine: '&ldquo;And does the voyage end there?&rdquo; the King asked.',
      message: '&ldquo;Inshallah [God willing],&rdquo; said Scheherazade, &ldquo;we will continue the story tomorrow.&rdquo;',
      buttonLabel: 'Begin a New Telling',
      onButton: startNewRun,
    })
  } else {
    showTitleCard({
      title: 'Sinbad Falls',
      kingLine: '&ldquo;Does the story end so?&rdquo; the King demanded, frowning.',
      message: '&ldquo;Astaghfirullah [I seek God&rsquo;s forgiveness],&rdquo; Scheherazade whispered, &ldquo;the tale ends here &mdash; for tonight.&rdquo;',
      buttonLabel: 'Begin a New Telling',
      onButton: startNewRun,
    })
  }
}

function showNightTransition(nextNight: number): void {
  showTitleCard({
    title: 'Night Survived',
    kingLine: '&ldquo;And does the tale continue, Scheherazade?&rdquo; the King asked.',
    message: '&ldquo;Inshallah [God willing],&rdquo; she said, &ldquo;there is more still to tell.&rdquo;',
    buttonLabel: `Begin Night ${nextNight}`,
    onButton: showMap,
  })
}

if (loadedRun) {
  showMap()
} else {
  showBasmalaIntro(showMap)
}
