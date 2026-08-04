import './styles/tokens.css'
import './styles/base.css'
import './styles/cards.css'
import './styles/hud.css'
import { mountBattleScreen } from './ui/screens/battle'

const app = document.getElementById('app')
if (!app) throw new Error('#app not found')

mountBattleScreen(app)
