<template>
    <div class="audio-controls" @mouseenter="showSlider = true" @mouseleave="showSlider = false">
      <div class="volume-control">
        <label>🔊</label>
        <input 
          v-if="showSlider"
          type="range" 
          min="0" 
          max="1" 
          step="0.1" 
          v-model="masterVolume" 
          @input="updateMasterVolume"
        />
      </div>
    </div>
  </template>
  
  <script>
  import audioService from '../services/audioService';
  
  export default {
    name: 'AudioControls',
    data() {
      return {
        masterVolume: audioService.masterVolume,
        showSlider: false
      };
    },
    methods: {
      updateMasterVolume() {
        const volume = parseFloat(this.masterVolume);
        audioService.setMasterVolume(volume);
        
        // Also update individual BGM and SFX volumes proportionally
        audioService.setBgmVolume(volume);
        audioService.setSfxVolume(volume);
      }
    },
    mounted() {
      // Initialize audio service when component is mounted but don't start music
      audioService.init();
    }
  }
  </script>
  
  <style scoped>
  .audio-controls {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 999;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
  
  .volume-control {
    display: flex;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 20px;
    padding: 6px 12px;
    transition: all 0.3s ease;
    cursor: pointer;
  }
  
  .volume-control label {
    color: white;
    font-size: 20px;
    margin-right: 8px;
  }
  
  .volume-control input {
    width: 80px;
    transition: opacity 0.3s ease, width 0.3s ease;
  }
  
  .volume-slider input {
    width: 100%;
  }
  </style>