// Voice Control Recognition in Indonesian (Bahasa Indonesia)
class VoiceAssistant {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.supported = false;
    this.onStatusChange = null;
    this.onResult = null;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      this.supported = true;
      this.recognition = new SpeechRec();
      this.recognition.lang = 'id-ID';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.onStatusChange) this.onStatusChange(true);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onStatusChange) this.onStatusChange(false);
      };

      this.recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e.error);
        this.isListening = false;
        if (this.onStatusChange) this.onStatusChange(false);
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        if (this.onResult) this.onResult(transcript);
        this.processCommand(transcript);
      };
    }
  }

  toggle() {
    if (!this.supported) {
      alert('Browser Anda belum mendukung Web Speech Recognition. Gunakan Google Chrome pada Android / Desktop.');
      return false;
    }
    if (this.isListening) {
      this.recognition.stop();
      return false;
    } else {
      try {
        this.recognition.start();
        return true;
      } catch (e) {
        console.warn('Speech start error', e);
        return false;
      }
    }
  }

  processCommand(text) {
    const store = window.deviceStore;
    const sound = window.soundFX;
    let handled = false;
    let feedback = '';

    // Scenes
    if (text.includes('semua nyala') || text.includes('hidupkan semua') || text.includes('nyalakan semua')) {
      store.applyScene('all_on');
      feedback = 'Semua perangkat dinyalakan';
      handled = true;
    } else if (text.includes('semua mati') || text.includes('matikan semua') || text.includes('tidur')) {
      store.applyScene('all_off');
      feedback = 'Semua perangkat dimatikan';
      handled = true;
    } else if (text.includes('mode malam')) {
      store.applyScene('night_mode');
      feedback = 'Mode malam diaktifkan';
      handled = true;
    } else if (text.includes('mode santai') || text.includes('santai')) {
      store.applyScene('chill_mode');
      feedback = 'Mode santai diaktifkan';
      handled = true;
    } else if (text.includes('hemat energi') || text.includes('eco')) {
      store.applyScene('eco_mode');
      feedback = 'Mode hemat energi diaktifkan';
      handled = true;
    } else {
      // Individual device matching
      const turnOn = text.includes('nyalakan') || text.includes('hidupkan') || text.includes('buka') || text.includes('on');
      const turnOff = text.includes('matikan') || text.includes('padamkan') || text.includes('tutup') || text.includes('off');

      let targetDevId = null;

      // Identify device by room keywords
      if (text.includes('teras') || text.includes('lobby') || text.includes('depan')) {
        targetDevId = 'lobby_light';
      } else if (text.includes('tamu')) {
        targetDevId = text.includes('kipas') ? 'living_fan' : 'living_light';
      } else if (text.includes('keluarga')) {
        targetDevId = text.includes('kipas') ? 'family_fan' : 'family_light';
      } else if (text.includes('kamar 1') || text.includes('kamar utama')) {
        targetDevId = 'bedroom1_light';
      } else if (text.includes('wc 1') || text.includes('kamar mandi 1') || (text.includes('wc') && text.includes('dalam'))) {
        targetDevId = 'wc1_light';
      } else if (text.includes('kamar 2')) {
        targetDevId = 'bedroom2_light';
      } else if (text.includes('kamar 3')) {
        targetDevId = 'bedroom3_light';
      } else if (text.includes('dapur')) {
        targetDevId = text.includes('kipas') ? 'kitchen_fan' : 'kitchen_light';
      } else if (text.includes('wc 2') || text.includes('kamar mandi 2') || (text.includes('wc') && (text.includes('luar') || text.includes('umum')))) {
        targetDevId = 'wc2_light';
      }

      if (targetDevId) {
        const dev = store.get(targetDevId);
        if (dev) {
          if (turnOn) {
            // Check speed for fans
            if (dev.type === 'fan') {
              let spd = 2;
              if (text.includes('satu') || text.includes('1') || text.includes('rendah')) spd = 1;
              if (text.includes('tiga') || text.includes('3') || text.includes('cepat') || text.includes('maksimal')) spd = 3;
              store.setSpeed(dev.id, spd);
              feedback = `${dev.name} dinyalakan kecepatan ${spd}`;
            } else {
              store.setState(dev.id, true);
              feedback = `${dev.name} dinyalakan`;
            }
            sound.playToggle(true);
            handled = true;
          } else if (turnOff) {
            store.setState(dev.id, false);
            if (dev.type === 'fan') store.setSpeed(dev.id, 0);
            feedback = `${dev.name} dimatikan`;
            sound.playToggle(false);
            handled = true;
          }
        }
      }
    }

    if (!handled) {
      feedback = `Perintah "${text}" tidak dikenali`;
    }

    // Trigger visual toast
    if (window.showToast) {
      window.showToast(feedback, handled ? 'success' : 'warning');
    }
  }
}

window.voiceAssistant = new VoiceAssistant();
