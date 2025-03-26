import { findPlayableCards, findPositionForCard, SUITS } from './cardUtils';

const BOT_MOVE_DELAY = 1500;

export default class Bot {
    constructor(name, hand = []) {
        this.name = name;
        this.hand = hand;
        this.passCount = 0;
        this.targetSuit = null;
    }

    setHand(hand) {
        this.hand = hand;
        this.updateStrategy();
    }

    updateStrategy() {
        const suitCounts = {};
        for (const suit of SUITS) {
            suitCounts[suit] = 0;
        }
        
        this.hand.forEach(card => {
            suitCounts[card.suit]++;
        });

        let minCount = Infinity;
        let targetSuit = null;
        
        for (const suit of SUITS) {
            if (suitCounts[suit] > 0 && suitCounts[suit] < minCount) {
                minCount = suitCounts[suit];
                targetSuit = suit;
            } else if (suitCounts[suit] === minCount && targetSuit !== null) {
                const minValueThisSuit = Math.min(...this.hand
                    .filter(card => card.suit === suit)
                    .map(card => parseInt(card.value)));
                
                const minValueTargetSuit = Math.min(...this.hand
                    .filter(card => card.suit === targetSuit)
                    .map(card => parseInt(card.value)));
                
                if (minValueThisSuit < minValueTargetSuit) {
                    targetSuit = suit;
                }
            }
        }
        
        this.targetSuit = targetSuit;
    }

    evaluateCard(card, boardCards) {
        let score = 0;
        const value = parseInt(card.value);
        
        if (card.suit === this.targetSuit) {
            score += 5;
        }
        
        const distanceFromMiddle = Math.abs(7 - value);
        score += distanceFromMiddle * 0.5;
        
        const isBridge = this.isBridgeCard(card, boardCards);
        if (isBridge) {
            score -= 3;
        }
        
        const neighborCount = this.countNeighborsInHand(card);
        score -= neighborCount * 0.5;
        
        score += Math.random() * 1.5;
        
        return score;
    }
    
    isBridgeCard(card, boardCards) {
        const value = parseInt(card.value);
        const lowerValue = value - 1;
        const higherValue = value + 1;
        
        const lowerExists = boardCards.some(bc => 
            bc.suit === card.suit && parseInt(bc.value) === lowerValue);
        
        const higherExists = boardCards.some(bc => 
            bc.suit === card.suit && parseInt(bc.value) === higherValue);
        
        return lowerExists && higherExists;
    }
    
    countNeighborsInHand(card) {
        const value = parseInt(card.value);
        
        return this.hand.filter(c => 
            c.id !== card.id && 
            c.suit === card.suit && 
            (parseInt(c.value) === value - 1 || parseInt(c.value) === value + 1)
        ).length;
    }
    
    isMidValueCard(card) {
        const value = parseInt(card.value);
        return value >= 4 && value <= 10 && value !== 7; // 7 ist die Startkarte, kein Mittenwert
    }
    
    hasEdgeValuesInSuit(suit) {
        const edgeValues = [1, 2, 12, 13];
        return this.hand.some(card => 
            card.suit === suit && edgeValues.includes(parseInt(card.value)));
    }
    
    shouldStrategicallyPass(playableCards, boardCards) {
        // Bei wenigen Karten nicht mehr strategisch passen
        if (this.hand.length <= 5) return false;
        
        // Bei nur einer spielbaren Karte, besser spielen
        if (playableCards.length === 1) return false;
        
        // Nach zwei Pässen besser spielen als aufgeben zu müssen
        if (this.passCount >= 2) return false;
        
        // Behalte Mittenwerte zurück, wenn keine Außenwerte der Farbe vorhanden sind
        for (const card of playableCards) {
            if (this.isMidValueCard(card) && !this.hasEdgeValuesInSuit(card.suit)) {
                // Höhere Pass-Wahrscheinlichkeit bei mehr restlichen Karten
                const passChance = 0.5 + (Math.min(this.hand.length, 15) / 30);
                return Math.random() < passChance;
            }
        }
        
        return false;
    }

    makeMove(boardCards, callback) {
        setTimeout(() => {
            const playableCards = findPlayableCards(this.hand, boardCards);

            if (playableCards.length > 0) {
                // Strategisches Passen prüfen
                if (this.shouldStrategicallyPass(playableCards, boardCards)) {
                    this.passCount++;
                    
                    callback({
                        success: true,
                        action: 'pass'
                    });
                    return;
                }
                
                const ratedCards = playableCards.map(card => ({
                    card,
                    score: this.evaluateCard(card, boardCards)
                }));
                
                ratedCards.sort((a, b) => b.score - a.score);
                
                const cardToPlay = ratedCards[0].card;
                
                const position = findPositionForCard(cardToPlay, boardCards);

                if (position) {
                    this.hand = this.hand.filter(card => card.id !== cardToPlay.id);
                    
                    if (this.hand.length > 0 && this.hand.length % 3 === 0) {
                        this.updateStrategy();
                    }

                    callback({
                        success: true,
                        action: 'play',
                        card: {
                            ...cardToPlay,
                            position
                        }
                    });

                    return;
                }
            }

            if (this.passCount < 3) {
                this.passCount++;

                callback({
                    success: true,
                    action: 'pass'
                });
            } else {
                const remainingCards = this.hand;
                this.hand = [];

                callback({
                    success: true,
                    action: 'forfeit',
                    remainingCards
                });
            }
        }, BOT_MOVE_DELAY);
    }

    hasForfeited() {
        return this.hand.length === 0 && this.passCount >= 3;
    }
}

export function createBots(count, availableNames = []) {
    const defaultNames = ['Bot 1', 'Bot 2', 'Bot 3', 'Bot 4'];
    const botNames = availableNames.length > 0 ? availableNames : defaultNames;

    return Array(count).fill().map((_, index) => new Bot(botNames[index % botNames.length]));
}