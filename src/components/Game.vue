<template>
  <div class="game-container">
    <div class="game-table">
      <!-- Tischmarkierungen im Hintergrund -->
      <div class="table-marking left">SEVENS</div>
      <div class="table-marking right">SEVENS</div>
      
      <!-- Gegnerische Spieler am oberen Rand -->
      <div class="opponents-container">
        <Player
          v-for="player in opponents"
          :key="player.username"
          :username="player.username"
          :avatar="player.avatar"
          :cardCount="player.cardCount"
          :passCount="passCounts[player.username] || 0"
          :isCurrentPlayer="currentPlayer === player.username"
          :position="getPlayerPosition(player.username)"
          :showCards="true"
        />
      </div>
      
      <!-- Spielfeld in der Mitte -->
      <div class="game-board">
        <!-- Die vier 7er Karten in der Mitte -->
        <div class="seven-cards">
          <Card
            v-for="card in sevenCards"
            :key="card.id"
            :card="card"
            :playable="false"
            :position="getSevenCardPosition(card)"
            :clickable="false"
          />
        </div>
        
        <!-- Alle anderen Karten auf dem Spielfeld -->
        <div class="board-cards">
          <Card
            v-for="card in nonSevenCards"
            :key="card.id"
            :card="card"
            :playable="false"
            :position="getBoardCardPosition(card)"
            :clickable="false"
          />
        </div>
      </div>
      
      <!-- Aktionsbuttons -->
      <div class="game-actions">
        <button 
          class="btn-action" 
          @click="passesRemaining > 0 ? passMove() : forfeitGame()"
          :disabled="!isMyTurn"
          :class="{ 'btn-forfeit': passesRemaining <= 0 }"
        >
          {{ passesRemaining > 0 ? `Passen (${passesRemaining}/3)` : 'Aufgeben' }}
        </button>
      </div>
      
      <!-- Spieler-Handkarten unten -->
      <div class="hand-container">
        <CardHand
          :cards="hand"
          :isMyTurn="isMyTurn"
          :playableCards="playableCards"
          :maxWidth="handMaxWidth"
          @play-card="playCard"
        />
      </div>
      
      <!-- Spielstatus Overlay -->
      <div class="game-status" v-if="gameOver">
        <div class="status-modal">
          <h2>Spiel beendet!</h2>
          <div class="winners-list">
            <h3>Spieler-Rangliste:</h3>
            <ol>
              <li v-for="(winner, index) in winners" :key="index">
                {{ winner }}
              </li>
            </ol>
          </div>
          <button class="btn-new-game" @click="leaveGame">Zurück zur Lobby</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Card from './Card.vue';
import CardHand from './CardHand.vue';
import Player from './Player.vue';

