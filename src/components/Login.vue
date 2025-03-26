<template>
  <div class="login-container">
    <!-- Audio Controls -->
    <AudioControls />
    
    <div class="login-box">
      <h1>Kartendomino</h1>
      
      <div class="form-group">
        <label for="username">Dein Name:</label>
        <input 
          type="text" 
          id="username" 
          v-model="username" 
          placeholder="Gib deinen Namen ein (3-15 Zeichen)"
          @input="validateUsername"
        />
      </div>
      
      <div class="action-container">
        <div class="action-box">
          <h3>Neues Spiel</h3>
          <button 
            class="btn-action create" 
            @click="createRoom" 
            :disabled="!isValidUsername"
          >
            Raum erstellen
          </button>
        </div>
        
        <div class="action-box" :class="{ 'highlight': prefillRoomId }">
          <h3>Beitreten</h3>
          <div class="join-form">
            <input 
              type="text" 
              v-model="roomId" 
              placeholder="Raumcode eingeben"
              maxlength="3"
              pattern="[0-9]{3}"
              @keyup.enter="joinRoom"
            />
            <button 
              class="btn-action join"
              @click="joinRoom" 
              :disabled="!isValidUsername || !isValidRoomId"
            >
              Beitreten
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import AudioControls from './AudioControls.vue';
import audioService from '../services/audioService';

export default {
  name: 'Login',
  components: {
    AudioControls
  },
  data() {
    return {
      username: localStorage.getItem('username') || '',
      roomId: '',
      prefillRoomId: false
    }
  },
  computed: {
    isValidUsername() {
      return this.username.length >= 3 && this.username.length <= 15;
    },
    isValidRoomId() {
      return /^\d{3}$/.test(this.roomId);
    }
  },
  methods: {
    validateUsername() {
    },
    
    createRoom() {
      if (this.isValidUsername) {
        this.$store.dispatch('createRoom', this.username).then((roomId) => {
          if (roomId) {
            this.$router.push({ name: 'GameRoom', params: { roomId } });
          } else {
            alert('Fehler beim Erstellen des Raums. Bitte versuche es erneut.');
          }
        }).catch(error => {
          console.error('Raumerstellung fehlgeschlagen:', error);
          alert('Fehler beim Erstellen des Raums. Bitte versuche es erneut.');
        });
      }
    },
    
    joinRoom() {
      if (this.isValidUsername && this.isValidRoomId) {
        this.$store.dispatch('joinRoom', {
          username: this.username,
          roomId: this.roomId
        }).then(() => {
          this.$router.push({ name: 'GameRoom', params: { roomId: this.roomId } });
        }).catch(error => {
          console.error('Beitritt zum Raum fehlgeschlagen:', error);
          alert('Fehler beim Beitreten zum Raum. Bitte überprüfe den Raumcode.');
        });
      }
    }
  },
  created() {
    // Prüfen, ob ein Raumcode in der URL ist
    if (this.$route.query.roomId) {
      this.roomId = this.$route.query.roomId;
      this.prefillRoomId = true;
    }
  },
  mounted() {
    // Initialize audio service but don't play music
    audioService.init();
  },
  beforeUnmount() {
    // No need to stop music when navigating to game room
    // as the Game component will handle the transition
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #1b7e44;
}

.login-box {
  background-color: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  width: 400px;
  max-width: 90%;
}

h1 {
  text-align: center;
  color: #1b7e44;
  margin-bottom: 30px;
}

h3 {
  color: #1b7e44;
  margin-bottom: 10px;
  text-align: center;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
}

input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  box-sizing: border-box;
  margin-bottom: 5px;
}

.action-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 20px;
}

.action-box {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.action-box.highlight {
  background-color: #e8f4ff;
  box-shadow: 0 0 8px rgba(0, 123, 255, 0.4);
}

.join-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-action {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.2s ease;
}

.btn-action:hover:not(:disabled) {
  transform: translateY(-2px);
}

.btn-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.create {
  background-color: #28a745;
  color: white;
}

.create:hover:not(:disabled) {
  background-color: #218838;
}

.join {
  background-color: #007bff;
  color: white;
}

.join:hover:not(:disabled) {
  background-color: #0069d9;
}

@media (max-width: 480px) {
  .login-box {
    padding: 20px;
  }
  
  .action-container {
    gap: 15px;
  }
}
</style>