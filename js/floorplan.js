// Interactive SVG Architectural Floor Plan Engine
class FloorPlanRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.svg = null;
    this.scale = 1;
    this.pan = { x: 0, y: 0 };
    this.isPanning = false;
    this.startPan = { x: 0, y: 0 };
    this.selectedRoom = null;
    this.store = window.deviceStore;

    this.roomsData = [
      {
        id: 'lobby',
        name: 'Teras / Lobby Depan',
        type: 'porch',
        x: 320, y: 680, w: 360, h: 90,
        door: { x: 500, y: 680, width: 60, swing: 'in-up' },
        devices: ['lobby_light']
      },
      {
        id: 'living_room',
        name: 'Ruang Tamu',
        type: 'living',
        x: 320, y: 460, w: 360, h: 220,
        door: { x: 500, y: 460, width: 80, swing: 'open' },
        devices: ['living_light', 'living_fan']
      },
      {
        id: 'bedroom_1',
        name: 'Kamar Tidur 1 (Utama)',
        type: 'bedroom',
        x: 40, y: 440, w: 280, h: 280,
        door: { x: 320, y: 530, width: 50, swing: 'in-left' },
        devices: ['bedroom1_light']
      },
      {
        id: 'wc_1',
        name: 'WC 1 (En-Suite)',
        type: 'bathroom',
        x: 180, y: 580, w: 140, h: 140,
        door: { x: 180, y: 630, width: 40, swing: 'in-down' },
        devices: ['wc1_light']
      },
      {
        id: 'bedroom_2',
        name: 'Kamar Tidur 2',
        type: 'bedroom',
        x: 680, y: 440, w: 280, h: 280,
        door: { x: 680, y: 530, width: 50, swing: 'in-right' },
        devices: ['bedroom2_light']
      },
      {
        id: 'family_room',
        name: 'Ruang Keluarga',
        type: 'family',
        x: 320, y: 220, w: 360, h: 240,
        door: null,
        devices: ['family_light', 'family_fan']
      },
      {
        id: 'kitchen',
        name: 'Dapur & Ruang Makan',
        type: 'kitchen',
        x: 40, y: 100, w: 280, h: 340,
        door: { x: 320, y: 280, width: 60, swing: 'open' },
        devices: ['kitchen_light', 'kitchen_fan']
      },
      {
        id: 'wc_2',
        name: 'WC 2 (Luar / Umum)',
        type: 'bathroom',
        x: 430, y: 100, w: 140, h: 120,
        door: { x: 500, y: 220, width: 45, swing: 'in-up' },
        devices: ['wc2_light']
      },
      {
        id: 'bedroom_3',
        name: 'Kamar Tidur 3',
        type: 'bedroom',
        x: 680, y: 100, w: 280, h: 340,
        door: { x: 680, y: 280, width: 50, swing: 'in-right' },
        devices: ['bedroom3_light']
      }
    ];

    this.init();
  }

  init() {
    if (!this.container) return;
    this.render();
    this.bindEvents();
    this.updateDeviceVisuals();

    // Subscribe to store updates
    this.store.subscribe((dev, action) => {
      this.updateDeviceVisuals(dev);
    });
  }

  render() {
    this.container.innerHTML = `
      <div class="floorplan-wrapper">
        <div class="floorplan-controls">
          <button id="fp-zoom-in" class="fp-btn" title="Perbesar (Zoom In)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
          </button>
          <button id="fp-zoom-out" class="fp-btn" title="Perkecil (Zoom Out)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
          </button>
          <button id="fp-reset" class="fp-btn" title="Reset Tampilan">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
          </button>
          <span class="fp-zoom-label" id="fp-zoom-level">100%</span>
        </div>

        <div class="floorplan-legend">
          <div class="legend-item"><span class="legend-dot light-on"></span> Lampu Menyala</div>
          <div class="legend-item"><span class="legend-dot light-off"></span> Lampu Padam</div>
          <div class="legend-item"><span class="legend-dot fan-on"></span> Kipas Berputar</div>
        </div>

        <div class="floorplan-viewport" id="fp-viewport">
          <svg id="fp-svg" viewBox="0 0 1000 820" preserveAspectRatio="xMidYMid meet" class="floorplan-svg">
            <defs>
              <!-- Lighting radial gradients -->
              <radialGradient id="grad-light-warm" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#ffb703" stop-opacity="0.85" />
                <stop offset="35%" stop-color="#fb8500" stop-opacity="0.45" />
                <stop offset="70%" stop-color="#ffb703" stop-opacity="0.15" />
                <stop offset="100%" stop-color="#ffb703" stop-opacity="0" />
              </radialGradient>

              <radialGradient id="grad-light-wc" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.75" />
                <stop offset="45%" stop-color="#0284c7" stop-opacity="0.3" />
                <stop offset="100%" stop-color="#0284c7" stop-opacity="0" />
              </radialGradient>

              <!-- Room patterns -->
              <pattern id="pat-tiles" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
              </pattern>
              
              <pattern id="pat-wood" width="40" height="10" patternUnits="userSpaceOnUse">
                <line x1="0" y1="10" x2="40" y2="10" stroke="rgba(255,255,255,0.025)" stroke-width="1"/>
                <line x1="20" y1="0" x2="20" y2="10" stroke="rgba(255,255,255,0.025)" stroke-width="1"/>
              </pattern>

              <pattern id="pat-grass" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="8" cy="8" r="1.5" fill="rgba(16, 185, 129, 0.15)"/>
              </pattern>

              <!-- Drop shadow filter -->
              <filter id="glow-shadow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="10" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <!-- Foundation & Yard Area -->
            <rect x="20" y="20" width="960" height="780" rx="16" class="foundation-base" />

            <!-- Backyard / Service Area -->
            <rect x="40" y="40" width="920" height="60" rx="8" class="area-backyard" />
            <text x="500" y="75" class="area-label">HALAMAN BELAKANG / AREA SERVIS</text>

            <!-- Front Porch / Yard -->
            <rect x="40" y="720" width="280" height="60" rx="8" class="area-frontyard" fill="url(#pat-grass)" />
            <rect x="680" y="720" width="280" height="60" rx="8" class="area-frontyard" fill="url(#pat-grass)" />
            <text x="180" y="755" class="area-label">TAMAN DEPAN KIRI</text>
            <text x="820" y="755" class="area-label">TAMAN DEPAN KANAN</text>

            <!-- ================= ROOMS BASE LAYER ================= -->
            <g id="rooms-group">
              ${this.renderRoomsSvg()}
            </g>

            <!-- ================= FURNITURE LAYER ================= -->
            <g id="furniture-group">
              ${this.renderFurnitureSvg()}
            </g>

            <!-- ================= DOORS & WINDOWS LAYER ================= -->
            <g id="doors-windows-group">
              ${this.renderDoorsAndWindowsSvg()}
            </g>

            <!-- ================= LIGHTING GLOW LAYER ================= -->
            <g id="lighting-glows-group">
              <!-- Radial lighting orbs created dynamically -->
              <ellipse id="glow-lobby_light" cx="500" cy="725" rx="150" ry="60" fill="url(#grad-light-warm)" class="light-glow-fx" />
              <circle id="glow-living_light" cx="500" cy="560" r="140" fill="url(#grad-light-warm)" class="light-glow-fx" />
              <circle id="glow-family_light" cx="500" cy="340" r="150" fill="url(#grad-light-warm)" class="light-glow-fx" />
              <circle id="glow-bedroom1_light" cx="170" cy="520" r="120" fill="url(#grad-light-warm)" class="light-glow-fx" />
              <circle id="glow-wc1_light" cx="250" cy="650" r="70" fill="url(#grad-light-wc)" class="light-glow-fx" />
              <circle id="glow-bedroom2_light" cx="820" cy="580" r="130" fill="url(#grad-light-warm)" class="light-glow-fx" />
              <circle id="glow-bedroom3_light" cx="820" cy="270" r="130" fill="url(#grad-light-warm)" class="light-glow-fx" />
              <circle id="glow-kitchen_light" cx="180" cy="270" r="140" fill="url(#grad-light-warm)" class="light-glow-fx" />
              <circle id="glow-wc2_light" cx="500" cy="160" r="70" fill="url(#grad-light-wc)" class="light-glow-fx" />
            </g>

            <!-- ================= WALLS OUTLINE ================= -->
            <g id="walls-group">
              ${this.renderWallsSvg()}
            </g>

            <!-- ================= ROOM LABELS LAYER ================= -->
            <g id="labels-group">
              ${this.renderRoomLabelsSvg()}
            </g>

            <!-- ================= INTERACTIVE DEVICE NODES ================= -->
            <g id="device-nodes-group">
              ${this.renderDeviceNodesSvg()}
            </g>
          </svg>
        </div>
      </div>
    `;

    this.svg = document.getElementById('fp-svg');
  }

  renderRoomsSvg() {
    return this.roomsData.map(r => {
      let pattern = 'none';
      if (r.type === 'bedroom' || r.type === 'living' || r.type === 'family') pattern = 'url(#pat-wood)';
      if (r.type === 'kitchen' || r.type === 'bathroom') pattern = 'url(#pat-tiles)';

      return `
        <g class="room-element" data-room-id="${r.id}">
          <rect id="room-rect-${r.id}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" 
                rx="4" class="room-rect room-type-${r.type}" />
          <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" 
                fill="${pattern}" pointer-events="none" />
        </g>
      `;
    }).join('');
  }

  renderWallsSvg() {
    // Outer perimeter + internal divider walls
    return `
      <!-- External Main Walls -->
      <path d="
        M 40 100 H 960 V 720 H 680 V 770 H 320 V 720 H 40 Z
      " class="wall-external" />

      <!-- Internal Wall Dividers -->
      <!-- Vertical Divider 1 (Left wing separating Kitchen/Bed1 from Family/Living) -->
      <line x1="320" y1="100" x2="320" y2="720" class="wall-internal" />
      
      <!-- Vertical Divider 2 (Right wing separating Family/Living from Bed3/Bed2) -->
      <line x1="680" y1="100" x2="680" y2="720" class="wall-internal" />

      <!-- Horizontal Divider 1 (Kitchen to Bed 1) -->
      <line x1="40" y1="440" x2="320" y2="440" class="wall-internal" />

      <!-- Horizontal Divider 2 (Bed 3 to Bed 2) -->
      <line x1="680" y1="440" x2="960" y2="440" class="wall-internal" />

      <!-- Horizontal Center Divider (Family Room to Living Room) with wide arch opening -->
      <line x1="320" y1="460" x2="420" y2="460" class="wall-internal" />
      <line x1="580" y1="460" x2="680" y2="460" class="wall-internal" />
      <line x1="420" y1="460" x2="580" y2="460" class="wall-archway" stroke-dasharray="4,4" />

      <!-- WC 1 (Ensuite in Bed 1) Walls -->
      <path d="M 180 720 V 580 H 320" class="wall-internal wall-wc1" />

      <!-- WC 2 (Outside) Walls -->
      <path d="M 430 100 V 220 H 570 V 100" class="wall-internal wall-wc2" />
    `;
  }

  renderFurnitureSvg() {
    return `
      <!-- ================= BEDROOM 1 (UTAMA) FURNITURE ================= -->
      <!-- King Bed -->
      <g transform="translate(60, 480)" class="furniture">
        <rect width="100" height="120" rx="6" fill="#1e293b" stroke="#334155" stroke-width="2"/>
        <!-- Pillows -->
        <rect x="8" y="10" width="38" height="24" rx="4" fill="#334155" stroke="#475569" stroke-width="1"/>
        <rect x="54" y="10" width="38" height="24" rx="4" fill="#334155" stroke="#475569" stroke-width="1"/>
        <!-- Blanket fold -->
        <path d="M 8 50 H 92 V 112 H 8 Z" fill="#0f172a" opacity="0.6"/>
        <line x1="8" y1="50" x2="92" y2="50" stroke="#06b6d4" stroke-width="2" opacity="0.6"/>
      </g>
      <!-- Nightstands -->
      <rect x="45" y="485" width="12" height="20" rx="2" class="furniture-detail" />
      <rect x="163" y="485" width="12" height="20" rx="2" class="furniture-detail" />
      <!-- Wardrobe -->
      <rect x="60" y="660" width="100" height="25" rx="3" class="furniture-wood" />
      <text x="110" y="677" class="furniture-text">LEMARI UTAMA</text>

      <!-- ================= WC 1 (EN-SUITE IN BED 1) ================= -->
      <g transform="translate(200, 600)" class="furniture">
        <!-- Toilet -->
        <rect x="80" y="60" width="24" height="14" rx="3" fill="#38bdf8" opacity="0.3"/>
        <ellipse cx="92" cy="85" rx="10" ry="12" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
        <!-- Sink / Vanity -->
        <rect x="15" y="15" width="30" height="20" rx="4" fill="#1e293b" stroke="#38bdf8" stroke-width="1"/>
        <circle cx="30" cy="25" r="5" fill="#38bdf8" opacity="0.4"/>
        <!-- Shower drain -->
        <rect x="10" y="70" width="40" height="40" rx="3" stroke="#38bdf8" stroke-dasharray="3,3" fill="none" opacity="0.4"/>
        <circle cx="30" cy="90" r="3" fill="#38bdf8"/>
      </g>

      <!-- ================= BEDROOM 2 FURNITURE ================= -->
      <!-- Queen Bed -->
      <g transform="translate(770, 480)" class="furniture">
        <rect width="90" height="110" rx="6" fill="#1e293b" stroke="#334155" stroke-width="2"/>
        <rect x="8" y="10" width="34" height="22" rx="4" fill="#334155" stroke="#475569" stroke-width="1"/>
        <rect x="48" y="10" width="34" height="22" rx="4" fill="#334155" stroke="#475569" stroke-width="1"/>
        <path d="M 8 46 H 82 V 102 H 8 Z" fill="#0f172a" opacity="0.6"/>
      </g>
      <rect x="880" y="480" width="55" height="25" rx="3" class="furniture-wood" />
      <text x="907" y="497" class="furniture-text">MEJA KERJA</text>
      <rect x="770" y="660" width="90" height="24" rx="3" class="furniture-wood" />
      <text x="815" y="677" class="furniture-text">LEMARI</text>

      <!-- ================= BEDROOM 3 FURNITURE ================= -->
      <g transform="translate(770, 140)" class="furniture">
        <rect width="90" height="110" rx="6" fill="#1e293b" stroke="#334155" stroke-width="2"/>
        <rect x="8" y="10" width="34" height="22" rx="4" fill="#334155" stroke="#475569" stroke-width="1"/>
        <rect x="48" y="10" width="34" height="22" rx="4" fill="#334155" stroke="#475569" stroke-width="1"/>
        <path d="M 8 46 H 82 V 102 H 8 Z" fill="#0f172a" opacity="0.6"/>
      </g>
      <rect x="880" y="320" width="60" height="25" rx="3" class="furniture-wood" />
      <text x="910" y="337" class="furniture-text">LEMARI</text>

      <!-- ================= RUANG TAMU FURNITURE ================= -->
      <!-- Sofa set & coffee table -->
      <g transform="translate(420, 500)" class="furniture">
        <!-- Main 3-seater sofa -->
        <rect x="15" y="10" width="130" height="34" rx="6" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
        <!-- Armrests -->
        <rect x="15" y="10" width="14" height="34" rx="4" fill="#334155"/>
        <rect x="131" y="10" width="14" height="34" rx="4" fill="#334155"/>
        <!-- Coffee table -->
        <rect x="40" y="60" width="80" height="30" rx="5" fill="#0f172a" stroke="#06b6d4" stroke-width="1" stroke-opacity="0.4"/>
        <text x="80" y="79" class="furniture-text">MEJA TAMU</text>
        <!-- Single armchair left -->
        <rect x="-15" y="55" width="32" height="34" rx="5" fill="#1e293b" stroke="#475569" stroke-width="1"/>
        <!-- Single armchair right -->
        <rect x="145" y="55" width="32" height="34" rx="5" fill="#1e293b" stroke="#475569" stroke-width="1"/>
        <!-- Carpet -->
        <rect x="25" y="48" width="110" height="52" rx="4" fill="none" stroke="#64748b" stroke-width="1" stroke-dasharray="2,2" opacity="0.3"/>
      </g>
      <!-- TV Credenza -->
      <rect x="450" y="650" width="100" height="18" rx="3" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      <text x="500" y="663" class="furniture-text">KREDENZA TV</text>

      <!-- ================= RUANG KELUARGA FURNITURE ================= -->
      <!-- Large L-Shaped Sectional Sofa -->
      <g transform="translate(370, 260)" class="furniture">
        <!-- Sectional sofa back -->
        <path d="M 20 20 H 180 V 60 H 60 V 120 H 20 Z" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
        <path d="M 20 20 H 180 V 35 H 35 V 120 H 20 Z" fill="#334155"/>
        <!-- Living carpet -->
        <rect x="50" y="50" width="110" height="60" rx="6" fill="#0f172a" stroke="#f59e0b" stroke-width="1" stroke-opacity="0.2"/>
        <!-- Low Coffee Table -->
        <rect x="70" y="65" width="70" height="32" rx="4" fill="#1e293b" stroke="#f59e0b" stroke-width="1" stroke-opacity="0.5"/>
        <text x="105" y="85" class="furniture-text">MEJA SANTAI</text>
        <!-- Big TV Panel on upper wall -->
        <rect x="210" y="30" width="14" height="80" rx="3" fill="#020617" stroke="#38bdf8" stroke-width="1.5"/>
        <text x="217" y="74" class="furniture-text" transform="rotate(-90 217 74)">SMART TV 75"</text>
      </g>

      <!-- ================= DAPUR & RUANG MAKAN FURNITURE ================= -->
      <!-- L-Shaped Kitchen Counter -->
      <g transform="translate(50, 110)" class="furniture">
        <path d="M 0 0 H 130 V 45 H 45 V 180 H 0 Z" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
        <!-- 2-Burner Gas Stove / Induction Hob -->
        <rect x="65" y="8" width="45" height="28" rx="3" fill="#0f172a" stroke="#f43f5e" stroke-width="1"/>
        <circle cx="77" cy="22" r="8" fill="none" stroke="#f43f5e" stroke-width="1.5"/>
        <circle cx="97" cy="22" r="8" fill="none" stroke="#f43f5e" stroke-width="1.5"/>
        <!-- Sink -->
        <rect x="8" y="70" width="28" height="40" rx="3" fill="#0f172a" stroke="#38bdf8" stroke-width="1"/>
        <circle cx="22" cy="90" r="4" fill="#38bdf8" opacity="0.6"/>
        <!-- Refrigerator -->
        <rect x="8" y="130" width="30" height="35" rx="3" fill="#334155" stroke="#64748b" stroke-width="1"/>
        <text x="23" y="152" class="furniture-text">KULKAS</text>
      </g>
      <!-- Dining Table with 4 Chairs -->
      <g transform="translate(130, 280)" class="furniture">
        <rect x="20" y="20" width="80" height="50" rx="6" fill="#1e293b" stroke="#f59e0b" stroke-width="1"/>
        <text x="60" y="48" class="furniture-text">MEJA MAKAN</text>
        <!-- 4 Chairs -->
        <rect x="35" y="5" width="20" height="10" rx="2" class="furniture-detail" />
        <rect x="65" y="5" width="20" height="10" rx="2" class="furniture-detail" />
        <rect x="35" y="75" width="20" height="10" rx="2" class="furniture-detail" />
        <rect x="65" y="75" width="20" height="10" rx="2" class="furniture-detail" />
      </g>

      <!-- ================= WC 2 (LUAR / UMUM) FURNITURE ================= -->
      <g transform="translate(440, 110)" class="furniture">
        <!-- Toilet bowl -->
        <rect x="75" y="10" width="26" height="15" rx="3" fill="#38bdf8" opacity="0.3"/>
        <ellipse cx="88" cy="38" rx="10" ry="13" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
        <!-- Vanity Sink -->
        <rect x="15" y="12" width="30" height="22" rx="4" fill="#1e293b" stroke="#38bdf8" stroke-width="1"/>
        <circle cx="30" cy="23" r="5" fill="#38bdf8" opacity="0.4"/>
        <!-- Shower area partition -->
        <line x1="10" y1="65" x2="110" y2="65" stroke="#38bdf8" stroke-dasharray="3,3" opacity="0.5"/>
        <circle cx="60" cy="85" r="4" fill="#38bdf8" opacity="0.6"/>
        <text x="60" y="100" class="furniture-text">SHOWER</text>
      </g>

      <!-- ================= LOBBY / TERAS DEPAN DETAILS ================= -->
      <!-- Potted plants on front steps -->
      <circle cx="340" cy="745" r="10" fill="#065f46" stroke="#10b981" stroke-width="1.5"/>
      <circle cx="660" cy="745" r="10" fill="#065f46" stroke="#10b981" stroke-width="1.5"/>
      <!-- Welcome mat -->
      <rect x="470" y="710" width="60" height="24" rx="3" fill="#334155" stroke="#64748b" stroke-width="1"/>
      <text x="500" y="726" class="furniture-text">WELCOME</text>
    `;
  }

  renderDoorsAndWindowsSvg() {
    return `
      <!-- Front Main Entrance Door (Double Swing Arc) -->
      <g class="door-graphic" transform="translate(500, 680)">
        <path d="M -30 0 A 30 30 0 0 1 0 -30" class="door-swing" />
        <line x1="-30" y1="0" x2="0" y2="-30" class="door-leaf" />
        <path d="M 30 0 A 30 30 0 0 0 0 -30" class="door-swing" />
        <line x1="30" y1="0" x2="0" y2="-30" class="door-leaf" />
      </g>

      <!-- Kamar 1 Door -->
      <g class="door-graphic" transform="translate(320, 520)">
        <path d="M 0 0 A 40 40 0 0 0 -40 40" class="door-swing" />
        <line x1="0" y1="0" x2="-40" y2="40" class="door-leaf" />
      </g>

      <!-- WC 1 Door (En-Suite Inside Kamar 1) -->
      <g class="door-graphic" transform="translate(180, 630)">
        <path d="M 0 0 A 35 35 0 0 1 35 35" class="door-swing" />
        <line x1="0" y1="0" x2="35" y2="35" class="door-leaf" />
      </g>

      <!-- Kamar 2 Door -->
      <g class="door-graphic" transform="translate(680, 520)">
        <path d="M 0 0 A 40 40 0 0 1 40 40" class="door-swing" />
        <line x1="0" y1="0" x2="40" y2="40" class="door-leaf" />
      </g>

      <!-- Kamar 3 Door -->
      <g class="door-graphic" transform="translate(680, 300)">
        <path d="M 0 0 A 40 40 0 0 1 40 -40" class="door-swing" />
        <line x1="0" y1="0" x2="40" y2="-40" class="door-leaf" />
      </g>

      <!-- WC 2 (Luar) Door -->
      <g class="door-graphic" transform="translate(500, 220)">
        <path d="M 0 0 A 35 35 0 0 0 -35 -35" class="door-swing" />
        <line x1="0" y1="0" x2="-35" y2="-35" class="door-leaf" />
      </g>

      <!-- Windows (Cyan Double-Glass Lines) -->
      <!-- Bed 1 Front Window -->
      <line x1="100" y1="720" x2="160" y2="720" class="window-glass" />
      <!-- Bed 2 Front Window -->
      <line x1="840" y1="720" x2="900" y2="720" class="window-glass" />
      <!-- Kitchen Rear Window -->
      <line x1="100" y1="100" x2="180" y2="100" class="window-glass" />
      <!-- Bed 3 Rear Window -->
      <line x1="820" y1="100" x2="900" y2="100" class="window-glass" />
      <!-- Bed 1 Side Window -->
      <line x1="40" y1="520" x2="40" y2="600" class="window-glass" />
      <!-- Bed 2 Side Window -->
      <line x1="960" y1="520" x2="960" y2="600" class="window-glass" />
      <!-- Bed 3 Side Window -->
      <line x1="960" y1="180" x2="960" y2="260" class="window-glass" />
    `;
  }

  renderRoomLabelsSvg() {
    return this.roomsData.map(r => {
      let lx = r.x + r.w / 2;
      let ly = r.y + 24;
      if (r.id === 'wc_1') {
        lx = r.x + r.w / 2;
        ly = r.y + 18;
      }
      return `
        <g class="room-title-group" data-room="${r.id}">
          <rect x="${lx - 65}" y="${ly - 14}" width="130" height="20" rx="4" class="room-badge-bg" />
          <text x="${lx}" y="${ly}" class="room-label-text">${r.name.toUpperCase()}</text>
        </g>
      `;
    }).join('');
  }

  renderDeviceNodesSvg() {
    // Generate interactive node tags for each device
    const devices = this.store.getAll();
    return devices.map(dev => {
      // Find coordinates based on planCoord or preset mapping
      const coord = this.getDevicePlanCoord(dev);
      if (dev.type === 'fan') {
        return `
          <g id="node-${dev.id}" class="device-node node-fan" transform="translate(${coord.x}, ${coord.y})" data-device-id="${dev.id}">
            <!-- Generous stable hit area to eliminate any hover boundary flicker -->
            <circle class="hit-area" r="28" fill="transparent" />
            <!-- Fan wind aura -->
            <circle class="fan-wind-aura" r="28" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="4,4" pointer-events="none" />
            <!-- Fan background circle -->
            <circle class="node-bg" r="20" />
            <!-- Fan spinning blades -->
            <g class="fan-rotor" id="rotor-${dev.id}" pointer-events="none">
              <path d="M 0 0 C -6 -14 -12 -16 0 -18 C 12 -16 6 -14 0 0" fill="#38bdf8" class="fan-blade"/>
              <path d="M 0 0 C 14 -6 16 -12 18 0 C 16 12 14 6 0 0" fill="#38bdf8" class="fan-blade"/>
              <path d="M 0 0 C 6 14 12 16 0 18 C -12 16 -6 14 0 0" fill="#38bdf8" class="fan-blade"/>
              <path d="M 0 0 C -14 6 -16 12 -18 0 C -16 -12 -14 -6 0 0" fill="#38bdf8" class="fan-blade"/>
              <circle cx="0" cy="0" r="4.5" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
            </g>
            <!-- Badge speed indicator -->
            <rect x="10" y="-18" width="18" height="13" rx="3" class="speed-badge-bg" pointer-events="none" />
            <text x="19" y="-9" class="speed-badge-text" id="spd-text-${dev.id}" pointer-events="none">L${dev.speed || 0}</text>
            <!-- Label tag below -->
            <g class="node-label-tag" transform="translate(0, 28)">
              <rect x="-42" y="0" width="84" height="16" rx="3" class="node-label-bg" />
              <text x="0" y="11" class="node-label-text">${dev.name.split(' ')[0]} ${dev.name.split(' ')[1] || ''}</text>
            </g>
          </g>
        `;
      } else {
        // Light bulb node
        return `
          <g id="node-${dev.id}" class="device-node node-light" transform="translate(${coord.x}, ${coord.y})" data-device-id="${dev.id}">
            <!-- Generous stable hit area -->
            <circle class="hit-area" r="28" fill="transparent" />
            <!-- Light aura ripple -->
            <circle class="light-pulse-aura" r="26" pointer-events="none" />
            <!-- Node background circle -->
            <circle class="node-bg" r="19" />
            <!-- Bulb icon -->
            <g class="bulb-icon-svg" transform="translate(-10, -10)" pointer-events="none">
              <path d="M 10 2 C 5.5 2 2 5.5 2 10 C 2 12.8 3.5 15.2 5.6 16.6 L 5.6 18.5 C 5.6 19.3 6.3 20 7.1 20 L 12.9 20 C 13.7 20 14.4 19.3 14.4 18.5 L 14.4 16.6 C 16.5 15.2 18 12.8 18 10 C 18 5.5 14.5 2 10 2 Z" 
                    fill="currentColor" class="bulb-body" />
              <line x1="7" y1="21.5" x2="13" y2="21.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </g>
            <!-- Label tag below -->
            <g class="node-label-tag" transform="translate(0, 27)">
              <rect x="-45" y="0" width="90" height="16" rx="3" class="node-label-bg" />
              <text x="0" y="11" class="node-label-text">${dev.name.split(' ')[0]} ${dev.name.split(' ')[1] || ''}</text>
            </g>
          </g>
        `;
      }
    }).join('');
  }

  getDevicePlanCoord(dev) {
    // Exact mapping for floor plan
    const coords = {
      lobby_light: { x: 500, y: 725 },
      living_light: { x: 500, y: 550 },
      living_fan: { x: 420, y: 550 },
      family_light: { x: 500, y: 340 },
      family_fan: { x: 590, y: 340 },
      bedroom1_light: { x: 170, y: 520 },
      wc1_light: { x: 250, y: 650 },
      bedroom2_light: { x: 820, y: 580 },
      bedroom3_light: { x: 820, y: 270 },
      kitchen_light: { x: 180, y: 270 },
      kitchen_fan: { x: 260, y: 200 },
      wc2_light: { x: 500, y: 160 }
    };
    return coords[dev.id] || { x: 500, y: 400 };
  }

  updateDeviceVisuals(targetDev = null) {
    const devices = targetDev ? [targetDev] : this.store.getAll();

    devices.forEach(dev => {
      const nodeEl = document.getElementById(`node-${dev.id}`);
      const glowEl = document.getElementById(`glow-${dev.id}`);

      if (nodeEl) {
        if (dev.state) {
          nodeEl.classList.add('is-active');
        } else {
          nodeEl.classList.remove('is-active');
        }

        if (dev.type === 'fan') {
          const rotor = document.getElementById(`rotor-${dev.id}`);
          const spdText = document.getElementById(`spd-text-${dev.id}`);
          if (spdText) spdText.textContent = `L${dev.state ? (dev.speed || 1) : 0}`;
          
          if (rotor) {
            if (dev.state && dev.speed > 0) {
              const speedDuration = dev.speed === 3 ? '0.22s' : (dev.speed === 2 ? '0.45s' : '0.9s');
              rotor.style.animation = `fanSpin ${speedDuration} linear infinite`;
              rotor.style.animationPlayState = 'running';
            } else {
              rotor.style.animation = 'none';
            }
          }
        }
      }

      if (glowEl) {
        if (dev.state) {
          const opacity = dev.type === 'light' ? ((dev.brightness || 100) / 100) : 0.6;
          glowEl.style.opacity = String(opacity);
        } else {
          glowEl.style.opacity = '0';
        }
      }
    });
  }

  bindEvents() {
    // Zoom & Pan buttons
    const zoomInBtn = document.getElementById('fp-zoom-in');
    const zoomOutBtn = document.getElementById('fp-zoom-out');
    const resetBtn = document.getElementById('fp-reset');
    const zoomLabel = document.getElementById('fp-zoom-level');
    const viewport = document.getElementById('fp-viewport');

    const applyTransform = () => {
      if (this.svg) {
        this.svg.style.transform = `scale(${this.scale}) translate(${this.pan.x}px, ${this.pan.y}px)`;
        if (zoomLabel) zoomLabel.textContent = `${Math.round(this.scale * 100)}%`;
      }
    };

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        this.scale = Math.min(2.5, +(this.scale + 0.2).toFixed(1));
        applyTransform();
      });
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        this.scale = Math.max(0.6, +(this.scale - 0.2).toFixed(1));
        applyTransform();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.scale = 1;
        this.pan = { x: 0, y: 0 };
        applyTransform();
      });
    }

    // Touch & Mouse Drag to Pan
    let isDragging = false;
    let startX = 0, startY = 0;

    viewport.addEventListener('mousedown', (e) => {
      // Don't drag if clicking a device node
      if (e.target.closest('.device-node')) return;
      isDragging = true;
      startX = e.clientX - this.pan.x;
      startY = e.clientY - this.pan.y;
      viewport.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      this.pan.x = (e.clientX - startX);
      this.pan.y = (e.clientY - startY);
      applyTransform();
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        viewport.style.cursor = 'default';
      }
    });

    // Device Node Click handling
    this.svg.addEventListener('click', (e) => {
      const node = e.target.closest('.device-node');
      if (node) {
        e.stopPropagation();
        const devId = node.getAttribute('data-device-id');
        const dev = this.store.get(devId);
        if (!dev) return;

        if (dev.type === 'fan') {
          // If fan is OFF, turn to speed 1. If speed 1 -> 2, 2 -> 3, 3 -> OFF!
          let nextSpeed = 0;
          if (!dev.state || dev.speed === 0) nextSpeed = 1;
          else if (dev.speed === 1) nextSpeed = 2;
          else if (dev.speed === 2) nextSpeed = 3;
          else nextSpeed = 0;

          this.store.setSpeed(dev.id, nextSpeed);
          window.soundFX.playFanSpeed(nextSpeed);
          window.esp32Bridge.sendDeviceCommand(dev);
          if (window.showToast) {
            window.showToast(`${dev.name}: ${nextSpeed > 0 ? `Speed ${nextSpeed}` : 'Mati'}`);
          }
        } else {
          // Toggle light
          const updated = this.store.toggle(dev.id);
          window.soundFX.playToggle(updated.state);
          window.esp32Bridge.sendDeviceCommand(updated);
          if (window.showToast) {
            window.showToast(`${dev.name}: ${updated.state ? 'Menyala' : 'Padam'}`);
          }
        }
      }
    });

    // Room highlight on click
    this.svg.addEventListener('click', (e) => {
      const roomGroup = e.target.closest('.room-element');
      if (roomGroup) {
        const roomId = roomGroup.getAttribute('data-room-id');
        this.selectRoom(roomId);
      }
    });
  }

  selectRoom(roomId) {
    this.selectedRoom = roomId;
    document.querySelectorAll('.room-rect').forEach(rect => {
      rect.classList.remove('is-selected');
    });
    const target = document.getElementById(`room-rect-${roomId}`);
    if (target) {
      target.classList.add('is-selected');
    }

    // Also trigger tab or detail card if desired
    if (window.onRoomSelected) {
      window.onRoomSelected(roomId);
    }
  }
}

window.FloorPlanRenderer = FloorPlanRenderer;
