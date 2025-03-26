import { io } from 'socket.io-client';
import store from '../store';
import audioService from './audioService';

// Verbesserte Backend-URL-Erkennung
const getBackendUrl = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Im Produktionsmodus: Verwende dieselbe Domain und Schema/Protokoll
    const protocol = window.location.protocol; // 'https:' oder 'http:'
    const hostname = window.location.hostname; // 'erizzle.de'

    // Verwende leeren Port-String (statt :undefined), wenn kein Port vorhanden ist
    const port = window.location.port ? `:${window.location.port}` : '';

    return `${protocol}//${hostname}${port}`;
  } else {
    // Im Entwicklungsmodus: Verwende localhost mit Port 3000 für Backend
    return 'http://localhost:3000';
  }
};

const socketOptions = {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['polling'] // Nur Polling verwenden, kein WebSocket
};

// Ausgabe der Verbindungsdaten für Debugging
console.log('Socket.io wird verbunden mit:', {
  url: getBackendUrl(),
  options: socketOptions,
  environment: process.env.NODE_ENV || 'development'
});

// Socket-Instance erstellen
export const socket = io(getBackendUrl(), socketOptions);

// Cache für den letzten bekannten Zustand der Pass-Zähler
let lastKnownPassCounts = {};
// Cache für die letzte Karte die gespielt wurde
let lastPlayedCard = null;
// Cache für die Gewinner, um wiederholte Sounds zu vermeiden
let knownWinners = {};
// Cache für die zuletzt gespielte Kartenanzahl, um Aufgabe zu erkennen
let lastCardCounts = {};

// Erweiterte Socket Event Listeners mit besserer Fehlerbehandlung
socket.on('connect', () => {
  console.log('Connected to server:', {
    socketId: socket.id,
    connected: socket.connected,
    transport: socket.io.engine.transport.name
  });

  // Versuche Session wiederherzustellen
  const savedSession = localStorage.getItem('gameSession');
  if (savedSession) {
    try {
      const session = JSON.parse(savedSession);
      const currentTime = new Date().getTime();

      if (session.timestamp && (currentTime - session.timestamp < 7200000)) {
        console.log('Attempting to reconnect to previous session:', session);
      }
    } catch (error) {
      console.error('Error parsing saved session:', error);
    }
  }
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', {
    message: error.message,
    description: error.description,
    transport: socket.io?.engine?.transport?.name || 'unknown',
    url: getBackendUrl()
  });
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

  // Initialisiere den Cache mit den Startwerten
  lastKnownPassCounts = {};
  lastPlayedCard = null;
  knownWinners = {};
  lastCardCounts = { ...handSizes };

  store.commit('setGameStarted', true);
  store.commit('setCurrentPlayer', currentPlayer);
  store.commit('setHand', hand || []);
  store.commit('setCards', cards || []);
  store.commit('setPlayerPositions', playerPositions || {});
  store.commit('setHandSizes', handSizes || {});
});

// Helfer-Funktion, um zu erkennen, ob ein Spieler aufgegeben hat
function detectSurrender(oldHandSizes, newHandSizes) {
  const surrenderedPlayers = [];
  
  // Gehe alle Spieler durch
  Object.keys(newHandSizes).forEach(player => {
    // Wenn ein Spieler plötzlich 0 Karten hat, hat er wahrscheinlich aufgegeben
    if (oldHandSizes[player] > 0 && newHandSizes[player] === 0) {
      // Nicht hinzufügen, wenn es ein bekannter Gewinner ist
      if (!knownWinners[player]) {
        surrenderedPlayers.push(player);
      }
    }
  });
  
  return surrenderedPlayers;
}

socket.on('turnUpdate', ({ currentPlayer, cards, handSizes }) => {
  console.log('Turn update received:', { currentPlayer, handSizes });
  
  const username = store.state.username;
  const oldCurrentPlayer = store.state.currentPlayer;
  
  // Play card sound when a card is played (cards length increased)
  const oldCardsLength = store.state.cards ? store.state.cards.length : 0;
  
  if (cards && cards.length > oldCardsLength) {
    // Only play sound if it's not the player who played the card 
    // (the player's own card sound is played directly on click)
    if (oldCurrentPlayer !== username) {
      audioService.playCardSound();
    }
  }
  
  // Prüfe auf Aufgabe-Aktionen durch Vergleich der Handgrößen
  if (handSizes) {
    const oldHandSizes = lastCardCounts;
    const surrenderedPlayers = detectSurrender(oldHandSizes, handSizes);
    
    if (surrenderedPlayers.length > 0) {
      // Spiele für jeden aufgebenden Spieler den Sound ab
      surrenderedPlayers.forEach(player => {
        if (player !== username) {
          console.log('Player surrendered (detected in turnUpdate):', player);
          audioService.playSurrenderSound();
          
          // Markiere als bekannten Gewinner
          knownWinners[player] = true;
        }
      });
    }
    
    // Aktualisiere Cache
    lastCardCounts = { ...handSizes };
  }
  
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

  // Nur einen Sound abspielen, wenn ein Spieler tatsächlich gepasst hat
  // (d.h. sein Pass-Zähler hat sich erhöht)
  if (player && player !== store.state.username && passCounts) {
    // Prüfen, ob der Pass-Zähler erhöht wurde
    const currentPassCount = passCounts[player] || 0;
    const previousPassCount = lastKnownPassCounts[player] || 0;

    if (currentPassCount > previousPassCount) {
      // Der Spieler hat wirklich gepasst, spiele den Sound ab
      audioService.playOtherPassSound();
    }
  }

  // Cache aktualisieren
  if (passCounts) {
    lastKnownPassCounts = { ...passCounts };
  }

  store.commit('setPassCounts', passCounts || {});
});

socket.on('playerForfeit', ({ player, cards, passCounts, handSizes }) => {
  console.log('Player forfeit:', player, handSizes);
  
  const currentUsername = store.state.username;
  
  // Play surrender sound if another player surrenders
  // (eigenes Aufgeben wird direkt in der Game-Komponente gehandhabt)
  if (player !== currentUsername && !knownWinners[player]) {
    console.log('Playing surrender sound for player:', player);
    audioService.playSurrenderSound();
    
    // Markieren als bekannten Gewinner
    knownWinners[player] = true;
  }
  
  store.commit('setCards', cards || []);

  // Aktualisiere den Pass-Cache
  if (passCounts) {
    lastKnownPassCounts = { ...passCounts };
  }

  // Aktualisiere den Handgrößen-Cache
  if (handSizes) {
    lastCardCounts = { ...handSizes };
    store.commit('setHandSizes', handSizes);
  }
  
  store.commit('addWinner', player);
});

socket.on('playerDisconnected', ({ username }) => {
  console.log(`Player ${username} disconnected`);
});

socket.on('gameOver', ({ winners, results }) => {
  console.log('Game over:', winners, results);
  
  if (winners && winners.length) {
    winners.forEach(winner => {
      if (!knownWinners[winner]) {
        knownWinners[winner] = true;
      }
      store.commit('addWinner', winner);
    });
  }
  
  if (results) {
    store.commit('setGameResults', results);
  }
  
  store.commit('setGameOver', true);
});

socket.on('error', ({ message }) => {
  console.error('Socket error:', message);
  alert(message);
});

export default socket;