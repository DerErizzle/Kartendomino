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
    const playableCards = botHand.filter(card => {
      // Überprüfen, ob die Karte gespielt werden kann
      return room.cards.some(boardCard => {
        // Gleiche Farbe und Wert ist um 1 höher oder niedriger
        const sameSuit = boardCard.suit === card.suit;
        const cardValue = parseInt(card.value);
        const boardValue = parseInt(boardCard.value);
        const valueAbove = boardValue === cardValue + 1;
        const valueBelow = boardValue === cardValue - 1;

        // Prüfen, ob die Position frei ist
        const position = getCardPosition(card, boardCard);
        const positionFree = position && !isPositionOccupied(room.cards, position);

        return sameSuit && (valueAbove || valueBelow) && positionFree;
      });
    });

    if (playableCards.length > 0) {
      // Eine zufällige spielbare Karte auswählen
      const randomIndex = Math.floor(Math.random() * playableCards.length);
      const cardToPlay = playableCards[randomIndex];

      // Eine Position für die Karte finden
      let position = null;
      for (const boardCard of room.cards) {
        if (boardCard.suit === cardToPlay.suit) {
          const cardValue = parseInt(cardToPlay.value);
          const boardValue = parseInt(boardCard.value);

          if (Math.abs(cardValue - boardValue) === 1) {
            // Berechne die Position basierend auf dem Wert
            position = {
              row: boardCard.position.row,
              col: cardValue < boardValue ? boardCard.position.col - 1 : boardCard.position.col + 1
            };

            // Prüfe, ob die Position frei ist
            if (!isPositionOccupied(room.cards, position)) {
              break;
            }
          }
        }
      }

      if (position) {
        // Karte aus der Hand entfernen
        const cardIndex = botHand.findIndex(c => c.id === cardToPlay.id);
        if (cardIndex !== -1) {
          botHand.splice(cardIndex, 1);
        }

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
          const position = findRandomPosition(card, room.cards);
          if (position) {
            room.cards.push({
              ...card,
              position
            });
          }
        }

        // Hand des Bots leeren
        room.hands[botUsername] = [];

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
        cards: room.cards
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

// Findet eine zufällige Position für eine Karte (für Bot-Aufgabe)
function findRandomPosition(card, boardCards) {
  // Zuerst versuchen, eine regelkonforme Position zu finden
  for (const boardCard of boardCards) {
    const position = getCardPosition(card, boardCard);
    if (position && !isPositionOccupied(boardCards, position)) {
      return position;
    }
  }

  // Wenn keine regelkonforme Position gefunden wurde, 
  // eine zufällige Position in der richtigen Reihe finden
  const suitRow = SUITS.indexOf(card.suit);
  for (let col = 0; col < 15; col++) {
    const position = { row: suitRow, col };
    if (!isPositionOccupied(boardCards, position)) {
      return position;
    }
  }

  return null; // Keine verfügbare Position gefunden
} const express = require('express');
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

// Hilffunktionen
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

  // Die Siebener in die Mitte legen, jede Farbe in ihrer eigenen Reihe
  for (let i = 0; i < sevenCards.length; i++) {
    const card = sevenCards[i];
    const suit = card.suit;
    const suitIndex = ['c', 'd', 'h', 's'].indexOf(suit);

    startingCards.push({
      ...card,
      position: {
        row: suitIndex, // Eine Reihe pro Farbe (0 = clubs, 1 = diamonds, 2 = hearts, 3 = spades)
        col: 7 // Immer Spalte 7 für die 7er
      }
    });
  }

  // Rest der Karten mischen
  const shuffledDeck = shuffleDeck(remainingDeck);

  // Jedem Spieler genau 12 Karten geben
  const cardsPerPlayer = 12;

  for (let i = 0; i < numPlayers; i++) {
    hands[i] = shuffledDeck.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer);
  }

  return {
    hands,
    startingCards
  };
}

