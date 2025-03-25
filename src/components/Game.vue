<template>
  <div class="game-container">
    <div class="game-table">

      <!-- Debug Info -->
      <div class="debug-info" v-if="showDebug">
        <pre>{{ JSON.stringify({
          username,
          opponents: opponents.length,
          handSizes,
          players: players.length,
          playerPositions,
          currentPlayer
        }, null, 2) }}</pre>
      </div>

      <!-- Gegnerische Spieler am oberen Rand -->
      <div class="opponents-container">
        <Player v-for="player in opponents" :key="player.username" :username="player.username" :avatar="player.avatar"
          :cardCount="handSizes[player.username] || 0" :passCount="passCounts[player.username] || 0"
          :isCurrentPlayer="currentPlayer === player.username" :position="player.position" :showCards="true" />
      </div>

      <!-- Spielfeld in der Mitte -->
      <div class="game-board">
        <!-- Die vier 7er Karten in der Mitte -->
        <div class="seven-cards">
          <Card v-for="card in sevenCards" :key="card.id" :card="card" :playable="false"
            :position="getSevenCardPosition(card)" :clickable="false" />
        </div>

        <!-- Alle anderen Karten auf dem Spielfeld -->
        <div class="board-cards">
          <Card v-for="card in nonSevenCards" :key="card.id" :card="card" :playable="false"
            :position="getBoardCardPosition(card)" :clickable="false" />
        </div>
      </div>

      <!-- Aktionsbuttons -->
      <div class="game-actions">
        <button class="btn-action" @click="passesRemaining > 0 ? passMove() : forfeitGame()" :disabled="!isMyTurn"
          :class="{ 'btn-forfeit': passesRemaining <= 0 }">
          {{ passesRemaining > 0 ? `Passen (${passCounts[username] || 0}/3)` : 'Aufgeben' }}
        </button>
      </div>

      <!-- Spieler-Handkarten unten -->
      <div class="hand-container">
        <CardHand :cards="hand" :isMyTurn="isMyTurn" :playableCards="playableCards" :maxWidth="handMaxWidth"
          @play-card="playCard" />
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
      windowHeight: 0,
      showDebug: true // Debug-Informationen anzeigen
    };
  },
  computed: {
    // Aus Vuex Store geladen
    username() { return this.$store.state.username; },
    cards() { return this.$store.state.cards || []; },
    hand() { return this.$store.state.hand || []; },
    players() { return this.$store.state.players || []; },
    currentPlayer() { return this.$store.state.currentPlayer; },
    passCounts() { return this.$store.state.passCounts || {}; },
    playerPositions() { return this.$store.state.playerPositions || {}; },
    winners() { return this.$store.state.winners || []; },
    gameOver() { return this.$store.state.gameOver; },
    handSizes() { return this.$store.state.handSizes || {}; },

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
      // Wenn wir die Gegner aus playerPositions erstellen können (enthält die Bots)
      if (this.playerPositions && Object.keys(this.playerPositions).length > 0) {
        return Object.keys(this.playerPositions).map(username => {
          return {
            username,
            position: this.playerPositions[username],
            avatar: null,
            isBot: username.includes('Bot')
          };
        }).sort((a, b) => a.position - b.position);
      }

      // Fallback zur ursprünglichen Logik
      if (!this.players || this.players.length === 0) {
        console.warn('No players data available');
        return [];
      }

      return this.players
        .filter(player => player.username !== this.username)
        .map(player => ({
          ...player,
          position: this.getPlayerPosition(player.username)
        }))
        .sort((a, b) => a.position - b.position);
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
      // Falls eine Position im Store definiert ist, verwende diese
      if (this.playerPositions && this.playerPositions[username]) {
        return this.playerPositions[username];
      }

      // Ansonsten, berechne eine Standard-Position basierend auf dem Index
      const index = this.players.findIndex(p => p.username === username);
      if (index === -1) return 1;

      // Verteile die Positionen 1, 2, 3 (links, mitte, rechts)
      return (index % 3) + 1;
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
      if (card.position) {
        return card.position;
      }

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
        const cardPos = card.position || this.getBoardCardPosition(card);
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

    // Socket-Status prüfen und ggf. Reconnect versuchen
    if (!this.$store.state.gameStarted) {
      console.log("Reconnecting to game room...");
      this.$store.dispatch('reconnectToRoom', {
        username: this.username,
        roomId: this.roomId
      }).then(() => {
        console.log("Successfully reconnected to game room");
      }).catch(error => {
        console.error("Failed to reconnect to game room:", error);
        // Bei Fehler zur Startseite navigieren
        this.$router.push('/');
      });
    }

    console.log('Game component created', {
      players: this.players,
      handSizes: this.handSizes,
      opponents: this.opponents,
      currentPlayer: this.currentPlayer
    });
  },
  mounted() {
    console.log('Game component mounted', {
      players: this.players,
      handSizes: this.handSizes,
      opponents: this.opponents,
      currentPlayer: this.currentPlayer
    });
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
</style>