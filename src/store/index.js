import { createStore } from 'vuex'
import { socket } from '../services/socketService'
import audioService from '../services/audioService'

export default createStore({
  state: {
    username: localStorage.getItem('username') || '',
    roomId: null,
    isHost: false,
    players: [],
    gameStarted: false,
    currentPlayer: null,
    cards: [],
    hand: [],
    handSizes: {},
    passCounts: {},
    playerPositions: {},
    winners: [],
    gameOver: false,
    gameResults: [],
    gameStartCalled: false
  },
  getters: {
    playableCards: (state) => {
      if (!state.gameStarted || state.currentPlayer !== state.username) {
        return []
      }
      return state.hand.filter(card => {
        return state.cards.some(boardCard => {
          if (boardCard.isIsolated) {
            return false
          }
          const sameSuit = boardCard.suit === card.suit
          const cardValue = parseInt(card.value)
          const boardValue = parseInt(boardCard.value)
          return sameSuit && Math.abs(cardValue - boardValue) === 1
        })
      })
    },
    remainingPasses: (state) => {
      return 3 - (state.passCounts[state.username] || 0)
    },
    myPosition: (state) => {
      return state.playerPositions[state.username] || 0
    },
    opponentPositions: (state) => {
      return state.playerPositions
    }
  },
  mutations: {
    setUsername(state, username) {
      state.username = username
      localStorage.setItem('username', username)
    },
    setRoomId(state, roomId) {
      state.roomId = roomId
    },
    setIsHost(state, isHost) {
      state.isHost = isHost
    },
    setPlayers(state, players) {
      state.players = players
      const currentPlayer = players.find(p => p.username === state.username)
      if (currentPlayer) {
        state.isHost = currentPlayer.isHost
      }
    },
    setGameStarted(state, gameStarted) {
      state.gameStarted = gameStarted
    },
    setGameStartCalled(state, value) {
      state.gameStartCalled = value
    },
    setCurrentPlayer(state, player) {
      state.currentPlayer = player
    },
    setCards(state, cards) {
      state.cards = cards
    },
    setHand(state, hand) {
      state.hand = hand
    },
    setHandSizes(state, handSizes) {
      state.handSizes = handSizes
    },
    setPassCounts(state, passCounts) {
      state.passCounts = passCounts
    },
    incrementPassCount(state, player) {
      if (!state.passCounts[player]) {
        state.passCounts[player] = 0
      }
      state.passCounts[player]++
    },
    setPlayerPositions(state, positions) {
      state.playerPositions = positions
    },
    addWinner(state, player) {
      if (!state.winners.includes(player)) {
        state.winners.push(player)
      }
    },
    setGameResults(state, results) {
      state.gameResults = results
    },
    setGameOver(state, gameOver) {
      state.gameOver = gameOver
    },
    resetGame(state) {
      state.gameStarted = false
      state.gameStartCalled = false
      state.currentPlayer = null
      state.cards = []
      state.hand = []
      state.handSizes = {}
      state.passCounts = {}
      state.winners = []
      state.gameOver = false
      state.gameResults = []
    }
  },
  actions: {
    createRoom({ commit }, username) {
      commit('setUsername', username)
      return new Promise((resolve, reject) => {
        socket.emit('createRoom', { username }, (response) => {
          if (response && response.roomId) {
            commit('setRoomId', response.roomId)
            commit('setIsHost', true)
            resolve(response.roomId)
          } else if (response && response.error) {
            reject(response.error)
          } else {
            reject('Unbekannter Fehler beim Erstellen des Raums')
          }
        })
      })
    },
    joinRoom({ commit }, { username, roomId }) {
      commit('setUsername', username)
      commit('setRoomId', roomId)
      return new Promise((resolve, reject) => {
        socket.emit('joinRoom', { username, roomId }, (response) => {
          if (response && response.error) {
            commit('setRoomId', null)
            reject(response.error)
          } else {
            if (response && response.username && response.username !== username) {
              commit('setUsername', response.username)
            }
            resolve()
          }
        })
      })
    },
    reconnectToRoom({ commit }, { username, roomId }) {
      commit('setUsername', username)
      commit('setRoomId', roomId)
      return new Promise((resolve, reject) => {
        socket.emit('reconnectToRoom', { username, roomId }, (response) => {
          if (response && response.error) {
            if (response.error.includes && response.error.includes('Spiel bereits gestartet')) {
              reject(response.error)
            } else {
              localStorage.removeItem('gameSession')
              commit('setRoomId', null)
              reject(response.error)
            }
          } else {
            resolve()
          }
        })
      })
    },
    startGame({ state, commit }) {
      if (state.gameStartCalled) {
        return
      }
      commit('setGameStartCalled', true)
      commit('setGameStarted', true)
      socket.emit('startGame', { roomId: state.roomId })
    },
    playCard({ state }, { card, position }) {
      socket.emit('playCard', {
        roomId: state.roomId,
        card,
        position
      })
    },
    pass({ state, commit }) {
      socket.emit('pass', { roomId: state.roomId })
      commit('incrementPassCount', state.username)
    },
    forfeit({ state }) {
      socket.emit('forfeit', { roomId: state.roomId })
    },
    leaveRoom({ commit, state }, payload = {}) {
      try {
        const roomId = payload?.roomId || state.roomId
        commit('resetGame')
        commit('setRoomId', null)
        localStorage.removeItem('gameSession')
        if (roomId) {
          socket.emit('leaveRoom', { roomId })
        }
        return Promise.resolve()
      } catch (error) {
        return Promise.resolve()
      }
    }
  }
})