import { io } from 'socket.io-client';
import store from '../store';

// Bestimme die richtige Basis-URL basierend auf der Umgebung
const baseURL = process.env.NODE_ENV === 'production'
  ? 'https://erizzle.de'
  : window.location.origin;

// Socket-Instance erstellen
export const socket = io(baseURL, {
  path: '/socket.io',
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000
});

// Socket Event Listeners
socket.on('connect', () => {
  console.log('Connected to server');
  
  // Prüfe, ob eine Session wiederhergestellt werden muss
  const savedSession = localStorage.getItem('gameSession');
  if (savedSession) {
    try {
      const session = JSON.parse(savedSession);
      const currentTime = new Date().getTime();
      
      // Prüfe, ob die Session nicht älter als 2 Stunden ist
      if (session.timestamp && (currentTime - session.timestamp < 7200000)) {
        console.log('Attempting to reconnect to previous session...');
      }
    } catch (error) {
      console.error('Error parsing saved session:', error);
    }
  }
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

socket.on('connect_timeout', () => {
  console.error('Connection timeout');
});

socket.on('roomCreated', ({ roomId }) => {
  store.commit('setRoomId', roomId);
});

socket.on('playersUpdate', ({ players }) => {
  store.commit('setPlayers', players);
});

socket.on('gameStarted', ({ currentPlayer, hand, cards, playerPositions, handSizes }) => {
  store.commit('setGameStarted', true);
  store.commit('setCurrentPlayer', currentPlayer);
  store.commit('setHand', hand);
  store.commit('setCards', cards);
  store.commit('setPlayerPositions', playerPositions);
  store.commit('setHandSizes', handSizes);
});

socket.on('turnUpdate', ({ currentPlayer, cards, handSizes }) => {
  store.commit('setCurrentPlayer', currentPlayer);
  store.commit('setCards', cards);
  if (handSizes) {
    store.commit('setHandSizes', handSizes);
  }
});

socket.on('handUpdate', ({ hand }) => {
  store.commit('setHand', hand);
});

socket.on('passUpdate', ({ player, passCounts }) => {
  store.commit('setPassCounts', passCounts);
});

socket.on('playerForfeit', ({ player, cards, passCounts, handSizes }) => {
  store.commit('setCards', cards);
  store.commit('setPassCounts', passCounts);
  if (handSizes) {
    store.commit('setHandSizes', handSizes);
  }
  store.commit('addWinner', player);
});

socket.on('playerDisconnected', ({ username }) => {
  console.log(`Player ${username} disconnected`);
});

socket.on('gameOver', ({ winners }) => {
  winners.forEach(winner => {
    store.commit('addWinner', winner);
  });
  store.commit('setGameOver', true);
});

socket.on('error', ({ message }) => {
  console.error('Socket error:', message);
  alert(message);
});

export default socket;