function canPlayNextTo(card, targetCard) {
  // Gleiche Farbe und benachbarter Wert
  if (card.suit === targetCard.suit) {
    const cardValue = parseInt(card.value);
    const targetValue = parseInt(targetCard.value);

    return Math.abs(cardValue - targetValue) === 1;
  }

  return false;
}

function getCardPosition(card, targetCard) {
  const cardValue = parseInt(card.value);
  const targetValue = parseInt(targetCard.value);

  // Karten müssen in der gleichen Reihe liegen (basierend auf der Farbe)
  // Die Karten müssen benachbarte Werte haben
  if (card.suit === targetCard.suit) {
    // Gleiche Farbe, Wert ist um 1 höher
    if (cardValue === targetValue + 1) {
      return {
        row: targetCard.position.row, // Gleiche Reihe (gleiche Farbe)
        col: targetCard.position.col + 1 // Eine Spalte rechts
      };
    }

    // Gleiche Farbe, Wert ist um 1 niedriger
    if (cardValue === targetValue - 1) {
      return {
        row: targetCard.position.row, // Gleiche Reihe (gleiche Farbe)
        col: targetCard.position.col - 1 // Eine Spalte links
      };
    }
  }

  return null;
}

function findPlayableCards(hand, boardCards) {
  return hand.filter(card => {
    return boardCards.some(boardCard => canPlayNextTo(card, boardCard));
  });
}

function isPositionOccupied(cards, position) {
  return cards.some(card =>
    card.position.row === position.row && card.position.col === position.col
  );
}

function findPositionForCard(card, boardCards) {
  for (const boardCard of boardCards) {
    if (canPlayNextTo(card, boardCard)) {
      const position = getCardPosition(card, boardCard);

      // Prüfen, ob die Position schon belegt ist
      if (position && !isPositionOccupied(boardCards, position)) {
        return position;
      }
    }
  }

  return null;
}

function generateRoomId() {
  return Math.floor(100 + Math.random() * 900).toString(); // 3-stellige Zahl
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
    });

    // Zufälligen Startspieler auswählen
    room.currentPlayerIndex = Math.floor(Math.random() * room.players.length);

    // Passanzahl für alle Spieler auf 0 setzen
    room.players.forEach(player => {
      room.passCounts[player.username] = 0;
    });

    // Positionen der Spieler zuweisen (1-4)
    const playerPositions = {};
    room.players.forEach((player, index) => {
      const position = ((room.currentPlayerIndex + index) % room.players.length) + 1;
      playerPositions[player.username] = position;
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
          playerPositions
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
        cards: room.cards
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
        cards: room.cards
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

    // Karten auf dem Board platzieren (an benachbarten Positionen)
    for (const card of playerHand) {
      // Finde eine Position für die Karte
      const position = findRandomPosition(card, room.cards);

      if (position) {
        room.cards.push({
          ...card,
          position
        });
      }
    }

    // Hand des Spielers leeren
    room.hands[player.username] = [];

    // Spieler zu den Verlierern hinzufügen
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
        passCounts: room.passCounts
      });

      io.to(p.id).emit('turnUpdate', {
        currentPlayer: room.players[room.currentPlayerIndex].username,
        cards: room.cards
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
    // Finde alle Räume, in denen der Spieler ist
    for (const roomId in rooms) {
      leaveRoom(socket, roomId);
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
    // Karten auf dem Board platzieren (an zufälligen freien Positionen)
    for (const card of playerHand) {
      // Finde eine freie Position für die Karte
      const position = findPositionForCard(card, room.cards);

      if (position) {
        room.cards.push({
          ...card,
          position
        });
      }
    }

    // Hand des Spielers leeren
    room.hands[player.username] = [];
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
    passCounts: room.passCounts
  });

  io.to(roomId).emit('turnUpdate', {
    currentPlayer: room.players[room.currentPlayerIndex].username,
    cards: room.cards
  });
}

// Server starten
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});