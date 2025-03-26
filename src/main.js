import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

// Socket.io-Verbindung initialisieren
import './services/socketService'

// Audio-Service initialisieren und global verfügbar machen
import audioService from './services/audioService'

// Globale Komponenten
import SoundButton from './components/SoundButton.vue'

// Vorausladen der Audio-Dateien im Hintergrund
audioService.init()

// Erstelle die Vue-App und verbinde Store und Router
const app = createApp(App)

// Globale Komponenten registrieren
app.component('SoundButton', SoundButton)

app.use(store)
app.use(router)
app.mount('#app')