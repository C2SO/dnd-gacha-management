import { createApp } from 'vue'

// Latin subsets only — the full packages also ship Devanagari/Cyrillic the terminal never uses.
import '@fontsource/orbitron/latin-500.css'
import '@fontsource/orbitron/latin-700.css'
import '@fontsource/rajdhani/latin-400.css'
import '@fontsource/rajdhani/latin-500.css'
import '@fontsource/rajdhani/latin-600.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import './styles/theme.css'

import App from './App.vue'

createApp(App).mount('#app')
