const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Statische Dateien aus dem dist-Verzeichnis servieren
app.use(express.static(path.join(__dirname, '../dist')));

// Für alle Anfragen die index.html senden (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Utilities für das Kartenspiel
const SUITS = ['c', 'd', 'h', 's']; // clubs, diamonds, hearts, spades
const VALUES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13'];

// Hilfsfunktionen
function createDeck() {
  const deck = [];

  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({
        id: `${suit}${value}`,
        suit,
        value
      });
    }
  }

  return deck;
}

function shuffleDeck(deck) {
  const shuffled = [...deck];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function dealCards(deck, numPlayers) {
  const hands = Array(numPlayers).fill().map(() => []);
  const startingCards = [];

  // Die vier 7er Karten herausfiltern (für die Mitte)
  const sevenCards = deck.filter(card => card.value === '07');
  const remainingDeck = deck.filter(card => card.value !== '07');

  // Die Siebener in die Mitte legen, untereinander angeordnet
  for (let i = 0; i < sevenCards.length; i++) {
    const card = sevenCards[i];
    const suitIndex = SUITS.indexOf(card.suit);
    
    startingCards.push({
      ...card,
      position: {
        row: suitIndex, // Eine Reihe pro Farbe
        col: 7 // Spalte 7 für die 7er (in der horizontalen Mitte)
      }
    });
  }

  // Rest der Karten gleichmäßig auf die Spieler verteilen
  const cardsPerPlayer = Math.floor(remainingDeck.length / numPlayers);
  const shuffledRemaining = shuffleDeck(remainingDeck);
  
  for (let i = 0; i < numPlayers; i++) {
    hands[i] = shuffledRemaining.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer);
  }

  return {
    hands,
    startingCards
  };
}

function canPlayNextTo(card, boardCard) {
  // Gleiche Farbe und benachbarter Wert
  if (card.suit === boardCard.suit) {
    const cardValue = parseInt(card.value);
    const boardValue = parseInt(boardCard.value);
    
    return Math.abs(cardValue - boardValue) === 1;
  }
  
  return false;
}

function getCardPosition(card) {
  // Positionierung basierend auf dem Kartenwert und der Farbe
  const suitIndex = SUITS.indexOf(card.suit);
  const value = parseInt(card.value);
  
  return {
    row: suitIndex,  // Reihe = Farbe
    col: value       // Spalte = Wert
  };
}

function isPositionOccupied(cards, position) {
  return cards.some(card => {
    // Position berechnen
    const cardPos = card.position || getCardPosition(card);
    return cardPos.row === position.row && cardPos.col === position.col;
  });
}

function findPlayableCards(hand, boardCards) {
  return hand.filter(card => {
    // Eine Karte ist spielbar, wenn sie neben eine Karte auf dem Brett gelegt werden kann
    // und die Position noch nicht belegt ist
    return boardCards.some(boardCard => {
      // Prüfen, ob die Karte neben die Board-Karte gelegt werden kann
      if (canPlayNextTo(card, boardCard)) {
        // Position berechnen
        const position = getCardPosition(card);
        
        // Prüfen, ob die Position frei ist
        return !isPositionOccupied(boardCards, position);
      }
      
      return false;
    });
  });
}

function findPositionForCard(card, boardCards) {
  // Positionierung basierend auf dem Kartenwert und der Farbe
  const position = getCardPosition(card);
  
  // Prüfen, ob die Position frei ist
  if (!isPositionOccupied(boardCards, position)) {
    return position;
  }
  
  return null;
}

function generateRoomId() {
  return Math.floor(100 + Math.random() * 900).toString(); // 3-stellige Zahl
}

// Hilfsfunktion zum Erzeugen von Spielerpositionen
function getPlayerPositions(players, currentPlayerName) {
  const positions = {};
  
  // Finde den aktuellen Spieler
  const currentPlayerIndex = players.findIndex(p => p.username === currentPlayerName);
  
  if (currentPlayerIndex === -1) return positions;
  
  // Weise Positionen relativ zum aktuellen Spieler zu
  let posCounter = 1;
  
  for (let i = 0; i < players.length; i++) {
    if (i !== currentPlayerIndex) {
      positions[players[i].username] = posCounter;
      posCounter++;
    }
  }
  
  return positions;
}

