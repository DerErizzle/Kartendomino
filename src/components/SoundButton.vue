<template>
    <button 
      class="sound-button" 
      :class="buttonClass" 
      @click="onClick" 
      @mouseenter="onMouseEnter"
      :disabled="disabled"
    >
      <slot></slot>
    </button>
  </template>
  
  <script>
  import audioService from '../services/audioService';
  
  export default {
    name: 'SoundButton',
    props: {
      buttonClass: {
        type: String,
        default: ''
      },
      disabled: {
        type: Boolean,
        default: false
      },
      sound: {
        type: String,
        default: 'hover'
      },
      // Wenn false, wird kein Klicksound abgespielt (für spezielle Buttons)
      enableClickSound: {
        type: Boolean,
        default: true
      }
    },
    methods: {
      onClick(event) {
        if (!this.disabled && this.enableClickSound) {
          audioService.playUIClick();
        }
        this.$emit('click', event);
      },
      onMouseEnter() {
        if (!this.disabled) {
          audioService.playUIHover();
        }
      }
    }
  }
  </script>
  
  <style scoped>
  .sound-button {
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .sound-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  </style>