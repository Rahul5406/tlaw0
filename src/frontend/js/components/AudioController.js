// Authoritative Background Audio Controller Component (TLA-026)
import { Toast } from './Toast.js';

class AudioControllerSingleton {
  constructor() {
    this.audioEl = null;
    this.defaultVolume = 0.20;
    this.maxVolume = 0.50;
    
    // Restore user preferences from localStorage
    const savedEnabled = localStorage.getItem('tla_audio_enabled');
    this.isEnabled = savedEnabled === 'true';

    const savedVol = parseFloat(localStorage.getItem('tla_audio_volume'));
    this.volume = !isNaN(savedVol) ? Math.min(Math.max(savedVol, 0), this.maxVolume) : this.defaultVolume;

    this.isPlaying = false;
    this.isPendingInteraction = false;
    this.subscribers = new Set();
    this.hasUserInteracted = false;
    this.activeMountIds = ['nav-audio-mount', 'dashboard-audio-mount'];

    // Track user interaction globally
    const recordInteraction = () => {
      this.hasUserInteracted = true;
      if (this.isEnabled && !this.isPlaying && this.isPendingInteraction) {
        this.play();
      }
    };
    ['click', 'keydown', 'touchstart'].forEach(evt => {
      window.addEventListener(evt, recordInteraction, { passive: true });
    });
  }

  init() {
    this.audioEl = document.getElementById('tla-background-audio');
    if (!this.audioEl) {
      // Create element if not already in DOM
      this.audioEl = document.createElement('audio');
      this.audioEl.id = 'tla-background-audio';
      this.audioEl.preload = 'auto';
      this.audioEl.loop = true;
      this.audioEl.innerHTML = `
        <source src="/public/background.mp3" type="audio/mpeg">
        <source src="/background.mp3" type="audio/mpeg">
      `;
      document.body.appendChild(this.audioEl);
    }

    this.audioEl.loop = true;
    this.audioEl.volume = this.volume;

    // Attach native media listeners
    this.audioEl.addEventListener('play', () => {
      this.isPlaying = true;
      this.isPendingInteraction = false;
      this.notify();
    });

    this.audioEl.addEventListener('pause', () => {
      this.isPlaying = false;
      this.notify();
    });

    this.audioEl.addEventListener('ended', () => {
      this.isPlaying = false;
      this.notify();
    });

    this.audioEl.addEventListener('error', (err) => {
      console.warn('[TLA-026] Audio error:', err);
      this.isPlaying = false;
      this.notify();
    });

    // If user previously enabled audio, respect autoplay restrictions by waiting for first gesture
    if (this.isEnabled) {
      this.isPendingInteraction = true;
      // If user has already clicked in the current session, try play immediately
      if (this.hasUserInteracted) {
        this.play();
      }
    }

    this.renderAll();
  }

  notify() {
    this.renderAll();
    this.subscribers.forEach(cb => {
      try { cb(this); } catch (e) {}
    });
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  async play() {
    if (!this.audioEl) return;
    this.audioEl.volume = this.volume;
    try {
      await this.audioEl.play();
      this.isPlaying = true;
      this.isPendingInteraction = false;
      this.isEnabled = true;
      localStorage.setItem('tla_audio_enabled', 'true');
      this.notify();
    } catch (err) {
      // Browser autoplay restriction encountered
      console.warn('[TLA-026] Audio autoplay deferred:', err.message);
      if (err.name === 'NotAllowedError') {
        this.isPendingInteraction = true;
        this.isPlaying = false;
        this.notify();
      } else {
        Toast.warning('Background audio failed to start. Click to retry.');
        this.isPendingInteraction = false;
        this.isPlaying = false;
        this.notify();
      }
    }
  }

  pause() {
    if (!this.audioEl) return;
    this.audioEl.pause();
    this.isPlaying = false;
    this.isPendingInteraction = false;
    this.notify();
  }

  toggle() {
    if (this.isPlaying) {
      this.isEnabled = false;
      localStorage.setItem('tla_audio_enabled', 'false');
      this.pause();
    } else {
      this.isEnabled = true;
      localStorage.setItem('tla_audio_enabled', 'true');
      this.play();
    }
  }

  setVolume(newVol) {
    // Clamp to 0.0 - 0.50 (0% - 50%)
    const clamped = Math.min(Math.max(parseFloat(newVol) || 0, 0), this.maxVolume);
    this.volume = clamped;
    if (this.audioEl) {
      this.audioEl.volume = clamped;
    }
    localStorage.setItem('tla_audio_volume', clamped.toString());
    this.notify();
  }

  onRouteChange(route) {
    // Route guard: silence audio on admin dashboard unless explicitly needed
    if (route === '/admin' || route.startsWith('/admin')) {
      if (this.isPlaying) {
        this.pause();
        // Do not disable user preference, just mute during admin view
      }
    } else {
      // Returning to investigator pages: resume if user had audio enabled
      if (this.isEnabled && !this.isPlaying && this.hasUserInteracted) {
        this.play().catch(() => {});
      }
    }
    // Re-render mounts
    setTimeout(() => this.renderAll(), 50);
  }

  renderAll() {
    this.activeMountIds.forEach(id => {
      this.renderMount(id);
    });
  }

  renderMount(mountId) {
    const mountEl = document.getElementById(mountId);
    if (!mountEl) return;

    const isActive = this.isPlaying;
    const isPending = this.isPendingInteraction && !this.isPlaying;
    const volPercent = Math.round(this.volume * 100);

    const toggleText = isActive ? '♫ AUDIO ON' : isPending ? '♫ AUDIO (READY)' : '♫ AUDIO OFF';
    const speakerIcon = isActive ? '🔊' : '🔇';
    const pillClass = isActive ? 'audio-control-pill active' : isPending ? 'audio-control-pill pending' : 'audio-control-pill';
    const titleText = isActive 
      ? 'Background music active (Volume: ' + volPercent + '%). Click to mute.' 
      : isPending 
      ? 'Audio enabled. Click anywhere to start playback.' 
      : 'Click to start ambient forensic investigator soundtrack.';

    mountEl.innerHTML = `
      <div class="${pillClass}" title="${titleText}">
        <button class="audio-toggle-btn" id="${mountId}-toggle-btn" aria-label="Toggle background music">
          <span class="audio-speaker-icon">${speakerIcon}</span>
          <span class="audio-toggle-label">${toggleText}</span>
        </button>
        <div class="audio-volume-container">
          <input 
            type="range" 
            class="audio-volume-slider" 
            id="${mountId}-vol-slider"
            min="0" 
            max="50" 
            value="${volPercent}" 
            title="Soundtrack Volume (${volPercent}% - capped at 50%)"
            aria-label="Soundtrack Volume Slider"
          />
          <span class="audio-volume-label">${volPercent}%</span>
        </div>
      </div>
    `;

    // Bind event handlers
    const toggleBtn = mountEl.querySelector(`#${mountId}-toggle-btn`);
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      });
    }

    const slider = mountEl.querySelector(`#${mountId}-vol-slider`);
    if (slider) {
      slider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.setVolume(val / 100);
      });
    }
  }
}

export const AudioController = new AudioControllerSingleton();
