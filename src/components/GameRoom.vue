<template>
  <div class="game-room">
    <!-- Audio Controls -->
    <AudioControls />
    
    <!-- Game Transition Overlay -->
    <GameTransition ref="gameTransition" />
    
    <div class="room-header">
      <h1>Warteraum</h1>
      <div class="room-info">
        <span class="room-code">Raumcode: <strong>{{ roomId }}</strong></span>
        <SoundButton class="btn-copy" @click="copyRoomCode">Kopieren</SoundButton>
      </div>
    </div>

    <div class="players-list">
      <h2>Spieler ({{ players.length }}/4)</h2>
      <div class="players">
        <div v-for="(player, index) in players" :key="index" class="player">
          <div class="avatar">
            <img v-if="player.avatar" :src="player.avatar" alt="Avatar" />
            <span v-else>{{ getInitials(player.username) }}</span>
          </div>
          <span class="player-name">{{ player.username }}</span>
          <span v-if="player.isHost" class="host-badge">Host</span>
        </div>

        <div v-for="n in (4 - players.length)" :key="`empty-${n}`" class="player empty">
          <div class="avatar empty">
            <span>?</span>
          </div>
          <span class="player-name">Warte auf Spieler...</span>
        </div>
      </div>
    </div>

    <div class="room-actions">
      <SoundButton v-if="isHost" 
                  class="btn-start" 
                  :disabled="players.length < 1 || transitioning" 
                  @click="startGame"
                  :enableClickSound="false">
        Spiel starten {{ players.length < 4 ? '(mit Bots)' : '' }}
      </SoundButton>
      <SoundButton class="btn-leave" 
                  @click="leaveRoom" 
                  sound="quit">
        Raum verlassen
      </SoundButton>
    </div>
  </div>
</template>

<script>
import AudioControls from './AudioControls.vue';
import GameTransition from './GameTransition.vue';
import SoundButton from './SoundButton.vue';
import audioService from '../services/audioService';