// Speichert die Spielräume
const rooms = {};

// Socket.io Event-Handler
io.on('connection', (socket) => {
  console.log('Neuer Spieler verbunden:', socket.id);

  // Raum erstellen
  socket.on('createRoom', ({ username }, callback) => {
    const roomId = generateRoomId();

    // Prüfen, ob die Raum-ID bereits existiert
    if (rooms[roomId]) {
      return callback({ error: 'Raum-ID existiert bereits. Bitte versuche es erneut.' });
    }

    // Raum erstellen
    rooms[roomId] = {
      id: roomId,
      players: [{
        id: socket.id,
        username,
        isHost: true
      }],
      gameStarted: false,
      deck: [],
      cards: [], // Karten auf dem Board
      hands: {}, // Karten der Spieler
      handSizes: {}, // Anzahl der Karten pro Spieler
      passCounts: {}, // Anzahl der Pässe pro Spieler
      currentPlayerIndex: 0,
      winners: [],
      botPlayers: []
    };

    // Socket dem Raum beitreten lassen
    socket.join(roomId);

    // Dem Ersteller die Raum-ID zurückgeben
    callback({ roomId });

    // Spielerliste aktualisieren
    io.to(roomId).emit('playersUpdate', {
      players: rooms[roomId].players
    });
  });

  // Raum beitreten
  socket.on('joinRoom', ({ username, roomId }, callback) => {
    // Prüfen, ob der Raum existiert
    if (!rooms[roomId]) {
      if (callback) callback({ error: 'Raum existiert nicht.' });
      return socket.emit('error', { message: 'Raum existiert nicht.' });
    }

    // Prüfen, ob das Spiel bereits gestartet wurde
    if (rooms[roomId].gameStarted) {
      if (callback) callback({ error: 'Spiel bereits gestartet.' });
      return socket.emit('error', { message: 'Spiel bereits gestartet.' });
    }

    // Prüfen, ob der Raum voll ist
    if (rooms[roomId].players.length >= 4) {
      if (callback) callback({ error: 'Raum ist voll.' });
      return socket.emit('error', { message: 'Raum ist voll.' });
    }

    // Spieler dem Raum hinzufügen
    rooms[roomId].players.push({
      id: socket.id,
      username,
      isHost: false
    });

    // Socket dem Raum beitreten lassen
    socket.join(roomId);

    // Erfolgreiche Antwort senden
    if (callback) callback({ success: true });

    // Spielerliste aktualisieren
    io.to(roomId).emit('playersUpdate', {
      players: rooms[roomId].players
    });
  });

  // Wiederverbindung zu einem Raum
  socket.on('reconnectToRoom', ({ username, roomId }, callback) => {
    // Prüfen, ob der Raum existiert
    if (!rooms[roomId]) {
      if (callback) callback({ error: 'Raum existiert nicht mehr.' });
      return socket.emit('error', { message: 'Raum existiert nicht mehr.' });
    }

    // Prüfen, ob der Spieler im Raum war
    const existingPlayerIndex = rooms[roomId].players.findIndex(p => p.username === username);
    
    if (existingPlayerIndex === -1) {
      // Spieler war nicht im Raum, als neuen Spieler hinzufügen
      if (!rooms[roomId].gameStarted) {
        // Wenn das Spiel noch nicht gestartet ist, kann dem Raum beigetreten werden
        rooms[roomId].players.push({
          id: socket.id,
          username,
          isHost: false
        });
        
        // Socket dem Raum beitreten lassen
        socket.join(roomId);
        
        if (callback) callback({ success: true });
        
        // Spielerliste aktualisieren
        io.to(roomId).emit('playersUpdate', {
          players: rooms[roomId].players
        });
      } else {
        // Spiel bereits gestartet, kann nicht beitreten
        if (callback) callback({ error: 'Spiel bereits gestartet.' });
        return socket.emit('error', { message: 'Spiel bereits gestartet.' });
      }
    } else {
      // Spieler war bereits im Raum, ID aktualisieren
      rooms[roomId].players[existingPlayerIndex].id = socket.id;
      
      // Socket dem Raum beitreten lassen
      socket.join(roomId);
      
      if (callback) callback({ success: true });
      
      // Spielerliste aktualisieren
      io.to(roomId).emit('playersUpdate', {
        players: rooms[roomId].players
      });
      
      // Wenn das Spiel bereits gestartet wurde, Spielstatus senden
      if (rooms[roomId].gameStarted) {
        // Spielstatus an den wiederverbundenen Spieler senden
        socket.emit('gameStarted', {
          currentPlayer: rooms[roomId].players[rooms[roomId].currentPlayerIndex].username,
          hand: rooms[roomId].hands[username] || [],
          cards: rooms[roomId].cards,
          playerPositions: getPlayerPositions(rooms[roomId].players, username),
          handSizes: rooms[roomId].handSizes
        });
        
        // Status-Updates senden
        socket.emit('passUpdate', {
          passCounts: rooms[roomId].passCounts
        });
        
        // Wenn das Spiel vorbei ist
        if (rooms[roomId].winners && rooms[roomId].winners.length > 0) {
          socket.emit('gameOver', { winners: rooms[roomId].winners });
        }
      }
    }
  });

  // Spiel starten
  socket.on('startGame', ({ roomId }) => {
    const room = rooms[roomId];

    // Prüfen, ob der Raum existiert
    if (!room) {
      return socket.emit('error', { message: 'Raum existiert nicht.' });
    }

    // Prüfen, ob der Spieler der Host ist
    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) {
      return socket.emit('error', { message: 'Nur der Host kann das Spiel starten.' });
    }

    // Bots hinzufügen, wenn weniger als 4 Spieler
    const humanPlayersCount = room.players.length;
    const botsCount = Math.max(0, 4 - humanPlayersCount);

    if (botsCount > 0) {
      // Bot-Namen generieren
      const botNames = [];
      for (let i = 1; i <= botsCount; i++) {
        botNames.push(`Bot ${i}`);
      }

      // Bot-Spieler zum Raum hinzufügen
      for (let i = 0; i < botsCount; i++) {
        room.players.push({
          id: `bot_${i}_${Date.now()}`, // Eindeutige ID für Bots
          username: botNames[i],
          isHost: false,
          isBot: true
        });
      }
    }

    // Erstelle ein gemischtes Deck
    room.deck = shuffleDeck(createDeck());

    // Verteile die Karten
    const { hands, startingCards } = dealCards(room.deck, room.players.length);

    // Karten auf dem Board
    room.cards = startingCards;

    // Karten den Spielern zuweisen
    room.players.forEach((player, index) => {
      room.hands[player.username] = hands[index];
      room.handSizes[player.username] = hands[index].length;
    });

    // Zufälligen Startspieler auswählen
    room.currentPlayerIndex = Math.floor(Math.random() * room.players.length);

    // Passanzahl für alle Spieler auf 0 setzen
    room.players.forEach(player => {
      room.passCounts[player.username] = 0;
    });

    // Positionen der Spieler zuweisen (1-3 für Gegner, eigener Spieler hat keine spezifische Position)
    const playerPositions = {};
    room.players.forEach((player, index) => {
      // Berechne Position (1-3) für die Gegner
      if (index > 0 && index <= 3) {
        playerPositions[player.username] = index;
      }
    });

    // Spiel als gestartet markieren
    room.gameStarted = true;

    // Spielstart an alle Spieler senden
    room.players.forEach(player => {
      if (!player.isBot) { // Nur für menschliche Spieler
        io.to(player.id).emit('gameStarted', {
          currentPlayer: room.players[room.currentPlayerIndex].username,
          hand: room.hands[player.username],
          cards: room.cards,
          playerPositions: getPlayerPositions(room.players, player.username),
          handSizes: room.handSizes
        });
      }
    });

    // Wenn ein Bot an der Reihe ist, sofort einen Zug machen
    if (room.players[room.currentPlayerIndex].isBot) {
      makeAutomaticBotMove(room);
    }
  });

  // Karte spielen
  socket.on('playCard', ({ roomId, card, position }) => {
    const room = rooms[roomId];

    // Prüfen, ob der Raum existiert
    if (!room) {
      return socket.emit('error', { message: 'Raum existiert nicht.' });
    }

    // Prüfen, ob der Spieler an der Reihe ist
    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.username !== room.players[room.currentPlayerIndex].username) {
      return socket.emit('error', { message: 'Du bist nicht an der Reihe.' });
    }

    // Prüfen, ob der Spieler die Karte hat
    const playerHand = room.hands[player.username];
    const cardIndex = playerHand.findIndex(c => c.id === card.id);

    if (cardIndex === -1) {
      return socket.emit('error', { message: 'Du hast diese Karte nicht.' });
    }

    // Prüfen, ob die Karte gespielt werden kann
    const playableCards = findPlayableCards(playerHand, room.cards);
    const isPlayable = playableCards.some(c => c.id === card.id);

    if (!isPlayable) {
      return socket.emit('error', { message: 'Diese Karte kann nicht gespielt werden.' });
    }

    // Karte aus der Hand entfernen
    playerHand.splice(cardIndex, 1);
    
    // Handgröße aktualisieren
    room.handSizes[player.username] = playerHand.length;

    // Karte auf dem Board platzieren
    room.cards.push({
      ...card,
      position
    });

    // Prüfen, ob der Spieler gewonnen hat
    if (playerHand.length === 0) {
      room.winners.push(player.username);

      // Prüfen, ob das Spiel vorbei ist (alle Spieler haben gewonnen oder aufgegeben)
      const activePlayersCount = room.players.length - room.winners.length;

      if (activePlayersCount <= 1) {
        // Finde den letzten Spieler und füge ihn zu den Gewinnern hinzu
        const lastPlayer = room.players.find(p => !room.winners.includes(p.username));
        if (lastPlayer) {
          room.winners.push(lastPlayer.username);
        }

        // Spiel ist vorbei
        io.to(roomId).emit('gameOver', { winners: room.winners });
        return;
      }
    }

    // Nächsten Spieler bestimmen
    do {
      room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
    } while (room.winners.includes(room.players[room.currentPlayerIndex].username));

    // Updates an alle Spieler senden
    room.players.filter(p => !p.isBot).forEach(p => {
      // Update für den aktuellen Spieler
      if (p.id === player.id) {
        io.to(p.id).emit('handUpdate', { hand: playerHand });
      }

      // Update für alle Spieler
      io.to(p.id).emit('turnUpdate', {
        currentPlayer: room.players[room.currentPlayerIndex].username,
        cards: room.cards,
        handSizes: room.handSizes
      });
    });

    // Wenn ein Bot an der Reihe ist, seinen Zug ausführen
    if (room.players[room.currentPlayerIndex].isBot) {
      makeAutomaticBotMove(room);
    }
  });

  // Passen
  socket.on('pass', ({ roomId }) => {
    const room = rooms[roomId];

    // Prüfen, ob der Raum existiert
    if (!room) {
      return socket.emit('error', { message: 'Raum existiert nicht.' });
    }

    // Prüfen, ob der Spieler an der Reihe ist
    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.username !== room.players[room.currentPlayerIndex].username) {
      return socket.emit('error', { message: 'Du bist nicht an der Reihe.' });
    }

    // Prüfen, ob der Spieler noch passen kann
    if ((room.passCounts[player.username] || 0) >= 3) {
      return socket.emit('error', { message: 'Du hast bereits 3 Mal gepasst.' });
    }

    // Passanzahl erhöhen
    room.passCounts[player.username] = (room.passCounts[player.username] || 0) + 1;

    // Nächsten Spieler bestimmen
    do {
      room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
    } while (room.winners.includes(room.players[room.currentPlayerIndex].username));

    // Updates an alle Spieler senden
    room.players.filter(p => !p.isBot).forEach(p => {
      io.to(p.id).emit('passUpdate', {
        player: player.username,
        passCounts: room.passCounts
      });

      io.to(p.id).emit('turnUpdate', {
        currentPlayer: room.players[room.currentPlayerIndex].username,
        cards: room.cards,
        handSizes: room.handSizes
      });
    });

    // Wenn ein Bot an der Reihe ist, seinen Zug ausführen
    if (room.players[room.currentPlayerIndex].isBot) {
      makeAutomaticBotMove(room);
    }
  });

  // Aufgeben
  socket.on('forfeit', ({ roomId }) => {
    const room = rooms[roomId];

    // Prüfen, ob der Raum existiert
    if (!room) {
      return socket.emit('error', { message: 'Raum existiert nicht.' });
    }

    // Prüfen, ob der Spieler an der Reihe ist
    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.username !== room.players[room.currentPlayerIndex].username) {
      return socket.emit('error', { message: 'Du bist nicht an der Reihe.' });
    }

    // Karten des Spielers auf dem Board verteilen
    const playerHand = room.hands[player.username];

    // Karten auf dem Board platzieren (an passenden Positionen)
    for (const card of playerHand) {
      // Finde eine Position für die Karte
      const position = findPositionForCard(card, room.cards);

      if (position) {
        room.cards.push({
          ...card,
          position,
          disconnected: true
        });
      }
    }

    // Hand des Spielers leeren
    room.hands[player.username] = [];
    room.handSizes[player.username] = 0;

    // Spieler zu den Gewinnern hinzufügen (als letzter, da er aufgegeben hat)
    room.winners.push(player.username);

    // Prüfen, ob das Spiel vorbei ist (alle Spieler haben gewonnen oder aufgegeben)
    const activePlayersCount = room.players.length - room.winners.length;

    if (activePlayersCount <= 1) {
      // Finde den letzten Spieler und füge ihn zu den Gewinnern hinzu
      const lastPlayer = room.players.find(p => !room.winners.includes(p.username));
      if (lastPlayer) {
        room.winners.push(lastPlayer.username);
      }

      // Spiel ist vorbei
      room.players.filter(p => !p.isBot).forEach(p => {
        io.to(p.id).emit('gameOver', { winners: room.winners });
      });
      return;
    }

    // Nächsten Spieler bestimmen
    do {
      room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
    } while (room.winners.includes(room.players[room.currentPlayerIndex].username));

    // Updates an alle Spieler senden
    room.players.filter(p => !p.isBot).forEach(p => {
      io.to(p.id).emit('playerForfeit', {
        player: player.username,
        cards: room.cards,
        passCounts: room.passCounts,
        handSizes: room.handSizes
      });

      io.to(p.id).emit('turnUpdate', {
        currentPlayer: room.players[room.currentPlayerIndex].username,
        cards: room.cards,
        handSizes: room.handSizes
      });
    });

    // Wenn ein Bot an der Reihe ist, seinen Zug ausführen
    if (room.players[room.currentPlayerIndex].isBot) {
      makeAutomaticBotMove(room);
    }
  });

  // Raum verlassen
  socket.on('leaveRoom', ({ roomId }) => {
    leaveRoom(socket, roomId);
  });

  // Verbindung getrennt
  socket.on('disconnect', () => {
    // Bei Verbindungsverlust nicht sofort aus dem Raum entfernen
    // Stattdessen Status als "disconnected" markieren und auf Wiederverbindung warten
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        // Nur den Socket aus dem Raum entfernen, aber Spieler beibehalten
        socket.leave(roomId);
        
        // Markiere den Spieler als getrennt (für etwaige UI-Anpassungen)
        const player = room.players[playerIndex];
        player.disconnected = true;
        
        // Informiere andere Spieler
        io.to(roomId).emit('playerDisconnected', {
          username: player.username
        });
        
        // Nach 5 Minuten ohne Wiederverbindung den Spieler entfernen
        setTimeout(() => {
          // Prüfen, ob der Raum und der Spieler noch existieren
          if (rooms[roomId] && rooms[roomId].players) {
            const currentIndex = rooms[roomId].players.findIndex(p => 
              p.username === player.username && p.disconnected
            );
            
            if (currentIndex !== -1) {
              // Spieler endgültig entfernen
              leaveRoom({ id: rooms[roomId].players[currentIndex].id }, roomId);
            }
          }
        }, 5 * 60 * 1000); // 5 Minuten
      }
    }
  });
});

