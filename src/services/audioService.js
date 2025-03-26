import { Howl, Howler } from 'howler';

class AudioService {
  constructor() {
    this.initialized = false;
    this.masterVolume = 0.8;
    this.bgmVolume = 0.5;
    this.sfxVolume = 0.7;
    this.currentBgm = null;
    this.currentLoopSource = null;
    
    // Sound definitions
    this.sounds = {
      // Game background music (intro + loop)
      gameBgm: {
        intro: null,
        loop: null
      },
      // Win music (intro + loop)
      winBgm: {
        intro: null,
        loop: null
      },
      // Lose music (intro + loop)
      loseBgm: {
        intro: null,
        loop: null
      },
      // Sound effects
      sfx: {
        pass: null
      }
    };

    // Try to load saved audio settings from localStorage
    this.loadSettings();
    
    // Set master volume
    Howler.volume(this.masterVolume);
  }

  // Initialize all sounds
  init() {
    if (this.initialized) return;

    // Game BGM
    this.sounds.gameBgm.intro = new Howl({
      src: ['/assets/BGM_SEVENS_beginning.ogg'],
      volume: this.bgmVolume,
      onend: () => {
        this.playLoopingBgm('game');
      }
    });

    this.sounds.gameBgm.loop = new Howl({
      src: ['/assets/BGM_SEVENS_loop.ogg'],
      volume: this.bgmVolume,
      loop: true
    });

    // Win BGM
    this.sounds.winBgm.intro = new Howl({
      src: ['/assets/WIN_SEVENS_beginning.ogg'],
      volume: this.bgmVolume,
      onend: () => {
        this.playLoopingBgm('win');
      }
    });

    this.sounds.winBgm.loop = new Howl({
      src: ['/assets/WIN_SEVENS_loop.ogg'],
      volume: this.bgmVolume,
      loop: true
    });

    // Lose BGM
    this.sounds.loseBgm.intro = new Howl({
      src: ['/assets/LOSE_SEVENS_beginning.ogg'],
      volume: this.bgmVolume,
      onend: () => {
        this.playLoopingBgm('lose');
      }
    });

    this.sounds.loseBgm.loop = new Howl({
      src: ['/assets/LOSE_SEVENS_loop.ogg'],
      volume: this.bgmVolume,
      loop: true
    });

    // Sound effects
    this.sounds.sfx.pass = new Howl({
      src: ['/assets/SFX_SEVENS_pass.ogg'],
      volume: this.sfxVolume
    });

    this.initialized = true;
    
    // Apply master volume
    Howler.volume(this.masterVolume);
  }

  // Play a BGM track with intro and seamless loop
  playBgm(type) {
    if (!this.initialized) this.init();
    
    // Stop any currently playing BGM
    this.stopAllBgm();
    
    // Set the current BGM type
    this.currentBgm = type;
    
    // Play the intro which will automatically transition to the loop
    switch(type) {
      case 'game':
        this.sounds.gameBgm.intro.play();
        break;
      case 'win':
        this.sounds.winBgm.intro.play();
        break;
      case 'lose':
        this.sounds.loseBgm.intro.play();
        break;
      default:
        console.error('Unknown BGM type:', type);
    }
  }

  // Internal method to seamlessly transition from intro to loop
  playLoopingBgm(type) {
    // Only start the loop if this is still the current BGM
    if (this.currentBgm !== type) return;
    
    switch(type) {
      case 'game':
        this.currentLoopSource = this.sounds.gameBgm.loop.play();
        break;
      case 'win':
        this.currentLoopSource = this.sounds.winBgm.loop.play();
        break;
      case 'lose':
        this.currentLoopSource = this.sounds.loseBgm.loop.play();
        break;
      default:
        console.error('Unknown BGM loop type:', type);
    }
  }

  // Play the pass sound effect
  playPassSound() {
    if (!this.initialized) this.init();
    this.sounds.sfx.pass.play();
  }

  // Stop all background music
  stopAllBgm() {
    if (!this.initialized) return;
    
    // Stop all potential BGM sources
    this.sounds.gameBgm.intro.stop();
    this.sounds.gameBgm.loop.stop();
    this.sounds.winBgm.intro.stop();
    this.sounds.winBgm.loop.stop();
    this.sounds.loseBgm.intro.stop();
    this.sounds.loseBgm.loop.stop();
    
    this.currentBgm = null;
    this.currentLoopSource = null;
  }

  // Set master volume
  setMasterVolume(volume) {
    this.masterVolume = volume;
    Howler.volume(volume);
    this.saveSettings();
    return this.masterVolume;
  }

  // Set BGM volume
  setBgmVolume(volume) {
    this.bgmVolume = volume;
    
    if (this.initialized) {
      // Update all BGM volumes, but respect the master volume
      this.sounds.gameBgm.intro.volume(volume);
      this.sounds.gameBgm.loop.volume(volume);
      this.sounds.winBgm.intro.volume(volume);
      this.sounds.winBgm.loop.volume(volume);
      this.sounds.loseBgm.intro.volume(volume);
      this.sounds.loseBgm.loop.volume(volume);
    }
    
    this.saveSettings();
  }

  // Set SFX volume
  setSfxVolume(volume) {
    this.sfxVolume = volume;
    
    if (this.initialized) {
      // Update all SFX volumes
      this.sounds.sfx.pass.volume(volume);
    }
    
    this.saveSettings();
  }

  // Save audio settings to localStorage
  saveSettings() {
    try {
      const settings = {
        masterVolume: this.masterVolume
      };
      
      localStorage.setItem('audioSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save audio settings:', error);
    }
  }

  // Load audio settings from localStorage
  loadSettings() {
    try {
      const settingsStr = localStorage.getItem('audioSettings');
      
      if (settingsStr) {
        const settings = JSON.parse(settingsStr);
        this.masterVolume = settings.masterVolume !== undefined ? settings.masterVolume : 0.8;
        // Set BGM and SFX to the same as master volume for simplicity
        this.bgmVolume = this.masterVolume;
        this.sfxVolume = this.masterVolume;
      }
    } catch (error) {
      console.error('Failed to load audio settings:', error);
    }
  }
}

// Create a singleton instance
const audioService = new AudioService();

export default audioService;