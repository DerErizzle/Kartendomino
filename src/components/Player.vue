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
        v-for="i in Math.min(cardCount, 8)" 
        :key="i" 
        class="opponent-card"
        :style="getCardStyle(i-1)"
      >
        <Card :isFaceDown="true" :clickable="false" :scale="0.8" />
      </div>
      
      <div class="card-count" v-if="cardCount > 8">+{{ cardCount - 8 }}</div>
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
      const spacing = 20; // Überlappung zwischen Karten
      
      return {
        position: 'absolute',
        left: `${index * spacing}px`,
        zIndex: index
      };
    }
  }
}
</script>

<style scoped>
.player-container {
  padding: 10px;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.1);
  margin: 5px;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 180px;
  position: relative;
}

.current-turn {
  background-color: rgba(255, 255, 204, 0.3);
}

.player-info {
  display: flex;
  align-items: center;
  width: 100%;
}

.avatar {
  width: 40px;
  height: 40px;
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
  margin-bottom: 4px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.pass-counter {
  font-size: 12px;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.player-cards {
  position: relative;
  height: 80px;
  margin-top: 10px;
  width: 180px;
}

.opponent-card {
  transition: transform 0.2s ease;
}

.card-count {
  position: absolute;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: bold;
}

/* Positionsabhängige Stile */
.position-1 {
  position: absolute;
  left: 20px;
  top: 20px;
}

.position-2 {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 20px;
}

.position-3 {
  position: absolute;
  right: 20px;
  top: 20px;
}
</style>