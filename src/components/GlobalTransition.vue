<template>
    <div class="global-transition" :class="{ 'active': active, 'fade-out': fadeOut }">
      <!-- Optional text or content to show during transition -->
    </div>
  </template>
  
  <script>
  export default {
    name: 'GlobalTransition',
    data() {
      return {
        active: true,  // Start active (black screen)
        fadeOut: false
      };
    },
    methods: {
      // Start the fade-out animation
      fadeToGame() {
        this.fadeOut = true;
        
        // After the fade-out completes, deactivate
        setTimeout(() => {
          this.active = false;
          this.$emit('transition-complete');
        }, 1000); // Fade-out duration
      }
    }
  }
  </script>
  
  <style scoped>
  .global-transition {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: black;
    z-index: 9999;
    opacity: 1;  /* Start fully black */
    pointer-events: none;
    transition: opacity 1s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .global-transition.active {
    pointer-events: all;
  }
  
  .global-transition.fade-out {
    opacity: 0;
  }
  </style>