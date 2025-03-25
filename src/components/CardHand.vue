<template>
  <div class="card-hand" :style="handStyle">
    <div 
      v-for="(card, index) in sortedCards" 
      :key="card.id" 
      class="card-wrapper"
      :style="getCardStyle(index)"
    >
      <Card
        :card="card"
        :playable="isCardPlayable(card)"
        :inHand="true"
        @card-click="onCardClick"
      />
    </div>
  </div>
</template>

<script>
import Card from './Card.vue';

export default {
  name: 'CardHand',
  components: {
    Card
  },
  props: {
    cards: {
      type: Array,
      required: true
    },
    maxWidth: {
      type: Number,
      default: 1200
    },
    isMyTurn: {
      type: Boolean,
      default: false
    },
    playableCards: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      hoveredIndex: -1
    };
  },
  computed: {
    sortedCards() {
      // Sortieren nach Farbe und dann nach Wert
      return [...this.cards].sort((a, b) => {
        const suits = ['c', 'd', 'h', 's'];
        if (a.suit !== b.suit) {
          return suits.indexOf(a.suit) - suits.indexOf(b.suit);
        }
        return parseInt(a.value) - parseInt(b.value);
      });
    },
    
    cardWidth() {
      return 90;
    },
    
    handWidth() {
      const totalWidth = this.calculateTotalWidth();
      return Math.min(totalWidth, this.maxWidth);
    },
    
    handStyle() {
      return {
        width: `${this.handWidth}px`,
        height: `${this.cardWidth * 1.6}px`
      };
    },
    
    cardSpacing() {
      if (this.cards.length <= 1) return 0;
      
      const totalCardWidth = this.cardWidth * this.cards.length;
      const availableWidth = Math.min(this.maxWidth, window.innerWidth - 40);
      
      // Selbst wenn genug Platz wäre, etwas Überlappung gewünscht
      if (totalCardWidth <= availableWidth) {
        return Math.max(this.cardWidth * 0.7, this.cardWidth - 20);
      } else {
        // Stärkere Überlappung bei vielen Karten
        const maxSpacing = availableWidth / (this.cards.length - 1);
        return Math.min(this.cardWidth * 0.6, maxSpacing);
      }
    }
  },
  methods: {
    calculateTotalWidth() {
      if (this.cards.length <= 0) return 0;
      
      // Berechnen der Gesamtbreite unter Berücksichtigung der Überlappung
      return this.cardWidth + (this.cards.length - 1) * this.cardSpacing;
    },
    
    getCardStyle(index) {
      return {
        position: 'absolute',
        left: `${index * this.cardSpacing}px`,
        transition: 'transform 0.2s ease',
        zIndex: index
      };
    },
    
    isCardPlayable(card) {
      if (!this.isMyTurn) return false;
      return this.playableCards.some(playable => playable.id === card.id);
    },
    
    onCardClick(card) {
      if (this.isCardPlayable(card)) {
        this.$emit('play-card', card);
      }
    }
  }
}
</script>

<style scoped>
.card-hand {
  position: relative;
  margin: 0 auto;
}

.card-wrapper {
  position: absolute;
  transition: transform 0.2s ease;
}

.card-wrapper:hover {
  transform: translateY(-20px);
  z-index: 100 !important;
}
</style>