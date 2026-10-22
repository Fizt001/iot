// Smart Home ESP32 Device Configuration & State Store
const ROOMS_CONFIG = {
  lobby: {
    id: 'lobby',
    name: 'Teras / Lobby Depan',
    icon: 'door-open',
    area: 'Luar Depan'
  },
  living_room: {
    id: 'living_room',
    name: 'Ruang Tamu',
    icon: 'couch',
    area: 'Area Utama'
  },
  family_room: {
    id: 'family_room',
    name: 'Ruang Keluarga',
    icon: 'tv',
    area: 'Area Utama'
  },
  bedroom_1: {
    id: 'bedroom_1',
    name: 'Kamar Tidur 1 (Utama)',
    icon: 'bed',
    area: 'Sayap Kiri',
    hasEnsuite: true
  },
  wc_1: {
    id: 'wc_1',
    name: 'WC 1 (Dalam Kamar 1)',
    icon: 'bath',
    area: 'Sayap Kiri'
  },
  bedroom_2: {
    id: 'bedroom_2',
    name: 'Kamar Tidur 2',
    icon: 'bed',
    area: 'Sayap Kanan'
  },
  bedroom_3: {
    id: 'bedroom_3',
    name: 'Kamar Tidur 3',
    icon: 'bed',
    area: 'Sayap Belakang'
  },
  kitchen: {
    id: 'kitchen',
    name: 'Dapur',
    icon: 'utensils',
    area: 'Sayap Belakang'
  },
  wc_2: {
    id: 'wc_2',
    name: 'WC 2 (Luar / Umum)',
    icon: 'bath',
    area: 'Sayap Belakang'
  }
};

const INITIAL_DEVICES = [
  // 1. Lobby / Teras Depan
  {
    id: 'lobby_light',
    name: 'Lampu Teras Depan',
    room: 'lobby',
    roomName: 'Teras / Lobby Depan',
    type: 'light',
    state: false,
    brightness: 100,
    gpio: 16,
    wattage: 15,
    planCoord: { x: 50, y: 92 }
  },
  // 2. Ruang Tamu
  {
    id: 'living_light',
    name: 'Lampu Ruang Tamu',
    room: 'living_room',
    roomName: 'Ruang Tamu',
    type: 'light',
    state: false,
    brightness: 100,
    gpio: 17,
    wattage: 18,
    planCoord: { x: 50, y: 72 }
  },
  {
    id: 'living_fan',
    name: 'Kipas Ruang Tamu',
    room: 'living_room',
    roomName: 'Ruang Tamu',
    type: 'fan',
    state: false,
    speed: 0,
    gpio: 27,
    wattage: 45,
    planCoord: { x: 42, y: 64 }
  },
  // 3. Ruang Keluarga
  {
    id: 'family_light',
    name: 'Lampu Ruang Keluarga',
    room: 'family_room',
    roomName: 'Ruang Keluarga',
    type: 'light',
    state: false,
    brightness: 100,
    gpio: 18,
    wattage: 24,
    planCoord: { x: 50, y: 44 }
  },
  {
    id: 'family_fan',
    name: 'Kipas Ruang Keluarga',
    room: 'family_room',
    roomName: 'Ruang Keluarga',
    type: 'fan',
    state: false,
    speed: 0,
    gpio: 32,
    wattage: 50,
    planCoord: { x: 58, y: 40 }
  },
  // 4. Kamar Tidur 1 (Utama)
  {
    id: 'bedroom1_light',
    name: 'Lampu Kamar Utama',
    room: 'bedroom_1',
    roomName: 'Kamar Tidur 1 (Utama)',
    type: 'light',
    state: false,
    brightness: 100,
    gpio: 19,
    wattage: 15,
    planCoord: { x: 18, y: 62 }
  },
  // 5. WC 1 (Di dalam Kamar Tidur 1)
  {
    id: 'wc1_light',
    name: 'Lampu WC Kamar Utama',
    room: 'wc_1',
    roomName: 'WC 1 (Dalam Kamar 1)',
    type: 'light',
    state: false,
    brightness: 100,
    gpio: 21,
    wattage: 10,
    planCoord: { x: 26, y: 78 }
  },
  // 6. Kamar Tidur 2
  {
    id: 'bedroom2_light',
    name: 'Lampu Kamar Tidur 2',
    room: 'bedroom_2',
    roomName: 'Kamar Tidur 2',
    type: 'light',
    state: false,
    brightness: 100,
    gpio: 22,
    wattage: 15,
    planCoord: { x: 82, y: 65 }
  },
  // 7. Kamar Tidur 3
  {
    id: 'bedroom3_light',
    name: 'Lampu Kamar Tidur 3',
    room: 'bedroom_3',
    roomName: 'Kamar Tidur 3',
    type: 'light',
    state: false,
    brightness: 100,
    gpio: 23,
    wattage: 15,
    planCoord: { x: 82, y: 22 }
  },
  // 8. Dapur
  {
    id: 'kitchen_light',
    name: 'Lampu Dapur',
    room: 'kitchen',
    roomName: 'Dapur',
    type: 'light',
    state: false,
    brightness: 100,
    gpio: 25,
    wattage: 20,
    planCoord: { x: 20, y: 22 }
  },
  {
    id: 'kitchen_fan',
    name: 'Kipas Dapur',
    room: 'kitchen',
    roomName: 'Dapur',
    type: 'fan',
    state: false,
    speed: 0,
    gpio: 33,
    wattage: 40,
    planCoord: { x: 28, y: 15 }
  },
  // 9. WC 2 (Luar / Kamar Mandi Umum)
  {
    id: 'wc2_light',
    name: 'Lampu WC Luar / Umum',
    room: 'wc_2',
    roomName: 'WC 2 (Luar / Umum)',
    type: 'light',
    state: false,
    brightness: 100,
    gpio: 26,
    wattage: 10,
    planCoord: { x: 50, y: 18 }
  }
];

