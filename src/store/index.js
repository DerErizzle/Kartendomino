import { createStore } from 'vuex'
import { socket } from '../services/socketService'
import { findPlayableCards, findPositionForCard } from '../utils/cardUtils'

export default createStore({
  state: {
    username: localStorage.getItem('username') || '',
    roomId: null,
    isHost: false,
    players: [],
    gameStarted: false,
    currentPlayer: null,
    cards: [], // Karten auf dem Board
    hand: [], // Karten in der Hand des Spielers
    handSizes: {}, // Anzahl der Karten pro Spieler
    passCounts: {}, // Anzahl der Pässe pro Spieler
    playerPositions: {}, // Positionen für jeden Spieler (1, 2, 3)
    winners: [], // Gewinner in der Reihenfolge
    gameOver: false
  },
  getters: {
    playableCards: (state) => {
      if (!state.gameStarted || state.currentPlayer !== state.username) {
        return [];
      }
      
      return findPlayableCards(state.hand, state.cards);
    },
    
    remainingPasses: (state) => {
      return 3 - (state.passCounts[state.username] || 0);
    },
    
    myPosition: (state) => {
      return state.playerPositions[state.username] || 0;
    },
    
    opponentPositions: (state) => {
      return state.playerPositions;
    }
  },
  mutations: {
    setUsername(state, username) {
      state.username = username;
      localStorage.setItem('username', username);
    },
    
    setRoomId(state, roomId) {
      state.roomId = roomId;
    },
    
    setIsHost(state, isHost) {
      state.isHost = isHost;
    },
    
    setPlayers(state, players) {
      state.players = players;
      
      // Prüfen, ob der aktuelle Spieler der Host ist
      const currentPlayer = players.find(p => p.username === state.username);
      if (currentPlayer) {
        state.isHost = currentPlayer.isHost;
      }
    },
    
    setGameStarted(state, gameStarted) {
      state.gameStarted = gameStarted;
    },
    
    setCurrentPlayer(state, player) {
      state.currentPlayer = player;
    },
    
    setCards(state, cards) {
      state.cards = cards;
    },
    
    setHand(state, hand) {
      state.hand = hand;
    },
    
    setHandSizes(state, handSizes) {
      state.handSizes = handSizes;
    },
    
    setPassCounts(state, passCounts) {
      state.passCounts = passCounts;
    },
    
    incrementPassCount(state, player) {
      if (!state.passCounts[player]) {
        state.passCounts[player] = 0;
      }
      state.passCounts[player]++;
    },
    
    setPlayerPositions(state, positions) {
      state.playerPositions = positions;
    },
    
    addWinner(state, player) {
      if (!state.winners.includes(player)) {
        state.winners.push(player);
      }
    },
    
    setGameOver(state, gameOver) {
      state.gameOver = gameOver;
    },
    
    resetGame(state) {
      state.gameStarted = false;
      state.currentPlayer = null;
      state.cards = [];
      state.hand = [];
      state.handSizes = {};
      state.passCounts = {};
      state.winners = [];
      state.gameOver = false;
    }
  },
  actions: {
    createRoom({ commit }, username) {
      commit('setUsername', username);
      
      return new Promise((resolve, reject) => {
        socket.emit('createRoom', { username }, (response) => {
          if (response && response.roomId) {
            commit('setRoomId', response.roomId);
            commit('setIsHost', true);
            resolve(response.roomId);
          } else if (response && response.error) {
            reject(response.error);
          } else {
            reject('Unbekannter Fehler beim Erstellen des Raums');
          }
        });
      });
    },
    
    joinRoom({ commit }, { username, roomId }) {
      commit('setUsername', username);
      commit('setRoomId', roomId);
      
      return new Promise((resolve, reject) => {
        socket.emit('joinRoom', { username, roomId }, (response) => {
          if (response && response.error) {
            reject(response.error);
          } else {
            resolve();
          }
        });
      });
    },
    
    startGame({ state }) {
      socket.emit('startGame', { roomId: state.roomId });
    },
    
    playCard({ state }, { card, position }) {
      socket.emit('playCard', {
        roomId: state.roomId,
        card,
        position
      });
    },
    
    pass({ state, commit }) {
      socket.emit('pass', { roomId: state.roomId });
      commit('incrementPassCount', state.username);
    },
    
    forfeit({ state }) {
      socket.emit('forfeit', { roomId: state.roomId });
    },
    
    leaveRoom({ commit, state }) {
      socket.emit('leaveRoom', { roomId: state.roomId });
      commit('resetGame');
      commit('setRoomId', null);
    }
  }
})