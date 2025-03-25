import { io } from 'socket.io-client';
import store from '../store';

// Bestimme die richtige Basis-URL basierend auf der Umgebung
const baseURL = process.env.NODE_ENV === 'production' 
  ? window.location.origin // Verwende die aktuelle Domain im Produktionsmodus
  : 'http://localhost:3000'; // Explizite URL im Entwicklungsmodus

// Socket-Instance mit verbesserten Einstellungen erstellen
export const socket = io(baseURL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['websocket', 'polling'] // Versuche zuerst WebSocket, dann Polling
});

// Erweiterte Socket Event Listeners
socket.on('connect', () => {
  console.log('Connected to server', socket.id);
  
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

socket.on('disconnect', (reason) => {
  console.log(`Disconnected: ${reason}`);
  
  if (reason === 'io server disconnect') {
    // Der Server hat die Verbindung geschlossen
    socket.connect();
  }
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`Reconnected after ${attemptNumber} attempts`);
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log(`Reconnect attempt: ${attemptNumber}`);
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

// Event-Handler
socket.on('roomCreated', ({ roomId }) => {
  store.commit('setRoomId', roomId);
  console.log('Room created:', roomId);
});

socket.on('playersUpdate', ({ players }) => {
  store.commit('setPlayers', players);
  console.log('Players updated:', players);
});

socket.on('gameStarted', ({ currentPlayer, hand, cards, playerPositions, handSizes }) => {
  console.log('Game started event received:', { currentPlayer, handSizes, playerPositions });
  
  // Session im localStorage speichern
  const gameSession = {
    username: store.state.username,
    roomId: store.state.roomId,
    gameStarted: true,
    timestamp: new Date().getTime()
  };
  localStorage.setItem('gameSession', JSON.stringify(gameSession));
  
  store.commit('setGameStarted', true);
  store.commit('setCurrentPlayer', currentPlayer);
  store.commit('setHand', hand || []);
  store.commit('setCards', cards || []);
  store.commit('setPlayerPositions', playerPositions || {});
  store.commit('setHandSizes', handSizes || {});
});

socket.on('turnUpdate', ({ currentPlayer, cards, handSizes }) => {
  console.log('Turn update received:', { currentPlayer, handSizes });
  store.commit('setCurrentPlayer', currentPlayer);
  store.commit('setCards', cards || []);
  if (handSizes) {
    store.commit('setHandSizes', handSizes);
  }
});

socket.on('handUpdate', ({ hand }) => {
  store.commit('setHand', hand || []);
});

socket.on('passUpdate', ({ player, passCounts }) => {
  console.log('Pass update received:', passCounts);
  store.commit('setPassCounts', passCounts || {});
});

socket.on('playerForfeit', ({ player, cards, passCounts, handSizes }) => {
  console.log('Player forfeit:', player, handSizes);
  store.commit('setCards', cards || []);
  store.commit('setPassCounts', passCounts || {});
  if (handSizes) {
    store.commit('setHandSizes', handSizes);
  }
  store.commit('addWinner', player);
});

socket.on('playerDisconnected', ({ username }) => {
  console.log(`Player ${username} disconnected`);
});

socket.on('gameOver', ({ winners }) => {
  console.log('Game over:', winners);
  if (winners && winners.length) {
    winners.forEach(winner => {
      store.commit('addWinner', winner);
    });
  }
  store.commit('setGameOver', true);
});

socket.on('error', ({ message }) => {
  console.error('Socket error:', message);
  alert(message);
});

export default socket;