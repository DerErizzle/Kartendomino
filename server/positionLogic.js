// Hilffunktionen für die Kartenpositionierung auf dem Server

const SUITS = ['c', 'd', 'h', 's']; // clubs, diamonds, hearts, spades

// Berechnet die Position für die 7er-Karten in der Mitte
function getPositionFor7(suit) {
  const suitIndex = SUITS.indexOf(suit);
  
  // Die 7er-Karten werden vertikal angeordnet
  return {
    row: suitIndex,    // Zeile basierend auf der Farbe
    col: 0             // Zentriert in der Mitte
  };
}

// Prüft, ob eine Karte neben eine andere gelegt werden kann
function canPlayNextTo(card, targetCard) {
  // Gleiche Farbe und benachbarter Wert
  if (card.suit === targetCard.suit) {
    const cardValue = parseInt(card.value);
    const targetValue = parseInt(targetCard.value);
    
    return Math.abs(cardValue - targetValue) === 1;
  }
  
  return false;
}

// Berechnet die Position für eine Karte auf dem Spielfeld
function getCardPosition(card, targetCard) {
  const cardValue = parseInt(card.value);
  const targetValue = parseInt(targetCard.value);
  
  // Nur Karten der gleichen Farbe können nebeneinander gelegt werden
  if (card.suit === targetCard.suit) {
    // Wenn die 7 das Ziel ist, platzieren wir basierend auf unserem Wert
    if (targetValue === 7) {
      const suitRow = SUITS.indexOf(card.suit);
      return {
        row: suitRow,
        col: cardValue < 7 ? -1 : 1 // Links oder rechts von der 7
      };
    }
    
    // Ansonsten basierend auf Wertdifferenz
    const direction = cardValue > targetValue ? 1 : -1; // Rechts oder links
    
    return {
      row: targetCard.position.row,
      col: targetCard.position.col + direction
    };
  }
  
  return null;
}

// Prüft, ob eine bestimmte Position bereits belegt ist
function isPositionOccupied(cards, position) {
  return cards.some(card => 
    card.position.row === position.row && card.position.col === position.col
  );
}

// Findet eine Position für eine Karte auf dem Board
function findPositionForCard(card, boardCards) {
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

// Findet eine zufällige Position für eine aufgegebene Karte
function findRandomPositionForCard(card, boardCards) {
  // Zuerst versuchen, eine regelkonforme Position zu finden
  const normalPosition = findPositionForCard(card, boardCards);
  if (normalPosition) return normalPosition;
  
  // Wenn keine regelkonforme Position gefunden wird:
  // Versuchen, die Karte in der richtigen Farbreihe zu platzieren
  const suitRow = SUITS.indexOf(card.suit);
  
  // Suche nach einem freien Platz in dieser Reihe, beginnend von den Rändern
  const usedPositions = new Set();
  
  // Sammle alle belegten Positionen
  boardCards.forEach(card => {
    if (card.position.row === suitRow) {
      usedPositions.add(card.position.col);
    }
  });
  
  // Finde freie Positionen links und rechts
  let leftPos = -1;
  while (usedPositions.has(leftPos)) leftPos--;
  
  let rightPos = 1;
  while (usedPositions.has(rightPos)) rightPos++;
  
  // Wähle die freie Position, die näher an der Mitte liegt
  const finalCol = Math.abs(leftPos) <= Math.abs(rightPos) ? leftPos : rightPos;
  
  return {
    row: suitRow,
    col: finalCol
  };
}

module.exports = {
  getPositionFor7,
  canPlayNextTo,
  getCardPosition,
  isPositionOccupied,
  findPositionForCard,
  findRandomPositionForCard
};