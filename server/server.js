const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const isProduction = process.env.NODE_ENV === 'production';

const PORT = process.env.PORT || (isProduction ? 8080 : 3000);

const allowedOrigins = isProduction
  ? ['https://erizzle.de']
  : ['http://localhost:8080', 'http://localhost:3000', 'http://127.0.0.1:8080'];

const io = socketIo(server, {
  transports: ['polling'],
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1 || !isProduction) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy restriction'));
      }
    },
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(express.static(path.join(__dirname, '..')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

const SUITS = ['s', 'c', 'h', 'd'];
const VALUES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13'];

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
  const sevenCards = deck.filter(card => card.value === '07');
  const remainingDeck = deck.filter(card => card.value !== '07');

  for (let i = 0; i < sevenCards.length; i++) {
    const card = sevenCards[i];
    const suitIndex = SUITS.indexOf(card.suit);
    startingCards.push({
      ...card,
      position: {
        row: suitIndex,
        col: 7
      }
    });
  }

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

function isCardIsolated(card, boardCards) {
  if (card.value === '07') return false;
  const cardValue = parseInt(card.value);
  const cardSuit = card.suit;
  const suitCards = boardCards.filter(bc => bc.suit === cardSuit);
  if (suitCards.length <= 1) return true;
  if (cardValue < 7) {
    let current = cardValue;
    while (current < 7) {
      current++;
      if (!suitCards.some(c => parseInt(c.value) === current)) {
        return true;
      }
    }
  } else {
    let current = cardValue;
    while (current > 7) {
      current--;
      if (!suitCards.some(c => parseInt(c.value) === current)) {
        return true;
      }
    }
  }
  return false;
}

function markIsolatedCards(boardCards) {
  return boardCards.map(card => ({
    ...card,
    isIsolated: isCardIsolated(card, boardCards)
  }));
}

function canPlayNextTo(card, boardCard) {
  if (card.suit === boardCard.suit) {
    const cardValue = parseInt(card.value);
    const boardValue = parseInt(boardCard.value);
    return Math.abs(cardValue - boardValue) === 1;
  }
  return false;
}

function getCardPosition(card) {
  const suitIndex = SUITS.indexOf(card.suit);
  const value = parseInt(card.value);
  return {
    row: suitIndex,
    col: value
  };
}

function isPositionOccupied(cards, position) {
  return cards.some(card => {
    const cardPos = card.position || getCardPosition(card);
    return cardPos.row === position.row && cardPos.col === position.col;
  });
}

function findPlayableCards(hand, boardCards) {
  return hand.filter(card => {
    return boardCards.some(boardCard => {
      if (boardCard.isIsolated) {
        return false;
      }
      if (canPlayNextTo(card, boardCard)) {
        const position = getCardPosition(card);
        return !isPositionOccupied(boardCards, position);
      }
      return false;
    });
  });
}

function findPositionForCard(card, boardCards) {
  const position = getCardPosition(card);
  if (!isPositionOccupied(boardCards, position)) {
    return position;
  }
  return null;
}

function getUniqueUsername(username, players) {
  const activePlayers = players.filter(p => !p.disconnected);
  if (!activePlayers.some(p => p.username === username)) {
    return username;
  }

  let counter = 2;
  let newUsername = `${username} ${counter}`;
  while (activePlayers.some(p => p.username === newUsername)) {
    counter++;
    newUsername = `${username} ${counter}`;
  }
  return newUsername;
}

function generateRoomId() {
  return Math.floor(100 + Math.random() * 900).toString();
}

function getPlayerPositions(players, currentPlayerName) {
  const currentIndex = players.findIndex(p => p.username === currentPlayerName)
  if (currentIndex === -1) return {}

  const reordered = []
  for (let i = 0; i < players.length; i++) {
    reordered.push(players[(currentIndex + i) % players.length])
  }

  const positions = {}
  reordered.forEach((player, index) => {
    positions[player.username] = index
  })

  return positions
}

function countHumanPlayers(room) {
  if (!room || !room.players) return 0;
  return room.players.filter(player => !player.isBot && !player.disconnected).length;
}

function calculateResults(room) {
  const results = [...room.gameResults];
  const regularWinners = results.filter(r => !r.forfeit);
  const forfeiters = results.filter(r => r.forfeit);
  let place = 1;
  regularWinners.forEach(winner => {
    winner.place = place++;
  });
  forfeiters.reverse().forEach(forfeiter => {
    forfeiter.place = place++;
  });
  return results.sort((a, b) => a.place - b.place);
}

function checkGameOverAndAdvanceTurn(room, playerWhoActedUsername) {
  const playerIndex = room.players.findIndex(p => p.username === playerWhoActedUsername);
  const player = room.players[playerIndex];

  if (player && room.hands[player.username]?.length === 0 && !room.winners.includes(player.username)) {
    if (!room.gameResults.some(r => r.username === player.username)) {
      room.gameResults.push({ username: player.username, forfeit: false });
    }
    if (!room.winners.includes(player.username)) {
      room.winners.push(player.username);
    }
  }

  const activePlayers = room.players.filter(p => !room.winners.includes(p.username));

  if (activePlayers.length <= 1) {
    if (activePlayers.length === 1 && !room.winners.includes(activePlayers[0].username)) {
      if (!room.gameResults.some(r => r.username === activePlayers[0].username)) {
        room.gameResults.push({ username: activePlayers[0].username, forfeit: false });
      }
      if (!room.winners.includes(activePlayers[0].username)) {
        room.winners.push(activePlayers[0].username);
      }
    }
    const finalResults = calculateResults(room);
    room.gameOver = true;
    io.to(room.id).emit('gameOver', {
      winners: room.winners,
      results: finalResults
    });
    return true;
  }

  do {
    room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
  } while (room.winners.includes(room.players[room.currentPlayerIndex].username));

  room.players.filter(p => !p.isBot && !p.disconnected).forEach(p => {
    io.to(p.id).emit('turnUpdate', {
      currentPlayer: room.players[room.currentPlayerIndex].username,
      cards: room.cards,
      handSizes: room.handSizes
    });
  });

  if (room.players[room.currentPlayerIndex]?.isBot) {
    makeAutomaticBotMove(room);
  }

  return false;
}

const rooms = {};
const roomCleanupTimeouts = {};

io.on('connection', (socket) => {
  console.log('Neuer Spieler verbunden:', socket.id);

  socket.on('createRoom', ({ username }, callback) => {
    let roomId = generateRoomId();
    while (rooms[roomId]) {
      roomId = generateRoomId();
    }
    const finalUsername = getUniqueUsername(username, []);
    rooms[roomId] = {
      id: roomId,
      players: [{
        id: socket.id,
        username: finalUsername,
        isHost: true,
        disconnected: false
      }],
      gameStarted: false,
      gameOver: false,
      deck: [],
      cards: [],
      hands: {},
      handSizes: {},
      passCounts: {},
      currentPlayerIndex: 0,
      winners: [],
      gameResults: [],
      botPlayers: []
    };
    socket.join(roomId);
    callback({ roomId, username: finalUsername });
    io.to(roomId).emit('playersUpdate', { players: rooms[roomId].players.filter(p => !p.disconnected) });
  });

  socket.on('joinRoom', ({ username, roomId }, callback) => {
    const room = rooms[roomId];
    if (!room) {
      if (callback) callback({ error: 'Raum existiert nicht.' });
      return socket.emit('error', { message: 'Raum existiert nicht.' });
    }

    // Prüfen, ob jemand mit demselben Namen und noch "aktiver" Verbindung existiert
    const existingActive = room.players.find(
      p => p.username === username && !p.disconnected
    );

    // Gleicher Name -> es gibt 2 Fälle:
    // 1) gleicher Name, gleiche Socket-ID => selbe Person (nicht neu anlegen)
    // 2) gleicher Name, andere Socket-ID => Name schon vergeben
    if (existingActive) {
      if (existingActive.id === socket.id) {
        // Dieselbe Socket-ID, also wirklich derselbe Player => einfach Raum joinen (falls noch nicht geschehen)
        socket.join(roomId);
        if (callback) callback({ success: true, username });
        io.to(roomId).emit('playersUpdate', { players: room.players });
        return;
      } else {
        // Gleicher Name, aber andere Socket-ID => Name vergeben
        if (callback) callback({ error: 'Spielername bereits vergeben.' });
        return;
      }
    }

    // Falls wir hier sind, existiert kein aktiver Spieler mit demselben Namen
    // Prüfen, ob ein "disconnecteter" Spieler unter diesem Namen existiert
    const existingDisconnected = room.players.find(
      p => p.username === username && p.disconnected
    );

    if (existingDisconnected) {
      existingDisconnected.id = socket.id;
      existingDisconnected.disconnected = false;
      socket.join(roomId);
      if (callback) callback({ success: true, username });
      io.to(roomId).emit('playersUpdate', {
        players: room.players
      });
      return;
    }

    if (room.gameStarted) {
      if (callback) callback({ error: 'Spiel bereits gestartet.' });
      return socket.emit('error', { message: 'Spiel bereits gestartet.' });
    }

    if (room.players.length >= 4) {
      if (callback) callback({ error: 'Raum ist voll.' });
      return socket.emit('error', { message: 'Raum ist voll.' });
    }

    // Neuer Spieler wird eingetragen
    room.players.push({
      id: socket.id,
      username,
      isHost: false,
      disconnected: false
    });

    socket.join(roomId);
    if (callback) callback({ success: true, username });
    io.to(roomId).emit('playersUpdate', {
      players: room.players
    });
  });

  socket.on('startGame', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) {
      return socket.emit('error', { message: 'Raum existiert nicht.' });
    }
    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isHost || player.disconnected) {
      return socket.emit('error', { message: 'Nur der Host kann das Spiel starten.' });
    }
    if (room.gameStarted) {
      return socket.emit('error', { message: 'Spiel läuft bereits.' });
    }
    const humanPlayers = room.players.filter(p => !p.isBot && !p.disconnected);
    const botsNeeded = Math.max(0, 4 - humanPlayers.length);
    for (let i = 1; i <= botsNeeded; i++) {
      let botName = `Bot ${i}`;
      let counter = i;
      while (room.players.some(p => p.username === botName)) {
        counter++;
        botName = `Bot ${counter}`;
      }
      room.players.push({
        id: `bot_${i}_${Date.now()}`,
        username: botName,
        isHost: false,
        isBot: true,
        disconnected: false
      });
    }
    room.deck = shuffleDeck(createDeck());
    const { hands, startingCards } = dealCards(room.deck, room.players.length);
    room.cards = startingCards;
    room.hands = {};
    room.handSizes = {};
    room.passCounts = {};
    room.winners = [];
    room.gameResults = [];
    room.gameOver = false;
    room.players.forEach((p, index) => {
      room.hands[p.username] = hands[index];
      room.handSizes[p.username] = hands[index].length;
      room.passCounts[p.username] = 0;
    });
    room.currentPlayerIndex = Math.floor(Math.random() * room.players.length);
    room.gameStarted = true;
    room.players.filter(p => !p.isBot && !p.disconnected).forEach(p => {
      io.to(p.id).emit('gameStarted', {
        currentPlayer: room.players[room.currentPlayerIndex].username,
        hand: room.hands[p.username],
        cards: room.cards,
        playerPositions: getPlayerPositions(room.players, p.username),
        handSizes: room.handSizes
      });
    });
    if (room.players[room.currentPlayerIndex]?.isBot) {
      makeAutomaticBotMove(room);
    }
  });

  socket.on('playCard', ({ roomId, card, position }) => {
    const room = rooms[roomId];
    if (!room || !room.gameStarted || room.gameOver) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.disconnected || player.username !== room.players[room.currentPlayerIndex].username) {
      return socket.emit('error', { message: 'Du bist nicht an der Reihe oder das Spiel ist vorbei.' });
    }
    const playerHand = room.hands[player.username];
    const cardIndex = playerHand.findIndex(c => c.id === card.id);
    if (cardIndex === -1) {
      return socket.emit('error', { message: 'Du hast diese Karte nicht.' });
    }
    const playableCards = findPlayableCards(playerHand, room.cards);
    if (!playableCards.some(c => c.id === card.id)) {
      return socket.emit('error', { message: 'Diese Karte kann nicht gespielt werden.' });
    }
    playerHand.splice(cardIndex, 1);
    room.handSizes[player.username] = playerHand.length;
    room.cards.push({ ...card, position });
    room.cards = markIsolatedCards(room.cards);
    io.to(player.id).emit('handUpdate', { hand: playerHand });
    checkGameOverAndAdvanceTurn(room, player.username);
  });

  socket.on('pass', ({ roomId }) => {
    const room = rooms[roomId]
    if (!room) {
      return socket.emit('error', { message: 'Raum existiert nicht.' })
    }
    const player = room.players.find(p => p.id === socket.id)
    if (!player || player.username !== room.players[room.currentPlayerIndex].username) {
      return socket.emit('error', { message: 'Du bist nicht an der Reihe.' })
    }
    const passCount = room.passCounts[player.username] || 0
    if (passCount >= 3) {
      return socket.emit('error', { message: 'Du hast bereits 3 Mal gepasst.' })
    }
    room.passCounts[player.username] = passCount + 1
    room.players
      .filter(p => !p.isBot)
      .forEach(p => {
        io.to(p.id).emit('passUpdate', {
          player: player.username,
          passCounts: room.passCounts
        })
      })
    checkGameOverAndAdvanceTurn(room, player.username)
  })

  socket.on('forfeit', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || !room.gameStarted || room.gameOver) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.disconnected || player.username !== room.players[room.currentPlayerIndex].username) {
      return socket.emit('error', { message: 'Du bist nicht an der Reihe oder das Spiel ist vorbei.' });
    }
    const playerHand = room.hands[player.username];
    const playableCards = findPlayableCards(playerHand, room.cards);
    if (playableCards.length > 0 && room.passCounts[player.username] < 3) {
      return socket.emit('error', { message: 'Du hast noch spielbare Karten / nicht 3x gepasst und kannst nicht aufgeben.' });
    }
    for (const card of playerHand) {
      const position = findPositionForCard(card, room.cards);
      if (position) {
        room.cards.push({ ...card, position, forfeitedCard: true });
      }
    }
    room.cards = markIsolatedCards(room.cards);
    room.hands[player.username] = [];
    room.handSizes[player.username] = 0;
    if (!room.gameResults.some(r => r.username === player.username)) {
      room.gameResults.push({ username: player.username, forfeit: true });
    } else {
      const result = room.gameResults.find(r => r.username === player.username);
      if (result) result.forfeit = true;
    }
    if (!room.winners.includes(player.username)) {
      room.winners.push(player.username);
    }
    io.to(player.id).emit('handUpdate', { hand: [] });
    io.to(roomId).emit('playerForfeit', {
      player: player.username,
      cards: room.cards,
      handSizes: room.handSizes
    });
    checkGameOverAndAdvanceTurn(room, player.username);
  });

  socket.on('leaveRoom', ({ roomId }) => {
    leaveRoom(socket, roomId);
  });

  socket.on('disconnect', () => {
    console.log('Spieler getrennt:', socket.id);
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        console.log(`Spieler ${player.username} (ID: ${socket.id}) disconnected from room ${roomId}`);
        player.disconnected = true;
        socket.leave(roomId);
        io.to(roomId).emit('playerDisconnected', { username: player.username });
        io.to(roomId).emit('playersUpdate', { players: room.players.filter(p => !p.disconnected) });
        if (room.gameStarted && !room.gameOver && room.players[room.currentPlayerIndex].id === socket.id) {
          console.log(`Player ${player.username} disconnected on their turn. Forfeiting and advancing.`);
          const playerHand = room.hands[player.username] || [];
          for (const card of playerHand) {
            const position = findPositionForCard(card, room.cards);
            if (position) {
              room.cards.push({ ...card, position, forfeitedCard: true, disconnected: true });
            }
          }
          room.cards = markIsolatedCards(room.cards);
          room.hands[player.username] = [];
          room.handSizes[player.username] = 0;
          if (!room.gameResults.some(r => r.username === player.username)) {
            room.gameResults.push({ username: player.username, forfeit: true });
          } else {
            const result = room.gameResults.find(r => r.username === player.username);
            if (result) result.forfeit = true;
          }
          if (!room.winners.includes(player.username)) {
            room.winners.push(player.username);
          }
          io.to(roomId).emit('playerForfeit', {
            player: player.username,
            cards: room.cards,
            handSizes: room.handSizes
          });
          checkGameOverAndAdvanceTurn(room, player.username);
        }
        const humanPlayersLeft = countHumanPlayers(room);
        if (humanPlayersLeft === 0 && room.players.length > 0) {
          console.log(`Keine menschlichen Spieler mehr in Raum ${roomId}, starte 5-Sekunden-Countdown zur Löschung`);
          if (roomCleanupTimeouts[roomId]) {
            clearTimeout(roomCleanupTimeouts[roomId]);
          }
          roomCleanupTimeouts[roomId] = setTimeout(() => {
            if (rooms[roomId] && countHumanPlayers(rooms[roomId]) === 0) {
              console.log(`Lösche Raum ${roomId} nach Timeout.`);
              delete rooms[roomId];
              delete roomCleanupTimeouts[roomId];
            } else {
              console.log(`Timeout für Raum ${roomId} abgebrochen, menschlicher Spieler ist zurückgekehrt oder beigetreten.`);
              delete roomCleanupTimeouts[roomId];
            }
          }, 5000);
        }
        break;
      }
    }
  });
});

