import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

// Socket.io-Verbindung initialisieren
import './services/socketService'

// Audio-Service initialisieren
import audioService from './services/audioService'

// Vorausladen der Audio-Dateien im Hintergrund
audioService.init()

// Erstelle die Vue-App und verbinde Store und Router
const app = createApp(App)
app.use(store)
app.use(router)
app.mount('#app')