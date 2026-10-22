// Main Application Controller
document.addEventListener('DOMContentLoaded', () => {
  const store = window.deviceStore;
  const esp = window.esp32Bridge;
  const sound = window.soundFX;
  const voice = window.voiceAssistant;

  // Initialize Interactive Floor Plan
  const floorPlan = new window.FloorPlanRenderer('floorplan-container');

  // DOM Elements
  const tabButtons = document.querySelectorAll('.tab-btn');
  const dockButtons = document.querySelectorAll('.dock-item');
  const tabContents = document.querySelectorAll('.tab-content');
  const roomsContainer = document.getElementById('rooms-masonry-container');
  const allDevicesContainer = document.getElementById('all-devices-list');
  const toastContainer = document.getElementById('toast-container');

  // Stats elements
  const statWatts = document.getElementById('stat-watts');
  const statLights = document.getElementById('stat-lights');
  const statFans = document.getElementById('stat-fans');
  const statKwh = document.getElementById('stat-kwh');

  // Header pills and buttons
  const espStatusPill = document.getElementById('esp-status-pill');
  const espStatusText = document.getElementById('esp-status-text');
  const btnSound = document.getElementById('btn-sound-toggle');
  const btnVoice = document.getElementById('btn-voice-toggle');
  const btnInstall = document.getElementById('btn-install-app');
  const btnSettings = document.getElementById('btn-settings-modal');

  // Settings Modal elements
  const modalSettings = document.getElementById('modal-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const formSettings = document.getElementById('esp-config-form');
  const selectMode = document.getElementById('esp-mode-select');
  const inputIp = document.getElementById('esp-ip-input');
  const inputWsPort = document.getElementById('esp-ws-port');
  const inputHttpPort = document.getElementById('esp-http-port');
  const consoleOutput = document.getElementById('console-output');
  const codeViewer = document.getElementById('esp-code-box');
  const btnCopyCode = document.getElementById('btn-copy-code');
  const btnDownloadIno = document.getElementById('btn-download-ino');
  const wifiSsidInput = document.getElementById('wifi-ssid-input');
  const wifiPassInput = document.getElementById('wifi-pass-input');

  let currentActiveTab = 'tab-floorplan';
  let deviceFilter = 'all'; // 'all' | 'light' | 'fan'
  let deferredInstallPrompt = null;

  // --------------------------------------------------------------------------
  // TAB NAVIGATION
  // --------------------------------------------------------------------------
  function switchTab(tabId) {
    currentActiveTab = tabId;
    tabButtons.forEach(btn => {
      btn.classList.toggle('is-active', btn.getAttribute('data-tab') === tabId);
    });
    dockButtons.forEach(btn => {
      btn.classList.toggle('is-active', btn.getAttribute('data-tab') === tabId);
    });
    tabContents.forEach(content => {
      content.classList.toggle('is-active', content.id === tabId);
    });
    sound.playBeep(450, 0.04);
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
  });

  dockButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
  });

  // --------------------------------------------------------------------------
  // TOAST NOTIFICATIONS
  // --------------------------------------------------------------------------
  window.showToast = function(msg, type = 'success') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      <span>${msg}</span>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  };

  // --------------------------------------------------------------------------
  // RENDER ROOMS AND DEVICE CONTROLS (COLLAPSIBLE ACCORDION)
  // --------------------------------------------------------------------------
  const openRooms = new Set(['living_room']); // Ruang Tamu open by default

  function renderRoomCards() {
    if (!roomsContainer) return;
    const allDevices = store.getAll();

    // Group by rooms
    const roomsMap = {};
    Object.keys(ROOMS_CONFIG).forEach(roomId => {
      roomsMap[roomId] = {
        config: ROOMS_CONFIG[roomId],
        devices: allDevices.filter(d => d.room === roomId)
      };
    });

    let html = '';
    Object.values(roomsMap).forEach(room => {
      if (room.devices.length === 0) return;
      const activeCount = room.devices.filter(d => d.state).length;
      const isOpen = openRooms.has(room.config.id);

      html += `
        <div class="room-box ${isOpen ? 'is-open' : ''}" data-room-id="${room.config.id}">
          <div class="room-box-header" data-room-toggle="${room.config.id}">
            <div class="room-box-title">
              <div class="room-box-icon">
                ${getRoomSvgIcon(room.config.icon)}
              </div>
              <div>
                <h3>${room.config.name}</h3>
                <span>${room.config.area}</span>
              </div>
            </div>
            <div class="room-box-header-right">
              <span class="room-box-badge ${activeCount > 0 ? 'has-active' : ''}">${activeCount}/${room.devices.length} Aktif</span>
              <span class="room-chevron">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </span>
            </div>
          </div>

          <div class="room-box-devices">
            ${room.devices.map(dev => renderDeviceItemHtml(dev)).join('')}
          </div>
        </div>
      `;
    });

    roomsContainer.innerHTML = html;
    bindDeviceEvents(roomsContainer);
    bindRoomAccordion(roomsContainer);
  }

  function bindRoomAccordion(container) {
    container.querySelectorAll('.room-box-header').forEach(header => {
      header.addEventListener('click', () => {
        const roomId = header.getAttribute('data-room-toggle');
        const box = header.closest('.room-box');
        if (!box) return;

        if (openRooms.has(roomId)) {
          openRooms.delete(roomId);
          box.classList.remove('is-open');
          sound.playBeep(420, 0.03);
        } else {
          openRooms.add(roomId);
          box.classList.add('is-open');
          sound.playBeep(640, 0.03);
        }
      });
    });
  }

  function renderAllDevicesMatrix() {
    if (!allDevicesContainer) return;
    let devices = store.getAll();
    if (deviceFilter === 'light') devices = store.getLights();
    if (deviceFilter === 'fan') devices = store.getFans();

    allDevicesContainer.innerHTML = `
      <div class="rooms-masonry">
        ${devices.map(dev => `
          <div class="device-item ${dev.state ? 'is-on' : ''} type-${dev.type}" data-device-id="${dev.id}">
            <div class="device-main-row">
              <div class="device-left">
                <div class="device-icon-box">
                  ${dev.type === 'fan' ? getFanSvg() : getLightSvg()}
                </div>
                <div class="device-meta">
                  <h4>${dev.name}</h4>
                  <p><span>${dev.roomName}</span> <span class="gpio-tag">GPIO ${dev.gpio}</span></p>
                </div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" class="device-toggle-input" data-device-id="${dev.id}" ${dev.state ? 'checked' : ''}>
                <span class="slider-switch"></span>
              </label>
            </div>
            ${dev.type === 'fan' ? renderFanStepperHtml(dev) : renderDimmerHtml(dev)}
          </div>
        `).join('')}
      </div>
    `;

    bindDeviceEvents(allDevicesContainer);
  }

  function renderDeviceItemHtml(dev) {
    return `
      <div class="device-item ${dev.state ? 'is-on' : ''} type-${dev.type}" data-device-id="${dev.id}">
        <div class="device-main-row">
          <div class="device-left">
            <div class="device-icon-box">
              ${dev.type === 'fan' ? getFanSvg() : getLightSvg()}
            </div>
            <div class="device-meta">
              <h4>${dev.name}</h4>
              <p><span>${dev.type === 'fan' ? 'Kipas Angin' : 'Lampu Penerangan'}</span> <span class="gpio-tag">GPIO ${dev.gpio}</span></p>
            </div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" class="device-toggle-input" data-device-id="${dev.id}" ${dev.state ? 'checked' : ''}>
            <span class="slider-switch"></span>
          </label>
        </div>
        ${dev.type === 'fan' ? renderFanStepperHtml(dev) : renderDimmerHtml(dev)}
      </div>
    `;
  }

  function renderFanStepperHtml(dev) {
    const curSpeed = dev.state ? (dev.speed || 1) : 0;
    return `
      <div class="fan-stepper-row">
        <span class="fan-stepper-label">Kecepatan Kipas</span>
        <div class="speed-buttons" data-device-id="${dev.id}">
          <button class="btn-speed ${curSpeed === 0 ? 'is-active' : ''}" data-speed="0">OFF</button>
          <button class="btn-speed ${curSpeed === 1 ? 'is-active' : ''}" data-speed="1">1</button>
          <button class="btn-speed ${curSpeed === 2 ? 'is-active' : ''}" data-speed="2">2</button>
          <button class="btn-speed ${curSpeed === 3 ? 'is-active' : ''}" data-speed="3">3</button>
        </div>
      </div>
    `;
  }

  function renderDimmerHtml(dev) {
    return `
      <div class="dimmer-row">
        <span class="fan-stepper-label">Kecerahan</span>
        <input type="range" min="10" max="100" value="${dev.brightness || 100}" 
               class="dimmer-slider" data-device-id="${dev.id}">
        <span class="dimmer-val">${dev.brightness || 100}%</span>
      </div>
    `;
  }

  function bindDeviceEvents(container) {
    // Checkbox toggles
    container.querySelectorAll('.device-toggle-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const devId = e.target.getAttribute('data-device-id');
        const dev = store.toggle(devId);
        sound.playToggle(dev.state);
        esp.sendDeviceCommand(dev);
        updateStats();
      });
    });

    // Fan speed buttons
    container.querySelectorAll('.btn-speed').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const speed = parseInt(btn.getAttribute('data-speed'), 10);
        const parent = btn.closest('.speed-buttons');
        const devId = parent.getAttribute('data-device-id');
        const dev = store.setSpeed(devId, speed);
        sound.playFanSpeed(speed);
        esp.sendDeviceCommand(dev);
        updateStats();
      });
    });

    // Dimmer sliders
    container.querySelectorAll('.dimmer-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const devId = slider.getAttribute('data-device-id');
        const val = parseInt(e.target.value, 10);
        const valLabel = slider.parentElement.querySelector('.dimmer-val');
        if (valLabel) valLabel.textContent = `${val}%`;
        store.setBrightness(devId, val);
      });
      slider.addEventListener('change', (e) => {
        const devId = slider.getAttribute('data-device-id');
        const dev = store.get(devId);
        esp.sendDeviceCommand(dev);
        updateStats();
      });
    });
  }

  // --------------------------------------------------------------------------
  // SVG ICONS
  // --------------------------------------------------------------------------
  function getLightSvg() {
    return `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v2"></path><path d="M12 20v2"></path><path d="M4.93 4.93l1.41 1.41"></path>
        <path d="M17.66 17.66l1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path>
        <path d="M6.34 17.66l-1.41 1.41"></path><path d="M19.07 4.93l-1.41 1.41"></path>
        <circle cx="12" cy="12" r="4"></circle>
      </svg>
    `;
  }

  function getFanSvg() {
    return `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 12c-3-6-6-6-6 0s3 6 6 0z"></path>
        <path d="M12 12c6-3 6-6 0-6s-6 3 0 6z"></path>
        <path d="M12 12c3 6 6 6 6 0s-3-6-6 0z"></path>
        <path d="M12 12c-6 3-6 6 0 6s6-3 0-6z"></path>
        <circle cx="12" cy="12" r="2"></circle>
      </svg>
    `;
  }

  function getRoomSvgIcon(type) {
    if (type === 'couch') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="11" width="20" height="8" rx="2"></rect><path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"></path></svg>`;
    }
    if (type === 'tv') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>`;
    }
    if (type === 'bed') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"></path></svg>`;
    }
    if (type === 'bath') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6h6a2 2 0 0 1 2 2v1H7V8a2 2 0 0 1 2-2zM4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3z"></path></svg>`;
    }
    if (type === 'utensils') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2v20M21 15V2v0a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3v3M6 2v20M3 2v6a3 3 0 0 0 6 0V2"></path></svg>`;
    }
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>`;
  }

  // --------------------------------------------------------------------------
  // STATS UPDATE
  // --------------------------------------------------------------------------
  function updateStats() {
    const stats = store.getStats();
    if (statWatts) statWatts.textContent = `${stats.currentWatts} W`;
    if (statLights) statLights.textContent = `${stats.activeLights} / ${stats.totalLights}`;
    if (statFans) statFans.textContent = `${stats.activeFans} / ${stats.totalFans}`;
    if (statKwh) statKwh.textContent = `${stats.estimatedKWhPerDay} kWh`;
  }

  // --------------------------------------------------------------------------
  // SCENE PRESETS
  // --------------------------------------------------------------------------
  document.querySelectorAll('.scene-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const scene = btn.getAttribute('data-scene');
      store.applyScene(scene);
      sound.playSuccess();
      updateStats();
      renderRoomCards();
      renderAllDevicesMatrix();

      const sceneNames = {
        all_on: 'Semua Perangkat Menyala',
        all_off: 'Semua Perangkat Dimatikan',
        night_mode: 'Mode Malam Diaktifkan',
        chill_mode: 'Mode Santai Diaktifkan',
        eco_mode: 'Mode Hemat Energi Diaktifkan'
      };
      window.showToast(sceneNames[scene] || 'Skenario diterapkan');
    });
  });

  // --------------------------------------------------------------------------
  // FILTER MATRIX BUTTONS
  // --------------------------------------------------------------------------
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('is-active'));
      pill.classList.add('is-active');
      deviceFilter = pill.getAttribute('data-filter');
      renderAllDevicesMatrix();
    });
  });

  // --------------------------------------------------------------------------
  // VOICE CONTROL INTEGRATION
  // --------------------------------------------------------------------------
  if (btnVoice) {
    if (!voice.supported) {
      btnVoice.style.display = 'none';
    } else {
      btnVoice.addEventListener('click', () => {
        voice.toggle();
      });

      voice.onStatusChange = (isListening) => {
        btnVoice.classList.toggle('is-listening', isListening);
        if (isListening) {
          window.showToast('Mendengarkan suara Anda... (Katakan: "Nyalakan lampu tamu")', 'warning');
        }
      };

      voice.onResult = (transcript) => {
        window.showToast(`Suara: "${transcript}"`, 'success');
      };
    }
  }

  // --------------------------------------------------------------------------
  // SOUND TOGGLE
  // --------------------------------------------------------------------------
  if (btnSound) {
    btnSound.classList.toggle('is-active', sound.enabled);
    btnSound.addEventListener('click', () => {
      const enabled = sound.toggleSound();
      btnSound.classList.toggle('is-active', enabled);
      window.showToast(enabled ? 'Efek Suara Aktif' : 'Efek Suara Hening');
    });
  }

  // --------------------------------------------------------------------------
  // SETTINGS MODAL & FIRMWARE CODE
  // --------------------------------------------------------------------------
  function openSettings() {
    if (!modalSettings) return;
    modalSettings.classList.add('is-open');

    // Populate current config
    if (selectMode) selectMode.value = esp.mode;
    if (inputIp) inputIp.value = esp.ip;
    if (inputWsPort) inputWsPort.value = esp.wsPort;
    if (inputHttpPort) inputHttpPort.value = esp.httpPort;

    updateCodeView();
  }

  function closeSettings() {
    if (!modalSettings) return;
    modalSettings.classList.remove('is-open');
  }

  function updateCodeView() {
    if (!codeViewer) return;
    const ssid = wifiSsidInput?.value || 'WIFI_RUMAH_ANDA';
    const pass = wifiPassInput?.value || 'PASSWORD_WIFI';
    codeViewer.textContent = esp.generateFirmwareCode(ssid, pass);
  }

  if (btnSettings) btnSettings.addEventListener('click', openSettings);
  if (espStatusPill) espStatusPill.addEventListener('click', openSettings);
  if (btnCloseSettings) btnCloseSettings.addEventListener('click', closeSettings);

  if (modalSettings) {
    modalSettings.addEventListener('click', (e) => {
      if (e.target === modalSettings) closeSettings();
    });
  }

  if (formSettings) {
    formSettings.addEventListener('submit', (e) => {
      e.preventDefault();
      esp.setConfig(inputIp.value, inputWsPort.value, inputHttpPort.value);
      esp.setMode(selectMode.value);
      sound.playSuccess();
      window.showToast('Pengaturan ESP32 disimpan!');
      closeSettings();
    });
  }

  if (wifiSsidInput) wifiSsidInput.addEventListener('input', updateCodeView);
  if (wifiPassInput) wifiPassInput.addEventListener('input', updateCodeView);

  if (btnCopyCode) {
    btnCopyCode.addEventListener('click', () => {
      if (!codeViewer) return;
      navigator.clipboard.writeText(codeViewer.textContent).then(() => {
        sound.playSuccess();
        window.showToast('Kode firmware ESP32 berhasil disalin!');
      });
    });
  }

  if (btnDownloadIno) {
    btnDownloadIno.addEventListener('click', () => {
      if (!codeViewer) return;
      const blob = new Blob([codeViewer.textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'smart_home_esp32.ino';
      a.click();
      URL.revokeObjectURL(url);
      window.showToast('File smart_home_esp32.ino berhasil diunduh!');
    });
  }

  // --------------------------------------------------------------------------
  // ESP32 BRIDGE SUBSCRIPTIONS & TERMINAL LOGS
  // --------------------------------------------------------------------------
  esp.subscribe({
    onStatus: (connected, mode) => {
      if (espStatusPill) {
        espStatusPill.className = `esp-status-pill ${mode === 'simulated' ? 'is-simulated' : (connected ? 'is-connected' : '')}`;
      }
      if (espStatusText) {
        if (mode === 'simulated') {
          espStatusText.textContent = 'Simulasi ESP32';
        } else if (connected) {
          espStatusText.textContent = `ESP32 (${esp.pingLatency}ms)`;
        } else {
          espStatusText.textContent = 'ESP32 Offline';
        }
      }
    },
    onTelemetry: (telemetry, latency) => {
      if (esp.connected && espStatusText && esp.mode !== 'simulated') {
        espStatusText.textContent = `ESP32 (${latency}ms)`;
      }
    },
    onLogs: (logs) => {
      if (!consoleOutput) return;
      consoleOutput.innerHTML = logs.map(l => `
        <div class="log-entry">
          <span class="log-time">${l.time}</span>
          <span class="log-tag ${l.tag}">${l.tag}</span>
          <span class="log-msg">${l.msg}</span>
        </div>
      `).join('');
    }
  });

  // --------------------------------------------------------------------------
  // PWA INSTALLATION INTERCEPTOR
  // --------------------------------------------------------------------------
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (btnInstall) {
      btnInstall.style.display = 'inline-flex';
    }
  });

  if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          window.showToast('Aplikasi berhasil dipasang di HP!');
          btnInstall.style.display = 'none';
        }
        deferredInstallPrompt = null;
      } else {
        // Fallback instructions
        window.showToast('Untuk install: Ketuk menu browser (titik 3) lalu pilih "Tambahkan ke Layar Utama" / "Install"', 'warning');
      }
    });
  }

  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('PWA Service Worker registered:', reg.scope);
      })
      .catch(err => {
        console.warn('PWA Service Worker registration error:', err);
      });
  }

  // Re-render when devices change
  store.subscribe(() => {
    renderRoomCards();
    renderAllDevicesMatrix();
    updateStats();
  });

  // Expand All / Collapse All buttons
  const btnExpandAll = document.getElementById('btn-expand-all');
  const btnCollapseAll = document.getElementById('btn-collapse-all');

  if (btnExpandAll) {
    btnExpandAll.addEventListener('click', () => {
      Object.keys(ROOMS_CONFIG).forEach(id => openRooms.add(id));
      renderRoomCards();
      sound.playBeep(640, 0.04);
      window.showToast('Semua ruangan dibuka');
    });
  }

  if (btnCollapseAll) {
    btnCollapseAll.addEventListener('click', () => {
      openRooms.clear();
      renderRoomCards();
      sound.playBeep(380, 0.04);
      window.showToast('Semua ruangan ditutup');
    });
  }

  // Room selected from 2D interactive floor plan
  window.onRoomSelected = function(roomId) {
    openRooms.add(roomId);
    switchTab('tab-rooms');
    renderRoomCards();
    setTimeout(() => {
      const targetBox = document.querySelector(`.room-box[data-room-id="${roomId}"]`);
      if (targetBox) {
        targetBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  // Initial Renders
  renderRoomCards();
  renderAllDevicesMatrix();
  updateStats();
  updateCodeView();
});
