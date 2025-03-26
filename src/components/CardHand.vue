<template>
  <div class="card-hand" :style="handStyle">
    <div 
      v-for="(card, index) in sortedCards" 
      :key="card.id" 
      class="card-wrapper"
      :style="getCardStyle(index)"
      @mouseenter="hoveredIndex = index"
      @mouseleave="hoveredIndex = -1"
    >
      <Card
        :card="card"
        :playable="isCardPlayable(card)"
        :inHand="true"
        @card-click="onCardClick"
        :enableHoverSound="true"
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
        const suits = ['s', 'c', 'h', 'd'];
        if (a.suit !== b.suit) {
          return suits.indexOf(a.suit) - suits.indexOf(b.suit);
        }
        return parseInt(a.value) - parseInt(b.value);
      });
    },
    
    cardWidth() {
      // Karten bei vielen Karten etwas kleiner machen
      return this.cards.length > 15 ? 80 : 90;
    },
    
    handWidth() {
      const totalWidth = this.calculateTotalWidth();
      return Math.min(totalWidth, this.maxWidth);
    },
    
    handStyle() {
      return {
        width: `${this.handWidth}px`,
        height: `${this.cardWidth * 1.8}px`
      };
    },
    
    cardSpacing() {
      if (this.cards.length <= 1) return 0;
      
      const totalCardWidth = this.cardWidth * this.cards.length;
      const availableWidth = Math.min(this.maxWidth, window.innerWidth - 40);
      
      // Mehr Abstand zwischen den Karten
      if (this.cards.length <= 8) {
        // Bei wenigen Karten mehr Abstand
        return Math.min(this.cardWidth * 1.2, availableWidth / (this.cards.length));
      } else if (this.cards.length <= 13) {
        // Bei mittlerer Anzahl
        return Math.min(this.cardWidth * 0.9, availableWidth / (this.cards.length));
      } else {
        // Bei vielen Karten etwas mehr Überlappung, aber immer noch genug Abstand
        return Math.min(this.cardWidth * 0.7, availableWidth / (this.cards.length + 2));
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
      const isHovered = this.hoveredIndex === index;
      const baseStyle = {
        position: 'absolute',
        left: `${index * this.cardSpacing}px`,
        transition: 'all 0.2s ease',
        zIndex: isHovered ? 100 : index
      };
      
      return baseStyle;
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
  height: 160px;
  perspective: 1000px;
}

.card-wrapper {
  position: absolute;
  transition: all 0.2s ease;
  transform-style: preserve-3d;
}

.card-wrapper:hover {
  z-index: 100 !important;
}

/* Responsive Design */
@media (max-width: 768px) {
  .card-hand {
    height: 140px;
  }
}

@media (max-width: 480px) {
  .card-hand {
    height: 120px;
  }
}
</style>