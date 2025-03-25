import { io } from 'socket.io-client';
import store from '../store';

// Bestimme die richtige Basis-URL basierend auf der Umgebung
const baseURL = process.env.NODE_ENV === 'production'
  ? 'https://erizzle.de'
  : window.location.origin;

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

socket.on('gameStarted', ({ currentPlayer, hand, cards, playerPositions }) => {
  store.commit('setGameStarted', true);
  store.commit('setCurrentPlayer', currentPlayer);
  store.commit('setHand', hand);
  store.commit('setCards', cards);
  store.commit('setPlayerPositions', playerPositions);
});

socket.on('turnUpdate', ({ currentPlayer, cards }) => {
  store.commit('setCurrentPlayer', currentPlayer);
  store.commit('setCards', cards);
});

socket.on('handUpdate', ({ hand }) => {
  store.commit('setHand', hand);
});

socket.on('passUpdate', ({ player, passCounts }) => {
  store.commit('setPassCounts', passCounts);
});

socket.on('playerForfeit', ({ player, cards, passCounts }) => {
  store.commit('setCards', cards);
  store.commit('setPassCounts', passCounts);
  store.commit('addWinner', player);
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

export default {
  socket
};