// Hilfsfunktion zum Verlassen eines Raums
function leaveRoom(socket, roomId) {
  const room = rooms[roomId];

  if (!room) return;

  // Finde den Spieler im Raum
  const playerIndex = room.players.findIndex(p => p.id === socket.id);

  if (playerIndex === -1) return;

  const player = room.players[playerIndex];

  // Spieler aus dem Raum entfernen
  room.players.splice(playerIndex, 1);

  // Socket aus dem Raum entfernen
  socket.leave(roomId);

  // Wenn der Raum leer ist, entferne ihn
  if (room.players.length === 0) {
    delete rooms[roomId];
    return;
  }

  // Falls das Spiel noch nicht gestartet wurde oder bereits vorbei ist
  if (!room.gameStarted || room.gameOver) {
    // Wenn der Host den Raum verlässt, mache den nächsten Spieler zum Host
    if (player.isHost && room.players.length > 0) {
      room.players[0].isHost = true;
    }

    // Spielerliste aktualisieren
    io.to(roomId).emit('playersUpdate', {
      players: room.players
    });

    return;
  }

  // Ansonsten, wenn das Spiel läuft

  // Wenn der Spieler gerade an der Reihe war, zum nächsten Spieler wechseln
  if (room.currentPlayerIndex === playerIndex) {
    room.currentPlayerIndex = room.currentPlayerIndex % room.players.length;
  } else if (room.currentPlayerIndex > playerIndex) {
    // Anpassen des Index, wenn ein Spieler vor dem aktuellen Spieler entfernt wurde
    room.currentPlayerIndex--;
  }

  // Spieler zu den Verlierern hinzufügen, falls er noch nicht aufgegeben hatte
  if (!room.winners.includes(player.username)) {
    room.winners.push(player.username);
  }

  // Karten des Spielers auf dem Board verteilen
  const playerHand = room.hands[player.username];

  if (playerHand && playerHand.length > 0) {
    // Karten auf dem Board platzieren (an passenden Positionen)
    for (const card of playerHand) {
      // Finde eine Position für die Karte
      const position = findPositionForCard(card, room.cards);

      if (position) {
        room.cards.push({
          ...card,
          position,
          disconnected: true
        });
      }
    }

    // Hand des Spielers leeren
    room.hands[player.username] = [];
    room.handSizes[player.username] = 0;
  }

  // Prüfen, ob das Spiel vorbei ist (alle Spieler haben gewonnen oder aufgegeben)
  const activePlayersCount = room.players.length - room.winners.filter(w =>
    room.players.some(p => p.username === w)
  ).length;

  if (activePlayersCount <= 1) {
    // Finde den letzten Spieler und füge ihn zu den Gewinnern hinzu
    const lastPlayer = room.players.find(p => !room.winners.includes(p.username));
    if (lastPlayer) {
      room.winners.push(lastPlayer.username);
    }

    // Spiel ist vorbei
    io.to(roomId).emit('gameOver', { winners: room.winners });
    return;
  }

  // Updates an alle Spieler senden
  io.to(roomId).emit('playerForfeit', {
    player: player.username,
    cards: room.cards,
    passCounts: room.passCounts,
    handSizes: room.handSizes
  });

  io.to(roomId).emit('turnUpdate', {
    currentPlayer: room.players[room.currentPlayerIndex].username,
    cards: room.cards,
    handSizes: room.handSizes
  });
}