export default {
  name: 'GameRoom',
  components: {
    AudioControls,
    GameTransition,
    SoundButton
  },
  props: {
    roomId: {
      type: String,
      required: true
    }
  },
  computed: {
    players() {
      return this.$store.state.players;
    },
    isHost() {
      return this.$store.state.isHost;
    },
    gameStarted() {
      return this.$store.state.gameStarted;
    }
  },
  watch: {
    gameStarted(newVal) {
      if (newVal && !this.transitionTriggeredByUser) {
        console.log('Game started via server, transitioning...');
        // Nur wenn wir nicht selbst den Spielstart ausgelöst haben
        this.transitionToGame();
      }
    }
  },
  data() {
    return {
      attemptedJoin: false,
      transitioning: false,
      transitionComplete: false,
      transitionTriggeredByUser: false
    };
  },
  methods: {
    async startGame() {
      // Verhindern, dass der Button mehrfach geklickt wird
      if (this.transitioning) return;
      
      this.transitioning = true;
      this.transitionTriggeredByUser = true;
      
      try {
        // 1. Starte den visuellen Übergang
        await this.$refs.gameTransition.startTransition();
        
        // 2. WICHTIG: Speichere dass ein Übergang stattfindet in der localStorage
        localStorage.setItem('gameTransitionActive', 'true');
        
        // 3. Starte das Spiel im Store erst kurz bevor wir zum Spiel wechseln
        this.$store.dispatch('startGame');
        
        // 4. Nach kurzem Delay zum Spiel navigieren
        // Der Bildschirm bleibt schwarz während des Routenwechsels
        this.$router.push({ name: 'Game', params: { roomId: this.roomId } });
      } catch (error) {
        console.error('Game transition error:', error);
        this.transitioning = false;
        this.transitionTriggeredByUser = false;
        localStorage.removeItem('gameTransitionActive');
      }
    },
    
    async transitionToGame() {
      if (this.transitioning) return;
      
      try {
        this.transitioning = true;
        
        // Starte den visuellen Übergang
        await this.$refs.gameTransition.startTransition();
        
        // Markiere dass ein Übergang aktiv ist
        localStorage.setItem('gameTransitionActive', 'true');
        
        // Zum Spiel navigieren
        this.$router.push({ name: 'Game', params: { roomId: this.roomId } });
      } catch (error) {
        console.error('Error during game transition:', error);
        this.transitioning = false;
        localStorage.removeItem('gameTransitionActive');
      }
    },

    leaveRoom() {
      // Play quit sound
      audioService.playUIQuit();
      
      // Stoppe alle Sounds, falls welche spielen
      audioService.stopAllSFX();
      
      this.$store.dispatch('leaveRoom', { roomId: this.roomId })
        .then(() => {
          this.$router.push('/');
        })
        .catch(error => {
          console.error('Fehler beim Verlassen des Raums:', error);
          this.$router.push('/');
        });
    },

    getInitials(name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    },

    copyRoomCode() {
      navigator.clipboard.writeText(this.roomId).then(() => {
        alert('Raumcode in die Zwischenablage kopiert!');
      });
    },

    attemptToJoinRoom() {
      const storedUsername = this.$store.state.username || localStorage.getItem('username');
      
      if (storedUsername) {
        // Versuche dem Raum beizutreten
        this.$store.dispatch('reconnectToRoom', {
          username: storedUsername,
          roomId: this.roomId
        }).catch(error => {
          console.error('Fehler beim Beitreten zum Raum:', error);
          this.$router.push('/');
        });
      } else {
        // Kein Benutzername vorhanden, zur Startseite umleiten
        this.$router.push('/');
      }
      
      this.attemptedJoin = true;
    }
  },
  created() {
    this.attemptToJoinRoom();
  },
  mounted() {
    // Initialize audio service but don't play music
    audioService.init();
  },
  beforeRouteLeave(to, from, next) {
    // Raum nur verlassen, wenn nicht zum Spiel gewechselt wird
    if (to.name !== 'Game') {
      // Play quit sound if not going to game
      audioService.playUIQuit();
      
      this.$store.dispatch('leaveRoom', { roomId: this.roomId })
        .then(() => {
          next();
        })
        .catch(() => {
          next();
        });
    } else {
      // Transition ist bereits aktiv, wir gehen zum Spiel
      next();
    }
  },
  beforeUnmount() {
    // Clean up transition if component is being unmounted
    // but only if we're not transitioning to the game
    if (this.$refs.gameTransition && this.$route.name !== 'Game') {
      this.$refs.gameTransition.cleanUp();
    }
  }
}
</script>

<style scoped>
.game-room {
  display: flex;
  flex-direction: column;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  height: 100vh;
  box-sizing: border-box;
  color: #333;
}

.room-header {
  text-align: center;
  margin-bottom: 30px;
}

h1 {
  color: #1b7e44;
}

.room-info {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
}

.room-code {
  font-size: 18px;
  margin-right: 10px;
}

.btn-copy {
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  cursor: pointer;
}

.btn-copy:hover {
  background-color: #5a6268;
}

.players-list {
  flex: 1;
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  overflow-y: auto;
}

h2 {
  color: #1b7e44;
  margin-bottom: 20px;
}

.players {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.player {
  display: flex;
  align-items: center;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.player.empty {
  opacity: 0.5;
}

.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #1b7e44;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  margin-right: 15px;
}

.avatar.empty {
  background-color: #6c757d;
}

.player-name {
  font-size: 18px;
  flex: 1;
}

.host-badge {
  background-color: #ffc107;
  color: #212529;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.room-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.btn-start {
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 12px 30px;
  font-size: 16px;
  cursor: pointer;
}

.btn-start:hover {
  background-color: #218838;
}

.btn-start:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.btn-leave {
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 12px 30px;
  font-size: 16px;
  cursor: pointer;
}

.btn-leave:hover {
  background-color: #c82333;
}
</style>