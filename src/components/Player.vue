<template>
  <div class="player-container" :class="{ 'current-turn': isCurrentPlayer, 'position-1': position === 1, 'position-2': position === 2, 'position-3': position === 3 }">
    <div class="player-info">
      <div class="avatar">
        <img v-if="avatar" :src="avatar" alt="Avatar" />
        <span v-else>{{ getInitials(username) }}</span>
      </div>
      
      <div class="player-details">
        <div class="player-name">{{ username }}</div>
        <div class="pass-counter">Passen {{ passCount }}/3</div>
      </div>
    </div>
    
    <div class="player-cards" v-if="showCards && cardCount > 0">
      <div 
        v-for="i in Math.min(cardCount, 7)" 
        :key="i" 
        class="opponent-card"
        :style="getCardStyle(i-1)"
      >
        <Card :isFaceDown="true" :clickable="false" :scale="0.7" />
      </div>
      
      <div class="card-count" v-if="cardCount > 7">+{{ cardCount - 7 }}</div>
    </div>
  </div>
</template>

<script>
import Card from './Card.vue';

export default {
  name: 'Player',
  components: {
    Card
  },
  props: {
    username: {
      type: String,
      required: true
    },
    avatar: {
      type: String,
      default: null
    },
    cardCount: {
      type: Number,
      default: 0
    },
    passCount: {
      type: Number,
      default: 0
    },
    isCurrentPlayer: {
      type: Boolean,
      default: false
    },
    position: {
      type: Number,
      default: 1
    },
    showCards: {
      type: Boolean,
      default: true
    }
  },
  methods: {
    getInitials(name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    },
    
    getCardStyle(index) {
      // Überlappung zwischen Karten
      const spacing = 15;
      
      // Karten im Fächer anordnen (nur leicht überlappend)
      return {
        position: 'absolute',
        left: `${index * spacing}px`,
        zIndex: index + 1,
        transform: `rotate(${-5 + index * 2}deg)`,
        transformOrigin: 'bottom center'
      };
    }
  }
}
</script>

<style scoped>
.player-container {
  padding: 10px;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.2);
  margin: 5px;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 200px;
  position: relative;
}

.current-turn {
  background-color: rgba(255, 255, 204, 0.4);
  box-shadow: 0 0 10px rgba(255, 255, 0, 0.5);
}

.player-info {
  display: flex;
  align-items: center;
  width: 100%;
  margin-bottom: 8px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #1b7e44;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  margin-right: 10px;
  overflow: hidden;
  border: 2px solid white;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.player-details {
  flex: 1;
}

.player-name {
  font-weight: bold;
  font-size: 14px;
  color: white;
  margin-bottom: 2px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
}

.pass-counter {
  font-size: 12px;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
}

.player-cards {
  position: relative;
  height: 85px;
  width: 160px;
  margin-top: 5px;
  perspective: 800px;
}

.opponent-card {
  transition: transform 0.2s ease;
  display: inline-block;
}

.card-count {
  position: absolute;
  right: -5px;
  bottom: -5px;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 3px 6px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: bold;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
}

/* Positionsabhängige Stile */
.position-1 {
  position: absolute;
  left: 20px;
  top: 10px;
}

.position-2 {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 10px;
}

.position-3 {
  position: absolute;
  right: 20px;
  top: 10px;
}

/* Unterschiedliche Kartenanordnung je nach Position */
.position-1 .player-cards {
  transform: rotate(-5deg);
}

.position-3 .player-cards {
  transform: rotate(5deg);
}

/* Responsives Design für kleinere Bildschirme */
@media (max-width: 768px) {
  .player-container {
    width: 180px;
    padding: 8px;
  }
  
  .player-cards {
    width: 140px;
    height: 75px;
  }
  
  .avatar {
    width: 30px;
    height: 30px;
    font-size: 14px;
  }
  
  .player-name {
    font-size: 12px;
  }
  
  .pass-counter {
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  .player-container {
    width: 120px;
    padding: 5px;
  }
  
  .player-cards {
    width: 100px;
    height: 65px;
  }
}
</style>