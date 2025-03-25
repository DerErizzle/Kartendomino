<template>
  <div class="game-room">
    <div class="room-header">
      <h1>Warteraum</h1>
      <div class="room-info">
        <span class="room-code">Raumcode: <strong>{{ roomId }}</strong></span>
        <button class="btn-copy" @click="copyRoomCode">Kopieren</button>
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
      <button 
        v-if="isHost" 
        class="btn-start" 
        @click="startGame" 
        :disabled="players.length < 1"
      >
        Spiel starten ({{ players.length < 4 ? 'mit Bots' : '' }})
      </button>
      <button class="btn-leave" @click="leaveRoom">Raum verlassen</button>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';

export default {
  name: 'GameRoom',
  props: {
    roomId: {
      type: String,
      required: true
    }
  },
  computed: {
    ...mapState(['players', 'isHost', 'gameStarted']),
  },
  watch: {
    gameStarted(newVal) {
      if (newVal) {
        this.$router.push({ name: 'Game', params: { roomId: this.roomId } });
      }
    }
  },
  methods: {
    ...mapActions(['startGame', 'leaveRoom']),
    
    getInitials(name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    },
    
    copyRoomCode() {
      navigator.clipboard.writeText(this.roomId).then(() => {
        alert('Raumcode in die Zwischenablage kopiert!');
      });
    }
  },
  beforeRouteLeave(to, from, next) {
    if (to.name !== 'Game') {
      this.leaveRoom();
    }
    next();
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
}

.room-header {
  text-align: center;
  margin-bottom: 30px;
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

.players-list {
  flex: 1;
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  overflow-y: auto;
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