function leaveRoom(socket, roomId) {
  const room = rooms[roomId];
  if (!room) return;
  const playerIndex = room.players.findIndex(p => p.id === socket.id);
  if (playerIndex === -1) return;
  const player = room.players[playerIndex];
  const wasHost = player.isHost;
  console.log(`Spieler ${player.username} verlässt Raum ${roomId} explizit.`);
  room.players.splice(playerIndex, 1);
  socket.leave(roomId);
  delete room.hands[player.username];
  delete room.handSizes[player.username];
  delete room.passCounts[player.username];
  const resultIndex = room.gameResults.findIndex(r => r.username === player.username);
  if (resultIndex > -1) {
    room.gameResults.splice(resultIndex, 1);
  }
  const winnerIndex = room.winners.indexOf(player.username);
  if (winnerIndex > -1) {
    room.winners.splice(winnerIndex, 1);
  }
  if (room.players.length === 0) {
    console.log(`Raum ${roomId} ist leer und wird gelöscht.`);
    delete rooms[roomId];
    if (roomCleanupTimeouts[roomId]) {
      clearTimeout(roomCleanupTimeouts[roomId]);
      delete roomCleanupTimeouts[roomId];
    }
    return;
  }
  if (wasHost) {
    const nextHumanHost = room.players.find(p => !p.isBot && !p.disconnected);
    if (nextHumanHost) {
      nextHumanHost.isHost = true;
      console.log(`Neuer Host für Raum ${roomId}: ${nextHumanHost.username}`);
    }
  }
  if (room.gameStarted && !room.gameOver) {
    if (room.currentPlayerIndex === playerIndex) {
      room.currentPlayerIndex = room.currentPlayerIndex % room.players.length;
      while (room.players.length > 0 && (room.winners.includes(room.players[room.currentPlayerIndex]?.username) || room.players[room.currentPlayerIndex]?.disconnected)) {
        room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
      }
    } else if (room.currentPlayerIndex > playerIndex) {
      room.currentPlayerIndex--;
    }
    const activePlayers = room.players.filter(p => !room.winners.includes(p.username) && !p.disconnected);
    if (activePlayers.length <= 1) {
      if (activePlayers.length === 1 && !room.winners.includes(activePlayers[0].username)) {
        if (!room.gameResults.some(r => r.username === activePlayers[0].username)) {
          room.gameResults.push({ username: activePlayers[0].username, forfeit: false });
        }
        if (!room.winners.includes(activePlayers[0].username)) {
          room.winners.push(activePlayers[0].username);
        }
      }
      const finalResults = calculateResults(room);
      room.gameOver = true;
      io.to(room.id).emit('gameOver', { winners: room.winners, results: finalResults });
    } else {
      io.to(roomId).emit('turnUpdate', {
        currentPlayer: room.players[room.currentPlayerIndex]?.username,
        cards: room.cards,
        handSizes: room.handSizes
      });
      if (room.players[room.currentPlayerIndex]?.isBot) {
        makeAutomaticBotMove(room);
      }
    }
  }
  io.to(roomId).emit('playerLeft', { username: player.username });
  io.to(roomId).emit('playersUpdate', { players: room.players.filter(p => !p.disconnected) });
  const humanPlayersLeft = countHumanPlayers(room);
  if (humanPlayersLeft === 0 && room.players.length > 0) {
    console.log(`Keine menschlichen Spieler mehr in Raum ${roomId} nach leave, starte 5-Sekunden-Countdown zur Löschung`);
    if (roomCleanupTimeouts[roomId]) {
      clearTimeout(roomCleanupTimeouts[roomId]);
    }
    roomCleanupTimeouts[roomId] = setTimeout(() => {
      if (rooms[roomId] && countHumanPlayers(rooms[roomId]) === 0) {
        console.log(`Lösche Raum ${roomId} nach Timeout (leave).`);
        delete rooms[roomId];
        delete roomCleanupTimeouts[roomId];
      } else {
        console.log(`Timeout für Raum ${roomId} (leave) abgebrochen, menschlicher Spieler ist beigetreten.`);
        delete roomCleanupTimeouts[roomId];
      }
    }, 5000);
  }
}

