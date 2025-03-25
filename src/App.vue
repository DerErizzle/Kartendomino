<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App',
  created() {
    // Prüfe, ob ein Spiel im Gange war
    const savedSession = localStorage.getItem('gameSession');
    
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        const currentTime = new Date().getTime();
        
        // Prüfe, ob die Session nicht älter als 2 Stunden ist
        if (session.timestamp && (currentTime - session.timestamp < 7200000)) {
          // Versuche, zum vorherigen Spiel zurückzukehren
          const room = session.roomId;
          const username = session.username;
          
          if (room && username) {
            this.$store.commit('setUsername', username);
            this.$store.commit('setRoomId', room);
            
            // Prüfe, ob das Spiel bereits gestartet war
            if (session.gameStarted) {
              this.$router.push({ name: 'Game', params: { roomId: room } });
            } else {
              this.$router.push({ name: 'GameRoom', params: { roomId: room } });
            }
            
            // Versuche, dem Raum beizutreten
            this.$store.dispatch('reconnectToRoom', {
              username,
              roomId: room
            }).catch(error => {
              console.error('Reconnection failed:', error);
            });
          }
        } else {
          // Session ist abgelaufen, löschen
          localStorage.removeItem('gameSession');
        }
      } catch (error) {
        console.error('Fehler beim Wiederherstellen der Session:', error);
        localStorage.removeItem('gameSession');
      }
    }
  }
}
</script>

<style>
/* Globale Stile */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Roboto', Arial, sans-serif;
  background-color: #f8f9fa;
  color: #333;
  line-height: 1.5;
  overflow: hidden;
}

#app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* Buttons allgemein */
button {
  cursor: pointer;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  transition: all 0.2s ease;
}

button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* Schriftart laden */
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
</style>