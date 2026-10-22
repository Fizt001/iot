// Audio Feedback using Web Audio API (Synthesized, zero dependencies)
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    try {
      const saved = localStorage.getItem('smarthome_sound_enabled');
      if (saved !== null) this.enabled = saved === 'true';
    } catch (e) {}
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem('smarthome_sound_enabled', String(this.enabled));
    } catch (e) {}
    if (this.enabled) this.playBeep(880, 0.08, 'sine');
    return this.enabled;
  }

  playToggle(state) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    if (state) {
      // Pleasant upward chirp for ON
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    } else {
      // Pleasant downward soft click for OFF
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(330, now + 0.07);
    }

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (state ? 0.09 : 0.08));

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  playFanSpeed(speed) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const baseFreq = [300, 480, 640, 800][speed] || 400;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  playSuccess() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = now + idx * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.07, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.13);
    });
  }

  playBeep(freq = 600, duration = 0.05, type = 'sine') {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  }
}

window.soundFX = new SoundFX();