function hasPlacement(room, username) {
  return room.winners.includes(username)
}

function makeAutomaticBotMove(room) {
  if (!room || !room.gameStarted || room.gameOver) return;
  const currentPlayer = room.players[room.currentPlayerIndex];
  if (!currentPlayer || !currentPlayer.isBot || currentPlayer.disconnected) return;
  setTimeout(() => {
    if (!rooms[room.id] || !rooms[room.id].gameStarted || rooms[room.id].gameOver) return;
    const currentRoom = rooms[room.id];
    const botPlayer = currentRoom.players[currentRoom.currentPlayerIndex];
    if (!botPlayer || !botPlayer.isBot || botPlayer.disconnected || botPlayer.username !== currentPlayer.username) {
      if (currentRoom.players[currentRoom.currentPlayerIndex]?.isBot) {
        makeAutomaticBotMove(currentRoom);
      }
      return;
    }
    const botUsername = botPlayer.username;
    const botHand = currentRoom.hands[botUsername];
    if (!botHand || botHand.length === 0) {
      checkGameOverAndAdvanceTurn(currentRoom, botUsername);
      return;
    }
    const playableCards = findPlayableCards(botHand, currentRoom.cards);
    let actionTaken = false;
    if (playableCards.length > 0) {
      const cardToPlay = playableCards[Math.floor(Math.random() * playableCards.length)];
      const position = findPositionForCard(cardToPlay, currentRoom.cards);
      if (position) {
        const cardIndex = botHand.findIndex(c => c.id === cardToPlay.id);
        if (cardIndex !== -1) {
          botHand.splice(cardIndex, 1);
          currentRoom.handSizes[botUsername] = botHand.length;
          currentRoom.cards.push({ ...cardToPlay, position });
          currentRoom.cards = markIsolatedCards(currentRoom.cards);
          actionTaken = true;
        }
      }
    }
    if (!actionTaken) {
      if ((currentRoom.passCounts[botUsername] || 0) < 3) {
        currentRoom.passCounts[botUsername]++;
        io.to(currentRoom.id).emit('passUpdate', {
          player: botUsername,
          passCounts: currentRoom.passCounts
        });
        actionTaken = true;
      } else {
        for (const card of botHand) {
          const position = findPositionForCard(card, currentRoom.cards);
          if (position) {
            currentRoom.cards.push({ ...card, position, forfeitedCard: true });
          }
        }
        currentRoom.cards = markIsolatedCards(currentRoom.cards);
        currentRoom.hands[botUsername] = [];
        currentRoom.handSizes[botUsername] = 0;
        if (!currentRoom.gameResults.some(r => r.username === botUsername)) {
          currentRoom.gameResults.push({ username: botUsername, forfeit: true });
        } else {
          const result = currentRoom.gameResults.find(r => r.username === botUsername);
          if (result) result.forfeit = true;
        }
        if (!currentRoom.winners.includes(botUsername)) {
          currentRoom.winners.push(botUsername);
        }
        io.to(currentRoom.id).emit('playerForfeit', {
          player: botUsername,
          cards: currentRoom.cards,
          handSizes: currentRoom.handSizes
        });
        actionTaken = true;
      }
    }
    if (actionTaken) {
      checkGameOverAndAdvanceTurn(currentRoom, botUsername);
    } else {
      checkGameOverAndAdvanceTurn(currentRoom, botUsername);
    }
  }, 1500);
}

server.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});