<template>
  <div class="login-container">
    <div class="login-box">
      <h1>Kartendomino</h1>
      
      <div class="form-group">
        <label for="username">Dein Name:</label>
        <input 
          type="text" 
          id="username" 
          v-model="username" 
          placeholder="Gib deinen Namen ein"
          @keyup.enter="username ? showOptions = true : null"
        />
      </div>
      
      <button 
        class="btn-primary" 
        @click="showOptions = true" 
        :disabled="!username"
      >
        Weiter
      </button>
      
      <div v-if="showOptions" class="options">
        <div class="option-buttons">
          <button @click="createRoom">Raum erstellen</button>
          <button @click="showJoinForm = true">Raum beitreten</button>
        </div>
        
        <div v-if="showJoinForm" class="join-form">
          <input 
            type="text" 
            v-model="roomId" 
            placeholder="Raumcode eingeben"
            maxlength="3"
            pattern="[0-9]{3}"
            @keyup.enter="joinRoom"
          />
          <button @click="joinRoom" :disabled="!isValidRoomId">Beitreten</button>
          <button class="secondary" @click="showJoinForm = false">Zurück</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Login',
  data() {
    return {
      username: localStorage.getItem('username') || '',
      showOptions: false,
      showJoinForm: false,
      roomId: ''
    }
  },
  computed: {
    isValidRoomId() {
      return /^\d{3}$/.test(this.roomId);
    }
  },
  methods: {
    createRoom() {
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
    },
    
    joinRoom() {
      if (this.isValidRoomId) {
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
}

.btn-primary {
  width: 100%;
  padding: 10px;
  background-color: #1b7e44;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.btn-primary:hover {
  background-color: #155e34;
}

.btn-primary:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.options {
  margin-top: 20px;
}

.option-buttons {
  display: flex;
  justify-content: space-between;
}

.option-buttons button {
  width: 48%;
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.option-buttons button:hover {
  background-color: #0056b3;
}

.join-form {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.join-form input {
  flex: 1;
  min-width: 0;
}

.join-form button {
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.join-form button:hover {
  background-color: #0056b3;
}

.join-form button.secondary {
  background-color: #6c757d;
}

.join-form button.secondary:hover {
  background-color: #5a6268;
}
</style>