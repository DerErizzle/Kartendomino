<template>
  <div 
    class="card" 
    :class="{ 
      'playable': playable, 
      'unplayable': !playable && !isFaceDown && card && card.disconnected,
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
      return 90 * this.scale;
    },
    cardHeight() {
      return this.cardWidth * 1.4;
    },
    cardStyle() {
      const baseStyles = {
        width: `${this.cardWidth}px`,
        height: `${this.cardHeight}px`,
        cursor: this.clickable && this.playable ? 'pointer' : 'default'
      };
      
      if (this.position) {
        return {
          ...baseStyles,
          position: 'absolute',
          left: `${this.position.col * 95}px`,
          top: `${this.position.row * 130}px`
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
  transition: transform 0.2s ease;
}

.card.playable {
  cursor: pointer;
}

.card.unplayable {
  filter: brightness(60%);
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

.playable:hover {
  transform: translateY(-10px);
  z-index: 100;
}
</style>