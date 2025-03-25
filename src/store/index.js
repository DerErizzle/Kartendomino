import { createStore } from 'vuex'
import { socket } from '../services/socketService'

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
    passCounts: {}, // Anzahl der Pässe pro Spieler
    playerPositions: {}, // Positionen für jeden Spieler (1, 2, 3, 4)
    winners: [], // Gewinner in der Reihenfolge
    gameOver: false
  },
  getters: {
    playableCards: (state) => {
      if (!state.gameStarted || state.currentPlayer !== state.username) {
        return [];
      }

      return state.hand.filter(card => {
        // Prüfen, ob die Karte auf dem Board spielbar ist
        // Eine Karte ist spielbar, wenn sie die gleiche Farbe hat und der Wert
        // um 1 höher oder niedriger als eine der bereits gelegten Karten ist
        return state.cards.some(boardCard => {
          // Gleiche Farbe (gleiche Reihe) und Wert ist um 1 höher oder niedriger
          const sameSuit = boardCard.suit === card.suit;
          const cardValue = parseInt(card.value);
          const boardValue = parseInt(boardCard.value);
          const valueAbove = boardValue === cardValue + 1;
          const valueBelow = boardValue === cardValue - 1;

          // Prüfen, ob die Position neben der Karte frei ist
          const canPlaceNextTo = !state.cards.some(c => {
            if (valueAbove) {
              return c.position.row === boardCard.position.row &&
                c.position.col === boardCard.position.col - 1;
            } else if (valueBelow) {
              return c.position.row === boardCard.position.row &&
                c.position.col === boardCard.position.col + 1;
            }
            return false;
          });

          return sameSuit && (valueAbove || valueBelow) && canPlaceNextTo;
        });
      });
    },
    remainingPasses: (state) => {
      return 3 - (state.passCounts[state.username] || 0);
    },
    myPosition: (state) => {
      return state.playerPositions[state.username] || 0;
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
      state.winners.push(player);
    },
    setGameOver(state, gameOver) {
      state.gameOver = gameOver;
    },
    resetGame(state) {
      state.gameStarted = false;
      state.currentPlayer = null;
      state.cards = [];
      state.hand = [];
      state.passCounts = {};
      state.winners = [];
      state.gameOver = false;
    }
  },
  actions: {
    createRoom({ commit }, username) {
      commit('setUsername', username);
      commit('setIsHost', true);

      return new Promise((resolve, reject) => {
        socket.emit('createRoom', { username }, (response) => {
          if (response && response.roomId) {
            commit('setRoomId', response.roomId);
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
      commit('setIsHost', false);
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