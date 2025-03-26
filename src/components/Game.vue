<template>
  <div class="game-container">
    <!-- Global Transition für den nahtlosen Übergang vom GameRoom -->
    <GlobalTransition v-if="showTransition" ref="globalTransition" @transition-complete="transitionComplete" />
    
    <div class="game-table">
      <!-- Audio Controls -->
      <AudioControls />

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
            :position="getSevenCardPosition(card)" :clickable="false" :enableHoverSound="false" />
        </div>

        <!-- Alle anderen Karten auf dem Spielfeld -->
        <div class="board-cards">
          <Card v-for="card in nonSevenCards" :key="card.id" :card="card" :playable="false"
            :position="getBoardCardPosition(card)" :clickable="false" :enableHoverSound="false" />
        </div>
      </div>

      <!-- Aktionsbuttons -->
      <div class="game-actions">
        <SoundButton 
          class="btn-action" 
          :class="{ 'btn-forfeit': passesRemaining <= 0 }"
          @click="handleButtonClick" 
          :disabled="!isMyTurn || (passesRemaining <= 0 && !canForfeit)"
          :enableClickSound="false"
        >
          {{ passesRemaining > 0 ? `Passen (${passCounts[username] || 0}/3)` : 'Aufgeben' }}
        </SoundButton>
      </div>

      <!-- Spieler-Handkarten unten -->
      <div class="hand-container" v-if="!hasForfeited">
        <CardHand :cards="hand" :isMyTurn="isMyTurn" :playableCards="playableCards" :maxWidth="handMaxWidth"
          @play-card="playCard" />
      </div>
      <div class="hand-container forfeit-message" v-else>
        <div>{{ getPlayerStatusMessage() }}</div>
      </div>

      <!-- Spielstatus Overlay -->
      <div class="game-status" v-if="gameOver">
        <div class="status-modal">
          <h2>Spiel beendet!</h2>
          <div class="winners-list">
            <h3>Spieler-Rangliste:</h3>
            <ol>
              <li v-for="(result, index) in $store.state.gameResults" :key="index" 
                  :class="{ 'forfeited': result.forfeit }">
                {{ result.username }} {{ result.forfeit ? '(aufgegeben)' : '' }}
              </li>
            </ol>
          </div>
          <SoundButton class="btn-new-game" @click="leaveGame">Zurück zur Lobby</SoundButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Card from './Card.vue';
import CardHand from './CardHand.vue';
import Player from './Player.vue';
import AudioControls from './AudioControls.vue';
import SoundButton from './SoundButton.vue';
import GlobalTransition from './GlobalTransition.vue';
import audioService from '../services/audioService';

