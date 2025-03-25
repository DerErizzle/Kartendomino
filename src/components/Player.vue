<template>
  <div class="player-container"
    :class="{ 'current-turn': isCurrentPlayer, 'position-1': position === 1, 'position-2': position === 2, 'position-3': position === 3 }">
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
      <Card v-for="i in cardCount" :key="i" :isFaceDown="true" :scale="0.7" :clickable="false" class="opponent-card"
        :style="getCardStyle(i - 1)" />
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
      const spacing = 12;

      return {
        position: 'absolute',
        left: `${index * spacing}px`,
        zIndex: index + 1,
        transformOrigin: 'bottom center'
      };
    }
  },
  mounted() {
    console.log('Player mounted:', {
      username: this.username,
      cardCount: this.cardCount,
      position: this.position,
      showCards: this.showCards,
      isCurrentPlayer: this.isCurrentPlayer
    });
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
  width: 250px;
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
  width: 170px;
  margin-top: 5px;
  perspective: 800px;
}

.opponent-card {
  position: absolute !important;
  transition: transform 0.2s ease;
}

.opponent-card:hover {
  transform: none !important;
}

.player-cards .card.face-down:hover {
  transform: none !important;
}

</style>