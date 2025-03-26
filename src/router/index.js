import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/components/Login.vue'
import GameRoom from '@/components/GameRoom.vue'
import Game from '@/components/Game.vue'

// Gemeinsame Logik für direkten Zugang zu Räumen
const handleRoomAccess = (to, from, next) => {
  const roomId = to.params.roomId;
  const username = localStorage.getItem('username');
  
  // Wenn gültiger Benutzername vorhanden
  if (username && username.length >= 3 && username.length <= 15) {
    // Wenn die Route bereits GameRoom ist, normal weitergehen
    if (to.name === 'GameRoom') {
      next();
    } else {
      // Bei /room/:roomId direkt zur GameRoom-Route
      next({ name: 'GameRoom', params: { roomId } });
    }
  } else {
    // Zum Login mit vorausgefülltem Raumcode
    next({ name: 'Login', query: { roomId } });
  }
};

const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login
  },
  {
    path: '/room/:roomId',
    beforeEnter: handleRoomAccess
  },
  {
    path: '/room-lobby/:roomId',
    name: 'GameRoom',
    component: GameRoom,
    props: true,
    beforeEnter: handleRoomAccess
  },
  {
    path: '/game/:roomId',
    name: 'Game',
    component: Game,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router