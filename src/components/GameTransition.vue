<template>
    <div class="game-transition" :class="{ 'active': active, 'fade-in': fadeIn }">
      <!-- Optional text or content to show during transition -->
    </div>
  </template>
  
  <script>
  import audioService from '../services/audioService';
  
  export default {
    name: 'GameTransition',
    data() {
      return {
        active: false,
        fadeIn: false,
        startingSound: null
      };
    },
    methods: {
      startTransition() {
        return new Promise((resolve) => {
          // Play the start game sound
          audioService.playUIStartGame();
          
          // Step 1: Activate and fade in to black
          this.active = true;
          this.fadeIn = true;
          
          // Step 2: After the fade-in completes, play the game starting sound
          setTimeout(() => {
            // Spielstartton abspielen und ID speichern
            this.startingSound = audioService.playGameStarting();
            
            // Warten, bis der Ton fast fertig ist, dann die Promise auflösen
            const duration = audioService.getGameStartingSoundDuration();
            setTimeout(() => {
              // Hier KEINEN Fade-Out starten - der Bildschirm bleibt schwarz!
              // Die GameRoom-Komponente übernimmt das Routing, DANN erfolgt später der Fade-Out im Game-Component
              resolve();
            }, Math.max(0, duration - 1000)); // 1 Sekunde vor Ende des Tons
          }, 1000); // Fade-in-Dauer
        });
      },
      
      // Clean up the transition
      cleanUp() {
        this.active = false;
        this.fadeIn = false;
        
        // Stoppe laufende Sounds
        if (this.startingSound) {
          audioService.stopSound(this.startingSound);
          this.startingSound = null;
        }
      }
    }
  }
  </script>
  
  <style scoped>
  .game-transition {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: black;
    z-index: 9999;
    opacity: 0;
    pointer-events: none;
    transition: opacity 1s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .game-transition.active {
    pointer-events: all;
  }
  
  .game-transition.fade-in {
    opacity: 1;
  }
  </style>