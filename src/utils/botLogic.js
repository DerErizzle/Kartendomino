import { findPlayableCards, findPositionForCard } from './cardUtils';

// Timeout für den Bot-Zug, damit es natürlicher wirkt
const BOT_MOVE_DELAY = 1500;

export default class Bot {
    constructor(name, hand = []) {
        this.name = name;
        this.hand = hand;
        this.passCount = 0;
    }

    // Setzt die Karten auf der Hand des Bots
    setHand(hand) {
        this.hand = hand;
    }

    // Bot spielt seinen Zug
    makeMove(boardCards, callback) {
        setTimeout(() => {
            // Finde alle spielbaren Karten
            const playableCards = findPlayableCards(this.hand, boardCards);

            if (playableCards.length > 0) {
                // Nimm die erste spielbare Karte (Bots spielen nicht strategisch)
                const cardToPlay = playableCards[0];

                // Finde eine Position für die Karte
                const position = findPositionForCard(cardToPlay, boardCards);

                if (position) {
                    // Entferne die Karte aus der Hand
                    this.hand = this.hand.filter(card => card.id !== cardToPlay.id);

                    // Spiele die Karte
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

            // Wenn keine Karte gespielt werden kann
            if (this.passCount < 3) {
                // Passe, wenn noch Pässe übrig
                this.passCount++;

                callback({
                    success: true,
                    action: 'pass'
                });
            } else {
                // Sonst aufgeben
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

    // Prüft, ob der Bot bereits aufgegeben hat
    hasForfeited() {
        return this.hand.length === 0 && this.passCount >= 3;
    }
}

// Factory-Funktion zum Erstellen von Bots
export function createBots(count, availableNames = []) {
    const defaultNames = ['Bot 1', 'Bot 2', 'Bot 3', 'Bot 4'];
    const botNames = availableNames.length > 0 ? availableNames : defaultNames;

    return Array(count).fill().map((_, index) => new Bot(botNames[index % botNames.length]));
}