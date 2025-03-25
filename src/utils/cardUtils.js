// Kartenfarben/Anzeigereihenfolge (c=clubs/♣, d=diamonds/♦, h=hearts/♥, s=spades/♠)
export const SUITS = ['c', 'd', 'h', 's'];
export const VALUES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13'];
export const SUIT_NAMES = {
  'c': 'clubs',
  'd': 'diamonds',
  'h': 'hearts',
  's': 'spades'
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
  
  // Die Siebener in die Mitte legen, vertikal angeordnet
  for (let i = 0; i < sevenCards.length; i++) {
    const card = sevenCards[i];
    startingCards.push({
      ...card,
      position: getPositionFor7(card.suit)
    });
  }
  
  // Rest der Karten gleichmäßig auf die Spieler verteilen
  // Jedem Spieler genau 12 Karten geben
  const cardsPerPlayer = 12;
  
  // Mische die verbleibenden Karten nochmals
  const shuffledRemaining = shuffleDeck(remainingDeck);
  
  for (let i = 0; i < numPlayers; i++) {
    hands[i] = shuffledRemaining.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer);
  }
  
  return {
    hands,
    startingCards
  };
}

// Position für die 7er Karten in der Mitte bestimmen
function getPositionFor7(suit) {
  const suitIndex = SUITS.indexOf(suit);
  
  // Die 7er werden vertikal angeordnet, eine über der anderen
  return {
    row: suitIndex,
    col: 0 // Zentriert (wird später vom Layout angepasst)
  };
}

// Prüft, ob eine Karte neben eine andere gelegt werden kann
export function canPlayNextTo(card, targetCard) {
  // Gleiche Farbe und benachbarter Wert
  if (card.suit === targetCard.suit) {
    const cardValue = parseInt(card.value);
    const targetValue = parseInt(targetCard.value);
    
    return Math.abs(cardValue - targetValue) === 1;
  }
  
  return false;
}

// Berechnet die Position für eine Karte auf dem Spielfeld
export function getCardPosition(card, targetCard) {
  const cardValue = parseInt(card.value);
  const targetValue = parseInt(targetCard.value);
  
  // Nur Karten der gleichen Farbe können nebeneinander gelegt werden
  if (card.suit === targetCard.suit) {
    // Der Wert bestimmt die Spalte - niedrigere Werte links, höhere rechts
    const suitIndex = SUITS.indexOf(card.suit);
    
    // Wenn die 7 das Ziel ist, platzieren wir basierend auf unserem Wert
    if (targetValue === 7) {
      return {
        row: suitIndex,
        col: cardValue < 7 ? -1 : 1 // Links oder rechts der 7
      };
    }
    
    // Ansonsten basierend darauf, ob der Wert höher oder niedriger ist
    const direction = cardValue > targetValue ? 1 : -1;
    
    return {
      row: suitIndex,
      col: targetCard.position.col + direction
    };
  }
  
  return null;
}

// Prüft, ob eine bestimmte Position bereits belegt ist
export function isPositionOccupied(cards, position) {
  return cards.some(card => 
    card.position.row === position.row && card.position.col === position.col
  );
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

// Findet spielbare Karten für eine Hand
export function findPlayableCards(hand, boardCards) {
  return hand.filter(card => {
    return boardCards.some(boardCard => canPlayNextTo(card, boardCard));
  });
}

// Berechnet die Position für eine spielbare Karte
export function findPositionForCard(card, boardCards) {
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