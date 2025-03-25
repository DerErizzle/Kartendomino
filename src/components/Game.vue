<template>
  <div class="game-container">
    <div class="game-board">
      <!-- Spieler-Positionierungen im Hintergrund -->
      <div class="position-markers">
        <div v-for="pos in 4" :key="`pos-${pos}`" class="position-marker" :class="{ 'my-position': myPosition === pos }">
          {{ pos }}.
        </div>
      </div>
      
      <!-- Gegnerische Spieler (Bots) -->
      <div class="opponents-container">
        <Player
          v-for="player in opponents"
          :key="player.username"
          :username="player.username"
          :avatar="player.avatar"
          :cardCount="player.cardCount"
          :passCount="passCounts[player.username] || 0"
          :isCurrentPlayer="currentPlayer === player.username"
          :showCards="true"
        />
      </div>
      
      <!-- Spielkarten auf dem Board -->
      <div class="board-container">
        <div class="board">
          <!-- Zentrale 7er-Karten vertikal angeordnet -->
          <div class="seven-cards">
            <Card
              v-for="card in sevenCards"
              :key="card.id"
              :card="card"
              :playable="false"
              :position="card.position"
              :clickable="false"
            />
          </div>
          
          <!-- Restliche Karten links und rechts der Sevens -->
          <div class="board-cards">
            <Card
              v-for="card in nonSevenCards"
              :key="card.id"
              :card="card"
              :playable="false"
              :position="calculateBoardPosition(card)"
              :clickable="false"
            />
          </div>
        </div>
      </div>
      
      <!-- Aktionsbuttons -->
      <div class="game-actions">
        <button 
          class="btn-pass" 
          @click="passMove"
          :disabled="!isMyTurn || passesRemaining <= 0"
        >
          Passen ({{ passesRemaining }}/3)
        </button>
        
        <button 
          v-if="passesRemaining <= 0 && playableCards.length === 0 && isMyTurn"
          class="btn-forfeit" 
          @click="forfeitGame"
        >
          Aufgeben
        </button>
        
        <button class="btn-leave" @click="leaveGame">Spiel verlassen</button>
      </div>
      
      <!-- Eigene Karten unten -->
      <div class="hand-container">
        <CardHand
          :cards="hand"
          :isMyTurn="isMyTurn"
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
import { mapState, mapGetters, mapActions } from 'vuex';
import Card from './Card.vue';
import CardHand from './CardHand.vue';
import Player from './Player.vue';
import { findPositionForCard } from '../utils/cardUtils';

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
      handMaxWidth: 1200,
      windowWidth: window.innerWidth
    };
  },
  computed: {
    ...mapState([
      'username', 
      'cards', 
      'hand', 
      'players', 
      'currentPlayer', 
      'passCounts',
      'playerPositions',
      'winners',
      'gameOver'
    ]),
    ...mapGetters([
      'playableCards',
      'remainingPasses',
      'myPosition'
    ]),
    
    isMyTurn() {
      return this.currentPlayer === this.username;
    },
    
    passesRemaining() {
      return this.remainingPasses;
    },
    
    opponents() {
      return this.players
        .filter(player => player.username !== this.username)
        .map(player => ({
          ...player,
          cardCount: player.cardCount || 0
        }));
    },
    
    // 7er-Karten herausfiltern für zentrale Platzierung
    sevenCards() {
      return this.cards.filter(card => card.value === '07');
    },
    
    // Alle anderen Karten
    nonSevenCards() {
      return this.cards.filter(card => card.value !== '07');
    }
  },
  methods: {
    ...mapActions(['playCard', 'pass', 'forfeit', 'leaveRoom']),
    
    calculateBoardPosition(card) {
      // Da wir jetzt ein komplett anderes Layout haben, berechnen wir neue Positionen
      // basierend auf den Werten der Karten und der jeweiligen Farbe
      
      const suitIndex = ['c', 'd', 'h', 's'].indexOf(card.suit);
      const valueIndex = parseInt(card.value);
      
      // Positionierung links und rechts von den 7er-Karten im Zentrum
      // Werte 1-6 links, 8-13 rechts von der 7
      const isLeftSide = valueIndex < 7;
      const distanceFrom7 = Math.abs(7 - valueIndex);
      
      // Berechnen der horizontalen Position
      // 0 ist zentral (7er-Karten), negative Werte sind links, positive rechts
      const horizontalPos = isLeftSide
        ? -distanceFrom7      // Links von der 7 (negative Position)
        : distanceFrom7 - 1;  // Rechts von der 7 (positive Position, -1 weil wir bei 0 anfangen)

      return {
        row: suitIndex,       // Zeile basierend auf der Farbe
        col: horizontalPos    // Spalte basierend auf dem Wert
      };
    },
    
    playCard(card) {
      const position = findPositionForCard(card, this.cards);
      
      if (position) {
        this.$store.dispatch('playCard', {
          card,
          position
        });
      }
    },
    
    passMove() {
      this.$store.dispatch('pass');
    },
    
    forfeitGame() {
      this.$store.dispatch('forfeit');
    },
    
    leaveGame() {
      this.$store.dispatch('leaveRoom');
      this.$router.push('/');
    },
    
    updateHandMaxWidth() {
      this.windowWidth = window.innerWidth;
      this.handMaxWidth = Math.min(1200, this.windowWidth - 40);
    }
  },
  created() {
    if (!this.roomId) {
      this.$router.push('/');
    }
    
    // Responsive Anpassung der Handkartenbreite
    window.addEventListener('resize', this.updateHandMaxWidth);
    this.updateHandMaxWidth();
  },
  beforeUnmount() {
    // Verlasse den Raum, wenn die Komponente zerstört wird
    if (this.roomId && !this.gameOver) {
      this.leaveRoom();
    }
    
    window.removeEventListener('resize', this.updateHandMaxWidth);
  }
}
</script>

