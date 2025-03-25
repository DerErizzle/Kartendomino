<template>
  <div class="card-hand" :style="handStyle">
    <Card
      v-for="(card, index) in sortedCards"
      :key="card.id"
      :card="card"
      :playable="isCardPlayable(card)"
      :inHand="true"
      :offset="getCardOffset(index)"
      @card-click="onCardClick"
      @card-hover="(isHovered) => updateHoverState(index, isHovered)"
    />
  </div>
</template>

<script>
import Card from './Card.vue';
import { sortHand } from '../utils/cardUtils';
import { mapGetters } from 'vuex';

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
    }
  },
  data() {
    return {
      hoveredIndex: -1
    };
  },
  computed: {
    ...mapGetters(['playableCards']),
    
    sortedCards() {
      return sortHand(this.cards);
    },
    
    cardWidth() {
      return 100;
    },
    
    cardOverlap() {
      if (this.cards.length <= 1) return 0;
      
      const totalCardsWidth = this.cardWidth * this.cards.length;
      const availableWidth = Math.min(this.maxWidth, window.innerWidth - 40);
      
      if (totalCardsWidth <= availableWidth) {
        return Math.max(0, Math.min(this.cardWidth * 0.5, (this.cardWidth * 0.7) - (availableWidth - totalCardsWidth) / (this.cards.length - 1)));
      } else {
        return Math.min(this.cardWidth * 0.7, (totalCardsWidth - availableWidth) / (this.cards.length - 1));
      }
    },
    
    handWidth() {
      if (this.cards.length === 0) return 0;
      return this.cardWidth + (this.cards.length - 1) * (this.cardWidth - this.cardOverlap);
    },
    
    handStyle() {
      return {
        width: `${this.handWidth}px`,
        height: `${this.cardWidth * 1.54 + 20}px` // 20px extra for hover effect
      };
    }
  },
  methods: {
    getCardOffset(index) {
      return index * (this.cardWidth - this.cardOverlap);
    },
    
    isCardPlayable(card) {
      if (!this.isMyTurn) return false;
      return this.playableCards.some(playable => playable.id === card.id);
    },
    
    onCardClick(card) {
      if (this.isCardPlayable(card)) {
        this.$emit('play-card', card);
      }
    },
    
    updateHoverState(index, isHovered) {
      this.hoveredIndex = isHovered ? index : -1;
    }
  }
}
</script>

<style scoped>
.card-hand {
  position: relative;
  margin: 0 auto;
}
</style>