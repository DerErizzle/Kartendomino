import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/components/Login.vue'
import GameRoom from '@/components/GameRoom.vue'
import Game from '@/components/Game.vue'
import store from '@/store'

async function tryJoinRoom(roomId, username) {
  // Versuche zuerst regulär beizutreten, falls das Spiel noch nicht gestartet ist
  // Falls das fehlschlägt und die Fehlermeldung "Spiel bereits gestartet" lautet,
  // versuchen wir einen reconnect, falls der Spieler doch schon im Raum war
  try {
    await store.dispatch('joinRoom', { username, roomId })
  } catch (error) {
    if (typeof error === 'string' && error.includes('Spiel bereits gestartet')) {
      // Also reconnect versuchen
      await store.dispatch('reconnectToRoom', { username, roomId })
    } else {
      // Anderer Fehler: einfach erneut werfen
      throw error
    }
  }
}

// Lobby-Zugriff
const handleRoomLobbyAccess = async (to, from, next) => {
  const roomId = to.params.roomId
  const username = localStorage.getItem('username')

  if (!username || username.length < 3 || username.length > 15) {
    return next({ name: 'Login', query: { roomId } })
  }

  // Verhindert doppelte Joins in denselben Raum
  if (store.state.roomId === roomId) {
    return next()
  }

  try {
    // 1) Join versuchen, ggf. bei "Spiel bereits gestartet" => reconnect
    await tryJoinRoom(roomId, username)
    next()
  } catch (error) {
    // Raum existiert nicht oder irgendwas anderes
    next({ name: 'Login' })
  }
}

// Spiel-Zugriff
const handleGameAccess = async (to, from, next) => {
  const roomId = to.params.roomId
  const username = localStorage.getItem('username')

  if (!username || username.length < 3 || username.length > 15) {
    return next({ name: 'Login', query: { roomId } })
  }

  if (store.state.roomId === roomId) {
    return next()
  }

  try {
    // 1) Join versuchen, falls Raum noch nicht gestartet
    // 2) Bei Fehlermeldung "Spiel bereits gestartet" => reconnect
    await tryJoinRoom(roomId, username)
    next()
  } catch {
    next({ name: 'Login' })
  }
}

const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login
  },
  {
    path: '/room-lobby/:roomId',
    name: 'GameRoom',
    component: GameRoom,
    props: true,
    beforeEnter: handleRoomLobbyAccess
  },
  {
    path: '/game/:roomId',
    name: 'Game',
    component: Game,
    props: true,
    beforeEnter: handleGameAccess
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router