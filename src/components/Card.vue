<template>
  <div 
    class="card" 
    :class="{ 
      'playable': playable, 
      'unplayable': !playable && !isFaceDown,
      'face-down': isFaceDown
    }"
    :style="cardStyle"
    @click="onClick"
  >
    <img 
      v-if="!isFaceDown" 
      :src="getCardImageSrc(card)" 
      :alt="getCardAlt(card)"
      class="card-image"
    />
    <img 
      v-else 
      src="/assets/card_cover.png" 
      alt="Card Back"
      class="card-image"
    />
  </div>
</template>

<script>
export default {
  name: 'Card',
  props: {
    card: {
      type: Object,
      required: false
    },
    playable: {
      type: Boolean,
      default: false
    },
    isFaceDown: {
      type: Boolean,
      default: false
    },
    position: {
      type: Object,
      default: () => null
    },
    scale: {
      type: Number,
      default: 1
    },
    clickable: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    cardWidth() {
      // Feste Werte verwenden für mehr Konsistenz
      return this.isFaceDown ? 70 : 100;
    },
    cardHeight() {
      // Seitenverhältnis beibehalten
      return this.cardWidth * 1.5;
    },
    cardStyle() {
      // Feste Positionierung für bessere Verteilung
      const baseStyles = {
        width: `${this.cardWidth}px`,
        height: `${this.cardHeight}px`,
        cursor: this.clickable && this.playable ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, filter 0.2s ease'
      };
      
      if (this.position) {
        return {
          ...baseStyles,
          position: 'absolute', 
          left: `${this.position.col * 60}px`, // Fester Abstand für bessere Kontrolle
          top: `${this.position.row * 160}px` // Größerer vertikaler Abstand zwischen Farbreihen
        };
      }
      
      return baseStyles;
    }
  },
  methods: {
    onClick() {
      if (this.clickable && this.playable) {
        this.$emit('card-click', this.card);
      }
    },
    getCardImageSrc(card) {
      if (!card) return '';
      // Generiere den Bildpfad basierend auf der Karte
      return `/assets/card_${card.suit}${card.value}.png`;
    },
    getCardAlt(card) {
      if (!card) return 'Card';
      
      const valueMap = {
        '01': 'Ace',
        '11': 'Jack',
        '12': 'Queen',
        '13': 'King'
      };
      
      const suitMap = {
        'c': 'Clubs',
        'd': 'Diamonds',
        'h': 'Hearts',
        's': 'Spades'
      };
      
      const value = valueMap[card.value] || card.value;
      const suit = suitMap[card.suit] || card.suit;
      
      return `${value} of ${suit}`;
    }
  }
}
</script>

<style scoped>
.card {
  display: inline-block;
  user-select: none;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.card.playable {
  cursor: pointer;
  box-shadow: 0 0 10px rgba(255, 255, 0, 0.6);
}

.card.unplayable {
  filter: brightness(70%);
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.playable:hover {
  transform: translateY(-10px) scale(1.05);
  z-index: 100;
  box-shadow: 0 5px 15px rgba(255, 255, 0, 0.8);
}
</style>