export default {
  name: 'Game',
  components: {
    Card,
    CardHand,
    Player
  },
  props: {
    roomId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      handMaxWidth: 0,
      windowWidth: 0,
      windowHeight: 0
    };
  },
  computed: {
    // Aus Vuex Store geladen
    username() { return this.$store.state.username; },
    cards() { return this.$store.state.cards; },
    hand() { return this.$store.state.hand; },
    players() { return this.$store.state.players; },
    currentPlayer() { return this.$store.state.currentPlayer; },
    passCounts() { return this.$store.state.passCounts; },
    playerPositions() { return this.$store.state.playerPositions; },
    winners() { return this.$store.state.winners; },
    gameOver() { return this.$store.state.gameOver; },
    
    // Abgeleitete Eigenschaften
    isMyTurn() {
      return this.currentPlayer === this.username;
    },
    
    passesRemaining() {
      return 3 - (this.passCounts[this.username] || 0);
    },
    
    playableCards() {
      if (!this.isMyTurn) return [];
      
      return this.hand.filter(card => {
        return this.cards.some(boardCard => {
          // Gleiche Farbe und Wert ist um 1 höher oder niedriger
          const sameSuit = boardCard.suit === card.suit;
          const cardValue = parseInt(card.value);
          const boardValue = parseInt(boardCard.value);
          
          // Benachbarte Karten
          return sameSuit && Math.abs(cardValue - boardValue) === 1;
        });
      });
    },
    
    opponents() {
      return this.players
        .filter(player => player.username !== this.username)
        .map(player => ({
          ...player,
          cardCount: (this.$store.state.handSizes && this.$store.state.handSizes[player.username]) || 0
        }));
    },
    
    // 7er-Karten für die Mitte
    sevenCards() {
      return this.cards.filter(card => card.value === '07');
    },
    
    // Alle anderen Karten
    nonSevenCards() {
      return this.cards.filter(card => card.value !== '07');
    }
  },
  methods: {
    getPlayerPosition(username) {
      const position = this.playerPositions[username];
      return position || 1;
    },
    
    getSevenCardPosition(card) {
      // Die 7er-Karten sollen in der Mitte untereinander sein
      const suitIndex = ['c', 'd', 'h', 's'].indexOf(card.suit);
      return {
        row: suitIndex,
        col: 7 // In der horizontalen Mitte (Spalte 7)
      };
    },
    
    getBoardCardPosition(card) {
      // Position basierend auf Farbe und Wert berechnen
      const suitIndex = ['c', 'd', 'h', 's'].indexOf(card.suit);
      const value = parseInt(card.value);
      
      // Werte <= 6 sind links der 7, Werte >= 8 sind rechts der 7
      return {
        row: suitIndex,
        col: value // Der Wert bestimmt direkt die Spalte
      };
    },
    
    playCard(card) {
      // Position auf dem Board berechnen
      const position = this.findPositionForCard(card);
      
      if (position) {
        this.$store.dispatch('playCard', {
          roomId: this.roomId,
          card,
          position
        });
      }
    },
    
    findPositionForCard(card) {
      // Finde eine passende Position auf dem Board
      for (const boardCard of this.cards) {
        if (boardCard.suit === card.suit) {
          const cardValue = parseInt(card.value);
          const boardValue = parseInt(boardCard.value);
          
          if (Math.abs(cardValue - boardValue) === 1) {
            // Position berechnen
            const position = {
              row: ['c', 'd', 'h', 's'].indexOf(card.suit),
              col: cardValue
            };
            
            // Prüfen, ob die Position frei ist
            if (!this.isPositionOccupied(position)) {
              return position;
            }
          }
        }
      }
      
      return null;
    },
    
    isPositionOccupied(position) {
      return this.cards.some(card => {
        const cardPos = this.getBoardCardPosition(card);
        return cardPos.row === position.row && cardPos.col === position.col;
      });
    },
    
    passMove() {
      if (this.isMyTurn && this.passesRemaining > 0) {
        this.$store.dispatch('pass', {
          roomId: this.roomId
        });
      }
    },
    
    forfeitGame() {
      if (this.isMyTurn) {
        this.$store.dispatch('forfeit', {
          roomId: this.roomId
        });
      }
    },
    
    leaveGame() {
      this.$store.dispatch('leaveRoom', {
        roomId: this.roomId
      });
      this.$router.push('/');
    },
    
    updateWindowSize() {
      this.windowWidth = window.innerWidth;
      this.windowHeight = window.innerHeight;
      this.handMaxWidth = Math.min(1200, this.windowWidth - 40);
    }
  },
  created() {
    window.addEventListener('resize', this.updateWindowSize);
    this.updateWindowSize();
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateWindowSize);
    
    // Beim Verlassen der Komponente den Raum verlassen
    if (this.roomId && !this.gameOver) {
      this.$store.dispatch('leaveRoom', { roomId: this.roomId });
    }
  }
}
</script>

<style scoped>
.game-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.game-table {
  width: 100%;
  height: 100%;
  background-color: #1b7e44; /* Grüner Spieltisch */
  position: relative;
}

/* Tischmarkierungen im Hintergrund */
.table-marking {
  position: absolute;
  font-size: 120px;
  color: rgba(255, 255, 255, 0.1);
  transform: rotate(-30deg);
  white-space: nowrap;
  pointer-events: none;
}

.table-marking.left {
  left: -100px;
  top: 30%;
}

.table-marking.right {
  right: -100px;
  bottom: 30%;
}

/* Gegner am oberen Bildschirmrand */
.opponents-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 10px;
  z-index: 10;
}

/* Spielfeld in der Mitte */
.game-board {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  height: 60%;
}

.seven-cards, .board-cards {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* Aktionsbuttons */
.game-actions {
  position: absolute;
  bottom: 140px;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 0 30px;
  z-index: 10;
}

.btn-action {
  padding: 10px 20px;
  border-radius: 20px;
  border: none;
  background-color: white;
  color: #1b7e44;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-action:hover:not(:disabled) {
  transform: translateY(-2px);
}

.btn-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-forfeit {
  background-color: #dc3545;
  color: white;
}

/* Handkarten unten */
.hand-container {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 1200px;
}

/* Spielstatus Overlay */
.game-status {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.status-modal {
  background-color: white;
  border-radius: 10px;
  padding: 30px;
  width: 90%;
  max-width: 500px;
  text-align: center;
}

.winners-list {
  text-align: left;
  margin: 20px 0;
}

.btn-new-game {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
}

.btn-new-game:hover {
  background-color: #218838;
}

/* Responsives Design */
@media (max-width: 768px) {
  .game-board {
    width: 90%;
    height: 50%;
  }
  
  .hand-container {
    bottom: 10px;
  }
  
  .game-actions {
    bottom: 120px;
  }
}
</style>