class DeviceStore {
  constructor() {
    this.devices = this.loadDevices();
    this.listeners = [];
  }

  loadDevices() {
    try {
      const saved = localStorage.getItem('smarthome_devices_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with initial to ensure schema updates
        return INITIAL_DEVICES.map(initDev => {
          const found = parsed.find(p => p.id === initDev.id);
          return found ? { ...initDev, ...found } : initDev;
        });
      }
    } catch (e) {
      console.warn('Failed to load devices from localStorage', e);
    }
    return JSON.parse(JSON.stringify(INITIAL_DEVICES));
  }

  saveDevices() {
    try {
      localStorage.setItem('smarthome_devices_v3', JSON.stringify(this.devices));
    } catch (e) {
      console.warn('Failed to save devices', e);
    }
  }

  get(id) {
    return this.devices.find(d => d.id === id);
  }

  getAll() {
    return this.devices;
  }

  getLights() {
    return this.devices.filter(d => d.type === 'light');
  }

  getFans() {
    return this.devices.filter(d => d.type === 'fan');
  }

  getByRoom(roomId) {
    return this.devices.filter(d => d.room === roomId);
  }

  toggle(id) {
    const dev = this.get(id);
    if (!dev) return null;
    dev.state = !dev.state;
    if (dev.type === 'fan' && dev.state && dev.speed === 0) {
      dev.speed = 1;
    }
    this.saveDevices();
    this.notify(dev, 'toggle');
    return dev;
  }

  setSpeed(id, speed) {
    const dev = this.get(id);
    if (!dev || dev.type !== 'fan') return null;
    dev.speed = Math.max(0, Math.min(3, parseInt(speed, 10)));
    dev.state = dev.speed > 0;
    this.saveDevices();
    this.notify(dev, 'speed');
    return dev;
  }

  setBrightness(id, brightness) {
    const dev = this.get(id);
    if (!dev || dev.type !== 'light') return null;
    dev.brightness = Math.max(0, Math.min(100, parseInt(brightness, 10)));
    if (dev.brightness > 0 && !dev.state) {
      dev.state = true;
    } else if (dev.brightness === 0 && dev.state) {
      dev.state = false;
    }
    this.saveDevices();
    this.notify(dev, 'brightness');
    return dev;
  }

  setState(id, state, extra = {}) {
    const dev = this.get(id);
    if (!dev) return null;
    dev.state = Boolean(state);
    if (extra.speed !== undefined && dev.type === 'fan') dev.speed = extra.speed;
    if (extra.brightness !== undefined && dev.type === 'light') dev.brightness = extra.brightness;
    this.saveDevices();
    this.notify(dev, 'state');
    return dev;
  }

  // Scene triggers
  applyScene(sceneName) {
    const changes = [];
    switch (sceneName) {
      case 'all_on':
        this.devices.forEach(d => {
          d.state = true;
          if (d.type === 'fan' && d.speed === 0) d.speed = 2;
          changes.push(d);
        });
        break;
      case 'all_off':
        this.devices.forEach(d => {
          d.state = false;
          if (d.type === 'fan') d.speed = 0;
          changes.push(d);
        });
        break;
      case 'night_mode':
        // Turn off all except lobby & soft WC
        this.devices.forEach(d => {
          if (d.id === 'lobby_light') {
            d.state = true;
            d.brightness = 70;
          } else if (d.id === 'wc1_light' || d.id === 'wc2_light') {
            d.state = false;
          } else if (d.id === 'bedroom1_light') {
            d.state = true;
            d.brightness = 20;
          } else {
            d.state = false;
            if (d.type === 'fan') d.speed = 0;
          }
          changes.push(d);
        });
        break;
      case 'chill_mode':
        // Living & family room comfortable
        this.devices.forEach(d => {
          if (d.id === 'family_light' || d.id === 'living_light') {
            d.state = true;
            d.brightness = 50;
          } else if (d.id === 'family_fan') {
            d.state = true;
            d.speed = 1;
          } else {
            d.state = false;
          }
          changes.push(d);
        });
        break;
      case 'eco_mode':
        // Minimum power
        this.devices.forEach(d => {
          if (d.type === 'light') {
            d.brightness = 40;
          } else if (d.type === 'fan' && d.state) {
            d.speed = 1;
          }
          changes.push(d);
        });
        break;
    }
    this.saveDevices();
    this.notifyAll(sceneName);
    return changes;
  }

  getStats() {
    let activeLights = 0;
    let activeFans = 0;
    let currentWatts = 0;

    this.devices.forEach(d => {
      if (d.state) {
        if (d.type === 'light') {
          activeLights++;
          currentWatts += Math.round((d.wattage || 15) * ((d.brightness || 100) / 100));
        } else if (d.type === 'fan') {
          activeFans++;
          const speedMultiplier = (d.speed || 1) / 3;
          currentWatts += Math.round((d.wattage || 40) * (0.5 + 0.5 * speedMultiplier));
        }
      }
    });

    return {
      activeLights,
      totalLights: this.getLights().length,
      activeFans,
      totalFans: this.getFans().length,
      activeTotal: activeLights + activeFans,
      totalDevices: this.devices.length,
      currentWatts,
      estimatedKWhPerDay: ((currentWatts * 12) / 1000).toFixed(2)
    };
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify(device, action) {
    this.listeners.forEach(cb => cb(device, action));
  }

  notifyAll(reason) {
    this.listeners.forEach(cb => cb(null, reason));
  }
}

// Global instance
window.deviceStore = new DeviceStore();