export default {
  name: 'Game',
  components: {
    Card,
    CardHand,
    Player,
    AudioControls,
    SoundButton,
    GlobalTransition
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
      showDebug: false, // Debug-Informationen anzeigen
      gameResults: [],
      didIWin: false, // Track if player won for music selection
      previousCurrentPlayer: null, // To track current player changes for sound effects
      scoreTallyPlayed: false, // To track if score tally sound has been played
      gameStartingSoundPlayed: false, // Flag to track if the starting sound was just played
      bgmStarted: false, // Flag to track if BGM has started
      actionInProgress: false, // Flag to prevent multiple click events
      playerForfeitStatus: false, // Flag um zu speichern, ob der Spieler aufgegeben hat
      reconnectAttempted: false, // Flag, um mehrfache Reconnect-Versuche zu verhindern
      showTransition: false // Flag to control the global transition overlay
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
    gameResults() { return this.$store.state.gameResults || []; },

    // Abgeleitete Eigenschaften
    isMyTurn() {
      return this.currentPlayer === this.username;
    },

    passesRemaining() {
      return 3 - (this.passCounts[this.username] || 0);
    },

    canForfeit() {
      return this.isMyTurn && this.playableCards.length === 0;
    },

    hasForfeited() {
      return this.winners.includes(this.username);
    },
    
    // Prüfen, ob der Spieler regulär gewonnen hat oder aufgegeben hat
    hasRegularWin() {
      // Suche den Eintrag des Spielers in den Ergebnissen
      const playerResult = this.gameResults.find(r => r.username === this.username);
      return playerResult && !playerResult.forfeit;
    },

    playableCards() {
      if (!this.isMyTurn) {
        return [];
      }

      return this.hand.filter(card => {
        return this.cards.some(boardCard => {
          // Ignoriere isolierte Karten
          if (boardCard.isIsolated) {
            return false;
          }

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
  watch: {
    gameOver(newVal) {
      if (newVal && !this.scoreTallyPlayed) {
        // Determine if player won to choose the right music and sound
        if (this.$store.state.gameResults && this.$store.state.gameResults.length > 0) {
          const playerResult = this.$store.state.gameResults.find(r => r.username === this.username);
          
          if (playerResult) {
            // Speichere den Aufgabe-Status
            this.playerForfeitStatus = playerResult.forfeit;
            
            // Play scoreboard appear sound first
            if (playerResult.place === 1) {
              this.didIWin = true;
              audioService.playScoreboardWin();
            } else {
              this.didIWin = false;
              audioService.playScoreboardLose();
            }
            
            // After a delay, play the tally sound and then the music
            setTimeout(() => {
              audioService.playScoreboardTally();
              this.scoreTallyPlayed = true;
              
              // After tally sound, start appropriate music
              setTimeout(() => {
                if (this.didIWin) {
                  audioService.playBgm('win');
                } else {
                  audioService.playBgm('lose');
                }
              }, 1000);
            }, 1000);
          }
        }
      }
    },
    currentPlayer(newVal, oldVal) {
      // Play the "your turn" sound when it becomes the player's turn
      if (newVal === this.username && oldVal !== this.username) {
        audioService.playYourTurnSound();
      }
    }
  },
  methods: {
    // Neue Methode für Status-Nachricht
    getPlayerStatusMessage() {
      // Prüfe die Platzierung des Spielers, falls das Spiel vorbei ist
      if (this.gameOver) {
        const playerResult = this.gameResults.find(r => r.username === this.username);
        
        if (playerResult) {
          if (playerResult.forfeit) {
            return "Du hast aufgegeben und kannst nicht mehr spielen.";
          } else if (playerResult.place === 1) {
            return "Glückwunsch! Du hast das Spiel gewonnen!";
          } else {
            return `Du hast Platz ${playerResult.place} erreicht.`;
          }
        }
      }
      
      // Wenn das Spiel noch läuft und der Spieler aufgegeben hat
      if (this.hasForfeited) {
        // Prüfe, ob der Spieler keine Karten mehr hat
        if (this.hand.length === 0 && !this.playerForfeitStatus) {
          return "Du hast keine Karten mehr und hast das Spiel beendet.";
        } else {
          return "Du hast aufgegeben und kannst nicht mehr spielen.";
        }
      }
      
      // Sollte nicht erreicht werden, da dieser Text nur angezeigt wird, wenn hasForfeited true ist
      return "";
    },
    
    // Transition completed handler
    transitionComplete() {
      this.showTransition = false;
      localStorage.removeItem('gameTransitionActive');
      
      // Start game BGM now that transition is complete
      this.startBackgroundMusic();
      
      // If it's the player's turn, play the "your turn" sound
      if (this.isMyTurn) {
        setTimeout(() => {
          audioService.playYourTurnSound();
        }, 500);
      }
    },
    
    // Neue Methode, die zwischen Passen und Aufgeben unterscheidet
    handleButtonClick() {
      // Verhindere mehrfache Klicks
      if (this.actionInProgress) return;
      
      // Nur wenn der Spieler an der Reihe ist
      if (!this.isMyTurn) return;
      
      this.actionInProgress = true;
      
      try {
        if (this.passesRemaining > 0) {
          this.passMove();
        } else if (this.canForfeit) {
          this.forfeitGame();
          // Setze den Status sofort, um die richtige Nachricht anzuzeigen
          this.playerForfeitStatus = true;
        }
      } finally {
        // Setze den Flag zurück
        setTimeout(() => {
          this.actionInProgress = false;
        }, 1000);
      }
    },
    
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
      const suitIndex = ['s', 'c', 'h', 'd'].indexOf(card.suit);
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
      const suitIndex = ['s', 'c', 'h', 'd'].indexOf(card.suit);
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
        // Play card sound will be handled by Card component on click
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
              row: ['s', 'c', 'h', 'd'].indexOf(card.suit),
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
        // Spiele zuerst den Sound ab
        audioService.playPassSound();
        
        // Dann sende die Aktion zum Server
        this.$store.dispatch('pass', {
          roomId: this.roomId
        });
      }
    },

    forfeitGame() {
      if (this.isMyTurn && this.canForfeit) {
        // Play surrender sound
        audioService.playSurrenderSound();
        
        this.$store.dispatch('forfeit', {
          roomId: this.roomId
        });
      }
    },

    leaveGame() {
      // Play quit sound
      audioService.playUIQuit();
      
      // Stop all background music
      audioService.stopAllBgm();
      
      this.$store.dispatch('leaveRoom', {
        roomId: this.roomId
      });
      
      this.$router.push('/');
    },

    updateWindowSize() {
      this.windowWidth = window.innerWidth;
      this.windowHeight = window.innerHeight;
      this.handMaxWidth = Math.min(1200, this.windowWidth - 40);
    },
    
    // Starte die Spielmusik verzögert nach dem Übergang
    startBackgroundMusic() {
      if (!this.bgmStarted) {
        // Start game BGM
        this.bgmStarted = true;
        audioService.playBgm('game');
      }
    },
    
    // Versuche, an ein laufendes Spiel anzuschließen (via Socket.io)
    reconnectToGame() {
      if (this.reconnectAttempted) return;
      
      this.reconnectAttempted = true;
      
      console.log("Checking if game needs reconnection...");
      
      // Wenn das Spiel im Store noch nicht gestartet ist
      if (!this.$store.state.gameStarted) {
        console.log("Game not started, attempting to reconnect...");
        
        // Versuchen, dem Raum erneut beizutreten und Daten zu holen
        this.$store.dispatch('reconnectToRoom', {
          username: this.username,
          roomId: this.roomId
        }).then(() => {
          console.log("Successfully reconnected to game room");
        }).catch(error => {
          console.error("Failed to reconnect to game room:", error);
          // Wenn das Spiel bereits gestartet ist, aber wir sind nicht drin, bleiben wir trotzdem
          // auf dieser Seite - der Server wird uns die Daten senden
          if (error && error.includes && error.includes("Spiel bereits gestartet")) {
            console.log("Game already started, waiting for data...");
          } else {
            // Bei anderen Fehlern zur Startseite navigieren
            this.$router.push('/');
          }
        });
      }
    }
  },
  created() {
    window.addEventListener('resize', this.updateWindowSize);
    this.updateWindowSize();
    
    // Check if transition is active
    const transitionActive = localStorage.getItem('gameTransitionActive') === 'true';
    this.showTransition = transitionActive;
    
    // Socket-Status prüfen und ggf. Reconnect versuchen - mit Verzögerung
    setTimeout(() => {
      this.reconnectToGame();
    }, 500);

    console.log('Game component created', {
      players: this.players,
      handSizes: this.handSizes,
      opponents: this.opponents,
      currentPlayer: this.currentPlayer
    });
    
    // Store currentPlayer for sound effects
    this.previousCurrentPlayer = this.currentPlayer;
  },
  mounted() {
    console.log('Game component mounted', {
      players: this.players,
      handSizes: this.handSizes,
      opponents: this.opponents,
      currentPlayer: this.currentPlayer,
      transitionActive: this.showTransition
    });
    
    // Initialize audio service
    audioService.init();
    
    // Start the fade from black to game if transition is active
    if (this.showTransition && this.$refs.globalTransition) {
      setTimeout(() => {
        this.$refs.globalTransition.fadeToGame();
      }, 500);
    } else {
      // Otherwise, start background music directly
      this.startBackgroundMusic();
      
      // If it's the player's turn, play the "your turn" sound
      if (this.isMyTurn) {
        // Slight delay to make sure previous sounds have finished
        setTimeout(() => {
          audioService.playYourTurnSound();
        }, 1000);
      }
    }
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateWindowSize);
    
    // Stop all background music
    audioService.stopAllBgm();

    // Beim Verlassen der Komponente den Raum verlassen
    if (this.roomId && !this.gameOver) {
      this.$store.dispatch('leaveRoom', { roomId: this.roomId });
    }
    
    // Clean up transition flag
    localStorage.removeItem('gameTransitionActive');
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

.forfeit-message {
  text-align: center;
  color: white;
  background-color: rgba(0, 0, 0, 0.6);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.forfeited {
  color: #dc3545;
  font-style: italic;
}

.btn-new-game {
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 12px 30px;
  font-size: 16px;
  margin-top: 20px;
  cursor: pointer;
}

.btn-new-game:hover {
  background-color: #218838;
}
</style>