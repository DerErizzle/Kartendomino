import { io } from 'socket.io-client'
import store from '../store'
import audioService from './audioService'
import router from '../router'

const getBackendUrl = () => {
  const isProduction = process.env.NODE_ENV === 'production'
  if (isProduction) {
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    const port = window.location.port ? `:${window.location.port}` : ''
    return `${protocol}//${hostname}${port}`
  } else {
    return 'http://localhost:3000'
  }
}

const socketOptions = {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['polling']
}

console.log('Socket.io wird verbunden mit:', {
  url: getBackendUrl(),
  options: socketOptions,
  environment: process.env.NODE_ENV || 'development'
})

export const socket = io(getBackendUrl(), socketOptions)

let lastKnownPassCounts = {}
let lastPlayedCard = null
let knownWinners = {}
let lastCardCounts = {}

socket.on('connect', () => {
  console.log('Connected to server:', {
    socketId: socket.id,
    connected: socket.connected,
    transport: socket.io.engine.transport.name
  })
})

socket.on('connect_error', (error) => {
  console.error('Connection error:', {
    message: error.message,
    description: error.description,
    transport: socket.io?.engine?.transport?.name || 'unknown',
    url: getBackendUrl()
  })
  router.push('/')
})

socket.on('disconnect', (reason) => {
  console.log(`Disconnected: ${reason}`)
  if (reason === 'io server disconnect') {
    socket.connect()
  }
})

socket.on('reconnect', (attemptNumber) => {
  console.log(`Reconnected after ${attemptNumber} attempts`)
})

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log(`Reconnect attempt: ${attemptNumber}`)
})

socket.on('error', (error) => {
  console.error('Socket error:', error)
  router.push('/')
})

socket.on('roomCreated', ({ roomId }) => {
  store.commit('setRoomId', roomId)
  console.log('Room created:', roomId)
})

socket.on('playersUpdate', ({ players }) => {
  store.commit('setPlayers', players)
  console.log('Players updated:', players)
})

socket.on('gameStarted', ({ currentPlayer, hand, cards, playerPositions, handSizes }) => {
  console.log('Game started event received:', { currentPlayer, handSizes, playerPositions })
  lastKnownPassCounts = {}
  lastPlayedCard = null
  knownWinners = {}
  lastCardCounts = { ...handSizes }
  store.commit('setGameStarted', true)
  store.commit('setCurrentPlayer', currentPlayer)
  store.commit('setHand', hand || [])
  store.commit('setCards', cards || [])
  store.commit('setPlayerPositions', playerPositions || {})
  store.commit('setHandSizes', handSizes || {})
})

function detectSurrender(oldHandSizes, newHandSizes) {
  const surrenderedPlayers = []
  Object.keys(newHandSizes).forEach(player => {
    if (oldHandSizes[player] > 0 && newHandSizes[player] === 0) {
      if (!knownWinners[player]) {
        surrenderedPlayers.push(player)
      }
    }
  })
  return surrenderedPlayers
}

socket.on('turnUpdate', ({ currentPlayer, cards, handSizes }) => {
  console.log('Turn update received:', { currentPlayer, handSizes })
  const username = store.state.username
  const oldCurrentPlayer = store.state.currentPlayer
  const oldCardsLength = store.state.cards ? store.state.cards.length : 0
  if (cards && cards.length > oldCardsLength) {
    if (oldCurrentPlayer !== username) {
      audioService.playCardSound()
    }
  }
  if (handSizes) {
    const oldHandSizes = lastCardCounts
    const surrenderedPlayers = detectSurrender(oldHandSizes, handSizes)
    if (surrenderedPlayers.length > 0) {
      surrenderedPlayers.forEach(player => {
        if (player !== username) {
          console.log('Player surrendered (detected in turnUpdate):', player)
          audioService.playSurrenderSound()
          knownWinners[player] = true
        }
      })
    }
    lastCardCounts = { ...handSizes }
  }
  store.commit('setCurrentPlayer', currentPlayer)
  store.commit('setCards', cards || [])
  if (handSizes) {
    store.commit('setHandSizes', handSizes)
  }
})

socket.on('handUpdate', ({ hand }) => {
  store.commit('setHand', hand || [])
})

socket.on('passUpdate', ({ player, passCounts }) => {
  console.log('Pass update received:', passCounts)
  if (player && player !== store.state.username && passCounts) {
    const currentPassCount = passCounts[player] || 0
    const previousPassCount = lastKnownPassCounts[player] || 0
    if (currentPassCount > previousPassCount) {
      audioService.playOtherPassSound()
    }
  }
  if (passCounts) {
    lastKnownPassCounts = { ...passCounts }
  }
  store.commit('setPassCounts', passCounts || {})
})

socket.on('playerForfeit', ({ player, cards, passCounts, handSizes }) => {
  console.log('Player forfeit:', player, handSizes)
  const currentUsername = store.state.username
  if (player !== currentUsername && !knownWinners[player]) {
    console.log('Playing surrender sound for player:', player)
    audioService.playSurrenderSound()
    knownWinners[player] = true
  }
  store.commit('setCards', cards || [])
  if (passCounts) {
    lastKnownPassCounts = { ...passCounts }
  }
  if (handSizes) {
    lastCardCounts = { ...handSizes }
    store.commit('setHandSizes', handSizes)
  }
  store.commit('addWinner', player)
})

socket.on('playerDisconnected', ({ username }) => {
  console.log(`Player ${username} disconnected`)
})

socket.on('gameOver', ({ winners, results }) => {
  console.log('Game over:', winners, results)
  if (winners && winners.length) {
    winners.forEach(winner => {
      if (!knownWinners[winner]) {
        knownWinners[winner] = true
      }
      store.commit('addWinner', winner)
    })
  }
  if (results) {
    store.commit('setGameResults', results)
  }
  store.commit('setGameOver', true)
})

export default socket
