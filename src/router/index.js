import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/components/Login.vue'
import GameRoom from '@/components/GameRoom.vue'
import Game from '@/components/Game.vue'

const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login
  },
  {
    path: '/room/:roomId',
    name: 'GameRoom',
    component: GameRoom,
    props: true
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