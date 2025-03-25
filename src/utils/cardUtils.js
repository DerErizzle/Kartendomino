// Farbfolge und Anzeigereihenfolge (c=clubs/♣, d=diamonds/♦, h=hearts/♥, s=spades/♠)
export const SUITS = ['c', 'd', 'h', 's'];
export const VALUES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13'];
export const SUIT_NAMES = {
  'c': 'Clubs',
  'd': 'Diamonds',
  'h': 'Hearts',
  's': 'Spades'
};

// Erstellt ein komplettes Kartendeck
export function createDeck() {
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

// Mischt ein Kartendeck nach dem Fisher-Yates-Algorithmus
export function shuffleDeck(deck) {
  const shuffled = [...deck];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

// Verteilt Karten an die Spieler
export function dealCards(deck, numPlayers) {
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

// Prüft, ob eine Karte neben eine andere gelegt werden kann
export function canPlayNextTo(card, boardCard) {
  // Gleiche Farbe und benachbarter Wert
  if (card.suit === boardCard.suit) {
    const cardValue = parseInt(card.value);
    const boardValue = parseInt(boardCard.value);
    
    return Math.abs(cardValue - boardValue) === 1;
  }
  
  return false;
}

// Berechnet die Position für eine Karte (links oder rechts von einer Karte auf dem Board)
export function getCardPosition(card, boardCard) {
  // Nur Karten der gleichen Farbe können nebeneinander gelegt werden
  if (card.suit === boardCard.suit) {
    const cardValue = parseInt(card.value);
    const boardValue = parseInt(boardCard.value);
    
    // Karten werden in einer Reihe platziert, der Wert bestimmt die Spalte
    if (Math.abs(cardValue - boardValue) === 1) {
      return {
        row: SUITS.indexOf(card.suit),
        col: cardValue // Der Wert der Karte bestimmt direkt die Spalte
      };
    }
  }
  
  return null;
}

// Prüft, ob eine bestimmte Position bereits belegt ist
export function isPositionOccupied(cards, position) {
  return cards.some(card => {
    // Position berechnen
    const cardPos = {
      row: SUITS.indexOf(card.suit),
      col: parseInt(card.value) === 7 ? 7 : parseInt(card.value)
    };
    
    return cardPos.row === position.row && cardPos.col === position.col;
  });
}

// Findet alle spielbaren Karten für eine Hand
export function findPlayableCards(hand, boardCards) {
  return hand.filter(card => {
    // Eine Karte ist spielbar, wenn sie neben eine Karte auf dem Brett gelegt werden kann
    // und die Position noch nicht belegt ist
    return boardCards.some(boardCard => {
      // Prüfen, ob die Karte neben die Board-Karte gelegt werden kann
      if (canPlayNextTo(card, boardCard)) {
        // Position berechnen
        const position = getCardPosition(card, boardCard);
        
        // Prüfen, ob die Position frei ist
        return position && !isPositionOccupied(boardCards, position);
      }
      
      return false;
    });
  });
}

// Sortiert die Karten auf der Hand - zuerst nach Farbe, dann nach Wert
export function sortHand(hand) {
  return [...hand].sort((a, b) => {
    // Zuerst nach Farbe sortieren
    if (a.suit !== b.suit) {
      return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
    }
    
    // Dann nach Wert
    return parseInt(a.value) - parseInt(b.value);
  });
}

// Findet eine Position für eine Karte auf dem Board
export function findPositionForCard(card, boardCards) {
  for (const boardCard of boardCards) {
    if (canPlayNextTo(card, boardCard)) {
      const position = getCardPosition(card, boardCard);
      
      // Prüfen, ob die Position frei ist
      if (position && !isPositionOccupied(boardCards, position)) {
        return position;
      }
    }
  }
  
  return null;
}