<style scoped>
.game-container {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.game-board {
  width: 100%;
  height: 100%;
  background-color: #1b7e44; /* Grüner Spieltisch */
  position: relative;
  display: flex;
  flex-direction: column;
}

/* Spieler-Positionsmarker */
.position-markers {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 10px;
  z-index: 5;
}

.position-marker {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}

.my-position {
  background-color: rgba(255, 255, 0, 0.4);
}

/* Gegnerische Spieler */
.opponents-container {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 10px;
  margin-top: 10px;
  z-index: 10;
  align-self: center;
}

/* Spielbrett in der Mitte */
.board-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  margin: 20px 0;
}

.board {
  position: relative;
  width: 100%;
  max-width: 1200px;
  height: 400px;
}

.seven-cards {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 2;
}

.board-cards {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* Aktionsbuttons */
.game-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin: 10px 0;
  z-index: 5;
}

.btn-pass, .btn-forfeit, .btn-leave {
  padding: 10px 20px;
  border-radius: 20px;
  border: none;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-pass {
  background-color: #007bff;
  color: white;
}

.btn-pass:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-pass:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.btn-forfeit {
  background-color: #dc3545;
  color: white;
}

.btn-forfeit:hover {
  background-color: #c82333;
}

.btn-leave {
  background-color: #6c757d;
  color: white;
}

.btn-leave:hover {
  background-color: #5a6268;
}

/* Spieler-Handkarten */
.hand-container {
  padding: 10px;
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
  z-index: 5;
}

/* Spielende-Overlay */
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

/* Hintergrund-Grafiken */
.game-board::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  height: 80%;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10,50 Q30,20 50,50 T90,50" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3"/></svg>');
  background-repeat: no-repeat;
  background-size: contain;
  opacity: 0.5;
  pointer-events: none;
}

/* Responsive Design */
@media (max-width: 768px) {
  .opponents-container {
    flex-wrap: wrap;
  }
  
  .game-actions {
    flex-wrap: wrap;
  }
}
</style>