// Funktion für automatische Bot-Züge
function makeAutomaticBotMove(room) {
  // Kurze Verzögerung, damit es natürlicher wirkt
  setTimeout(() => {
    const currentPlayerIndex = room.currentPlayerIndex;
    const currentPlayer = room.players[currentPlayerIndex];

    // Sicherstellen, dass es sich um einen Bot handelt
    if (!currentPlayer.isBot) return;

    const botUsername = currentPlayer.username;
    const botHand = room.hands[botUsername];

    // Spielbare Karten finden
    const playableCards = findPlayableCards(botHand, room.cards);

    if (playableCards.length > 0) {
      // Eine zufällige spielbare Karte auswählen
      const randomIndex = Math.floor(Math.random() * playableCards.length);
      const cardToPlay = playableCards[randomIndex];

      // Eine Position für die Karte finden
      const position = findPositionForCard(cardToPlay, room.cards);

      if (position) {
        // Karte aus der Hand entfernen
        const cardIndex = botHand.findIndex(c => c.id === cardToPlay.id);
        if (cardIndex !== -1) {
          botHand.splice(cardIndex, 1);
        }
        
        // Handgröße aktualisieren
        room.handSizes[botUsername] = botHand.length;

        // Karte auf das Board legen
        room.cards.push({
          ...cardToPlay,
          position
        });

        // Prüfen, ob der Bot gewonnen hat
        if (botHand.length === 0) {
          room.winners.push(botUsername);

          // Prüfen, ob das Spiel vorbei ist
          const activePlayersCount = room.players.length - room.winners.length;
          if (activePlayersCount <= 1) {
            // Finde den letzten Spieler und füge ihn zu den Gewinnern hinzu
            const lastPlayer = room.players.find(p => !room.winners.includes(p.username));
            if (lastPlayer) {
              room.winners.push(lastPlayer.username);
            }

            // Spiel ist vorbei
            room.players.filter(p => !p.isBot).forEach(player => {
              io.to(player.id).emit('gameOver', { winners: room.winners });
            });
            return;
          }
        }
      }
    } else {
      // Bot kann keine Karte spielen, also passen
      const passCount = room.passCounts[botUsername] || 0;

      if (passCount < 3) {
        // Passanzahl erhöhen
        room.passCounts[botUsername] = passCount + 1;
      } else {
        // Bot muss aufgeben
        // Verbleibende Karten auf dem Spielfeld verteilen
        for (const card of botHand) {
          const position = findPositionForCard(card, room.cards);
          if (position) {
            room.cards.push({
              ...card,
              position,
              disconnected: true
            });
          }
        }

        // Hand des Bots leeren
        room.hands[botUsername] = [];
        room.handSizes[botUsername] = 0;

        // Bot zu den Verlierern hinzufügen
        room.winners.push(botUsername);

        // Prüfen, ob das Spiel vorbei ist
        const activePlayersCount = room.players.length - room.winners.length;
        if (activePlayersCount <= 1) {
          // Finde den letzten Spieler und füge ihn zu den Gewinnern hinzu
          const lastPlayer = room.players.find(p => !room.winners.includes(p.username));
          if (lastPlayer) {
            room.winners.push(lastPlayer.username);
          }

          // Spiel ist vorbei
          room.players.filter(p => !p.isBot).forEach(player => {
            io.to(player.id).emit('gameOver', { winners: room.winners });
          });
          return;
        }
      }
    }

    // Zum nächsten Spieler wechseln
    do {
      room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
    } while (room.winners.includes(room.players[room.currentPlayerIndex].username));

    // Updates an alle (menschlichen) Spieler senden
    room.players.filter(p => !p.isBot).forEach(player => {
      io.to(player.id).emit('turnUpdate', {
        currentPlayer: room.players[room.currentPlayerIndex].username,
        cards: room.cards,
        handSizes: room.handSizes
      });

      // Passanzahl aktualisieren
      io.to(player.id).emit('passUpdate', {
        player: botUsername,
        passCounts: room.passCounts
      });
    });

    // Wenn wieder ein Bot an der Reihe ist, seinen Zug ausführen
    if (room.players[room.currentPlayerIndex].isBot) {
      makeAutomaticBotMove(room);
    }
  }, 1500); // 1,5 Sekunden Verzögerung
}

// Server starten
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});