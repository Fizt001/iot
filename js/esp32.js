// ESP32 Connectivity, Protocol Handler, and Code Generator
class ESP32Bridge {
  constructor() {
    this.mode = localStorage.getItem('smarthome_esp32_mode') || 'simulated'; // 'simulated' | 'websocket' | 'http_rest'
    this.ip = localStorage.getItem('smarthome_esp32_ip') || '192.168.1.150';
    this.wsPort = localStorage.getItem('smarthome_esp32_ws_port') || '81';
    this.httpPort = localStorage.getItem('smarthome_esp32_http_port') || '80';
    this.connected = false;
    this.ws = null;
    this.logs = [];
    this.listeners = [];
    this.telemetry = {
      temp: 28.4,
      humidity: 62,
      rssi: -58,
      uptimeSec: 3600,
      freeHeap: 184500
    };
    this.pingLatency = 14;

    this.init();
  }

  init() {
    if (this.mode === 'websocket') {
      this.connectWebSocket();
    } else if (this.mode === 'simulated') {
      this.startSimulation();
    }

    // Uptime ticker
    setInterval(() => {
      this.telemetry.uptimeSec += 2;
      if (this.mode === 'simulated') {
        // Minor realistic telemetry jitter
        this.telemetry.temp = +(28.0 + Math.sin(Date.now() / 60000) * 1.5).toFixed(1);
        this.telemetry.humidity = Math.round(62 + Math.cos(Date.now() / 90000) * 3);
        this.telemetry.rssi = -55 - Math.floor(Math.random() * 8);
        this.pingLatency = 8 + Math.floor(Math.random() * 12);
        this.notifyTelemetry();
      }
    }, 2000);
  }

  startSimulation() {
    this.connected = true;
    this.log('SYS', 'Mode Simulasi ESP32 Aktif. Siap mengirim/menerima perintah virtual.');
    this.notifyStatus(true);
  }

  setMode(newMode) {
    this.mode = newMode;
    localStorage.setItem('smarthome_esp32_mode', newMode);
    this.log('SYS', `Beralih ke mode: ${newMode.toUpperCase()}`);
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
      this.ws = null;
    }

    if (newMode === 'websocket') {
      this.connectWebSocket();
    } else if (newMode === 'http_rest') {
      this.testHttpPing();
    } else {
      this.startSimulation();
    }
  }

  setConfig(ip, wsPort, httpPort) {
    this.ip = ip.trim();
    this.wsPort = wsPort.trim();
    this.httpPort = httpPort.trim();
    localStorage.setItem('smarthome_esp32_ip', this.ip);
    localStorage.setItem('smarthome_esp32_ws_port', this.wsPort);
    localStorage.setItem('smarthome_esp32_http_port', this.httpPort);
    this.log('SYS', `Konfigurasi IP disimpan: ${this.ip}`);
    this.setMode(this.mode);
  }

  connectWebSocket() {
    let wsUrl;
    // Auto-detect: jika dibuka di VPS/web domain, langsung gunakan host web tersebut
    if (!this.ip || this.ip === 'auto' || this.ip === window.location.hostname || (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !this.ip.startsWith('192.168.') && !this.ip.startsWith('10.'))) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/`;
    } else {
      wsUrl = `ws://${this.ip}:${this.wsPort}/`;
    }

    this.log('WS', `Mencoba menghubungkan ke ${wsUrl}...`);
    this.connected = false;
    this.notifyStatus(false);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connected = true;
        this.log('WS', `Terhubung ke ESP32 pada ${wsUrl}!`);
        this.notifyStatus(true);
        // Request initial state
        this.sendWS({ action: 'getState' });
      };

      this.ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          this.log('RX', JSON.stringify(data));
          this.handleIncoming(data);
        } catch (e) {
          this.log('RX', evt.data);
        }
      };

      this.ws.onerror = (err) => {
        this.log('ERR', `WebSocket Error: ${err.message || 'Koneksi gagal'}`);
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.notifyStatus(false);
        this.log('WS', 'Koneksi WebSocket terputus. Mencoba reconnect dalam 5 detik...');
        if (this.mode === 'websocket') {
          setTimeout(() => this.connectWebSocket(), 5000);
        }
      };
    } catch (e) {
      this.log('ERR', `Exception saat koneksi WS: ${e.message}`);
    }
  }

  async testHttpPing() {
    const startTime = performance.now();
    try {
      this.log('HTTP', `Mengirim ping ke http://${this.ip}:${this.httpPort}/api/status...`);
      const res = await fetch(`http://${this.ip}:${this.httpPort}/api/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        this.pingLatency = Math.round(performance.now() - startTime);
        this.connected = true;
        this.notifyStatus(true);
        this.log('HTTP', `Ping sukses! Latensi: ${this.pingLatency}ms`);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      this.connected = false;
      this.notifyStatus(false);
      this.log('ERR', `HTTP Ping gagal: ${e.message}`);
    }
  }

  async sendDeviceCommand(device) {
    const payload = {
      action: 'control',
      device: device.id,
      type: device.type,
      state: device.state ? 1 : 0,
      gpio: device.gpio,
      speed: device.type === 'fan' ? (device.speed || 0) : undefined,
      brightness: device.type === 'light' ? (device.brightness || 100) : undefined,
      timestamp: Date.now()
    };

    this.log('TX', JSON.stringify(payload));

    if (this.mode === 'simulated') {
      // Simulate quick acknowledgment
      setTimeout(() => {
        this.log('RX', JSON.stringify({ status: 'ACK', device: device.id, state: device.state ? 1 : 0 }));
      }, 50);
      return true;
    }

    if (this.mode === 'websocket') {
      if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(payload));
        return true;
      } else {
        this.log('ERR', 'WebSocket belum siap. Perintah gagal dikirim.');
        return false;
      }
    }

    if (this.mode === 'http_rest') {
      try {
        const query = new URLSearchParams({
          dev: device.id,
          state: device.state ? '1' : '0',
          gpio: String(device.gpio),
          speed: String(device.speed || 0),
          pwm: String(Math.round(((device.brightness || 100) / 100) * 255))
        });
        const res = await fetch(`http://${this.ip}:${this.httpPort}/api/set?${query.toString()}`, {
          method: 'GET',
          signal: AbortSignal.timeout(2500)
        });
        return res.ok;
      } catch (e) {
        this.log('ERR', `Gagal kirim HTTP REST: ${e.message}`);
        return false;
      }
    }
  }

  handleIncoming(data) {
    if (data.telemetry) {
      this.telemetry = { ...this.telemetry, ...data.telemetry };
      this.notifyTelemetry();
    }

    if (data.devices && Array.isArray(data.devices)) {
      data.devices.forEach(d => {
        window.deviceStore.setState(d.id, d.state === 1 || d.state === true, {
          speed: d.speed,
          brightness: d.brightness
        });
      });
    } else if (data.device) {
      window.deviceStore.setState(data.device, data.state === 1 || data.state === true, {
        speed: data.speed,
        brightness: data.brightness
      });
    }
  }

  log(tag, msg) {
    const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
    const entry = { time, tag, msg };
    this.logs.unshift(entry);
    if (this.logs.length > 80) this.logs.pop();
    this.notifyLogs();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyStatus(status) {
    this.listeners.forEach(l => l.onStatus && l.onStatus(status, this.mode));
  }

  notifyTelemetry() {
    this.listeners.forEach(l => l.onTelemetry && l.onTelemetry(this.telemetry, this.pingLatency));
  }

  notifyLogs() {
    this.listeners.forEach(l => l.onLogs && l.onLogs(this.logs));
  }

  // Generates complete Arduino IDE / PlatformIO C++ firmware code
  generateFirmwareCode(ssid = 'WIFI_RUMAH_ANDA', pass = 'PASSWORD_WIFI') {
    return `/*
 * =========================================================================
 * SMART HOME ESP32 - CONTROLLER FIRMWARE
 * Dibuat khusus untuk Denah Rumah Pintar (Antigravity)
 * =========================================================================
 * Perangkat Terkontrol:
 * 1.  GPIO 16 -> Lampu Teras / Lobby Depan (Relay)
 * 2.  GPIO 17 -> Lampu Ruang Tamu (Relay)
 * 3.  GPIO 27 -> Kipas Ruang Tamu (PWM / Transistor Driver / Triac)
 * 4.  GPIO 18 -> Lampu Ruang Keluarga (Relay)
 * 5.  GPIO 32 -> Kipas Ruang Keluarga (PWM)
 * 6.  GPIO 19 -> Lampu Kamar Tidur 1 (Utama) (Relay)
 * 7.  GPIO 21 -> Lampu WC 1 (Dalam Kamar 1) (Relay)
 * 8.  GPIO 22 -> Lampu Kamar Tidur 2 (Relay)
 * 9.  GPIO 23 -> Lampu Kamar Tidur 3 (Relay)
 * 10. GPIO 25 -> Lampu Dapur (Relay)
 * 11. GPIO 33 -> Kipas Dapur (PWM)
 * 12. GPIO 26 -> Lampu WC 2 (Luar / Umum) (Relay)
 * =========================================================================
 * Library yang dibutuhkan (Install via Arduino Library Manager):
 * - WebSockets by Markus Sattler
 * - ArduinoJson by Benoit Blanchon (v6+)
 * - ESPAsyncWebServer (atau WebServer built-in ESP32)
 * =========================================================================
 */

#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>

// Konfigurasi Jaringan WiFi
const char* ssid = "${ssid}";
const char* password = "${pass}";

// Web Server & WebSocket Server
WebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(81);

// Definisi Pin Lampu (Relay Active LOW umumnya)
#define RELAY_ON  LOW
#define RELAY_OFF HIGH

#define PIN_LOBBY_LIGHT      16
#define PIN_LIVING_LIGHT     17
#define PIN_FAMILY_LIGHT     18
#define PIN_BEDROOM1_LIGHT   19
#define PIN_WC1_LIGHT        21
#define PIN_BEDROOM2_LIGHT   22
#define PIN_BEDROOM3_LIGHT   23
#define PIN_KITCHEN_LIGHT    25
#define PIN_WC2_LIGHT        26

// Definisi Pin Kipas (PWM Channel)
#define PIN_LIVING_FAN       27
#define PIN_FAMILY_FAN       32
#define PIN_KITCHEN_FAN      33

// PWM Channels ESP32
#define PWM_CH_LIVING        0
#define PWM_CH_FAMILY        1
#define PWM_CH_KITCHEN       2
#define PWM_FREQ             5000
#define PWM_RES              8 // 0-255 (8-bit resolution)

// Global state tracker
int livingFanSpeed = 0;
int familyFanSpeed = 0;
int kitchenFanSpeed = 0;

void setupPins() {
  // Setup Relays
  int relayPins[] = {
    PIN_LOBBY_LIGHT, PIN_LIVING_LIGHT, PIN_FAMILY_LIGHT,
    PIN_BEDROOM1_LIGHT, PIN_WC1_LIGHT, PIN_BEDROOM2_LIGHT,
    PIN_BEDROOM3_LIGHT, PIN_KITCHEN_LIGHT, PIN_WC2_LIGHT
  };

  for (int pin : relayPins) {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, RELAY_OFF);
  }

  // Setup Fans PWM (Kompatibel dengan ESP32 Core v2.x & v3.x)
#if defined(ESP_ARDUINO_VERSION_MAJOR) && (ESP_ARDUINO_VERSION_MAJOR >= 3)
  ledcAttach(PIN_LIVING_FAN, PWM_FREQ, PWM_RES);
  ledcAttach(PIN_FAMILY_FAN, PWM_FREQ, PWM_RES);
  ledcAttach(PIN_KITCHEN_FAN, PWM_FREQ, PWM_RES);
  ledcWrite(PIN_LIVING_FAN, 0);
  ledcWrite(PIN_FAMILY_FAN, 0);
  ledcWrite(PIN_KITCHEN_FAN, 0);
#else
  ledcSetup(PWM_CH_LIVING, PWM_FREQ, PWM_RES);
  ledcAttachPin(PIN_LIVING_FAN, PWM_CH_LIVING);
  ledcWrite(PWM_CH_LIVING, 0);

  ledcSetup(PWM_CH_FAMILY, PWM_FREQ, PWM_RES);
  ledcAttachPin(PIN_FAMILY_FAN, PWM_CH_FAMILY);
  ledcWrite(PWM_CH_FAMILY, 0);

  ledcSetup(PWM_CH_KITCHEN, PWM_FREQ, PWM_RES);
  ledcAttachPin(PIN_KITCHEN_FAN, PWM_CH_KITCHEN);
  ledcWrite(PWM_CH_KITCHEN, 0);
#endif
}

void setFanSpeed(int pin, int channel, int speedLevel) {
  // speedLevel: 0=Off, 1=Low (85), 2=Medium (170), 3=High (255)
  int duty = 0;
  if (speedLevel == 1) duty = 85;
  else if (speedLevel == 2) duty = 170;
  else if (speedLevel == 3) duty = 255;

#if defined(ESP_ARDUINO_VERSION_MAJOR) && (ESP_ARDUINO_VERSION_MAJOR >= 3)
  ledcWrite(pin, duty);
#else
  ledcWrite(channel, duty);
#endif
}

void processDeviceCommand(JsonObject doc) {
  const char* dev = doc["device"];
  int state = doc["state"];
  int speed = doc["speed"] | 0;

  Serial.printf("[KONTROL] Perangkat: %s | Status: %s | Kecepatan: %d\\n", 
                dev, state ? "NYALA" : "MATI", speed);

  // Lampu (Relay)
  if (strcmp(dev, "lobby_light") == 0) digitalWrite(PIN_LOBBY_LIGHT, state ? RELAY_ON : RELAY_OFF);
  else if (strcmp(dev, "living_light") == 0) digitalWrite(PIN_LIVING_LIGHT, state ? RELAY_ON : RELAY_OFF);
  else if (strcmp(dev, "family_light") == 0) digitalWrite(PIN_FAMILY_LIGHT, state ? RELAY_ON : RELAY_OFF);
  else if (strcmp(dev, "bedroom1_light") == 0) digitalWrite(PIN_BEDROOM1_LIGHT, state ? RELAY_ON : RELAY_OFF);
  else if (strcmp(dev, "wc1_light") == 0) digitalWrite(PIN_WC1_LIGHT, state ? RELAY_ON : RELAY_OFF);
  else if (strcmp(dev, "bedroom2_light") == 0) digitalWrite(PIN_BEDROOM2_LIGHT, state ? RELAY_ON : RELAY_OFF);
  else if (strcmp(dev, "bedroom3_light") == 0) digitalWrite(PIN_BEDROOM3_LIGHT, state ? RELAY_ON : RELAY_OFF);
  else if (strcmp(dev, "kitchen_light") == 0) digitalWrite(PIN_KITCHEN_LIGHT, state ? RELAY_ON : RELAY_OFF);
  else if (strcmp(dev, "wc2_light") == 0) digitalWrite(PIN_WC2_LIGHT, state ? RELAY_ON : RELAY_OFF);

  // Kipas Angin (PWM)
  else if (strcmp(dev, "living_fan") == 0) {
    livingFanSpeed = state ? (speed > 0 ? speed : 1) : 0;
    setFanSpeed(PIN_LIVING_FAN, PWM_CH_LIVING, livingFanSpeed);
  }
  else if (strcmp(dev, "family_fan") == 0) {
    familyFanSpeed = state ? (speed > 0 ? speed : 1) : 0;
    setFanSpeed(PIN_FAMILY_FAN, PWM_CH_FAMILY, familyFanSpeed);
  }
  else if (strcmp(dev, "kitchen_fan") == 0) {
    kitchenFanSpeed = state ? (speed > 0 ? speed : 1) : 0;
    setFanSpeed(PIN_KITCHEN_FAN, PWM_CH_KITCHEN, kitchenFanSpeed);
  }
}

// Mengirimkan status lengkap seluruh 12 pin ke Web App untuk sinkronisasi instan
void sendAllStates(uint8_t clientNum) {
#if ARDUINOJSON_VERSION_MAJOR >= 7
  JsonDocument doc;
#else
  StaticJsonDocument<1024> doc;
#endif
  JsonArray arr = doc.createNestedArray("devices");

  auto addLight = [&](const char* id, int pin) {
    JsonObject o = arr.createNestedObject();
    o["id"] = id;
    o["state"] = (digitalRead(pin) == RELAY_ON) ? 1 : 0;
  };

  auto addFan = [&](const char* id, int spd) {
    JsonObject o = arr.createNestedObject();
    o["id"] = id;
    o["state"] = (spd > 0) ? 1 : 0;
    o["speed"] = spd;
  };

  addLight("lobby_light", PIN_LOBBY_LIGHT);
  addLight("living_light", PIN_LIVING_LIGHT);
  addFan("living_fan", livingFanSpeed);
  addLight("family_light", PIN_FAMILY_LIGHT);
  addFan("family_fan", familyFanSpeed);
  addLight("bedroom1_light", PIN_BEDROOM1_LIGHT);
  addLight("wc1_light", PIN_WC1_LIGHT);
  addLight("bedroom2_light", PIN_BEDROOM2_LIGHT);
  addLight("bedroom3_light", PIN_BEDROOM3_LIGHT);
  addLight("kitchen_light", PIN_KITCHEN_LIGHT);
  addFan("kitchen_fan", kitchenFanSpeed);
  addLight("wc2_light", PIN_WC2_LIGHT);

  String output;
  serializeJson(doc, output);

  if (clientNum == 255) {
    webSocket.broadcastTXT(output);
  } else {
    webSocket.sendTXT(clientNum, output);
  }
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.printf("[WS] Client #%u Terhubung! Sinkronisasi status awal...\\n", num);
      // Kirim status awal seluruh perangkat ke client web yang baru terhubung
      sendAllStates(num);
      break;

    case WStype_DISCONNECTED:
      Serial.printf("[WS] Client #%u Terputus\\n", num);
      break;

    case WStype_TEXT: {
#if ARDUINOJSON_VERSION_MAJOR >= 7
      JsonDocument doc;
#else
      StaticJsonDocument<512> doc;
#endif
      DeserializationError err = deserializeJson(doc, payload);
      if (!err) {
        if (doc.containsKey("action") && strcmp(doc["action"], "getState") == 0) {
          sendAllStates(num);
        } else {
          processDeviceCommand(doc.as<JsonObject>());
          // Broadcast perubahan status ke seluruh browser client lainnya
          webSocket.broadcastTXT(payload, length);
        }
      }
      break;
    }
  }
}

void handleRestApi() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  if (server.hasArg("dev") && server.hasArg("state")) {
#if ARDUINOJSON_VERSION_MAJOR >= 7
    JsonDocument doc;
#else
    StaticJsonDocument<256> doc;
#endif
    doc["device"] = server.arg("dev");
    doc["state"] = server.arg("state").toInt();
    if (server.hasArg("speed")) doc["speed"] = server.arg("speed").toInt();
    processDeviceCommand(doc.as<JsonObject>());
    server.send(200, "application/json", "{\\"status\\":\\"ok\\"}");
    // Broadcast via WS juga agar web sync
    sendAllStates(255);
  } else {
    server.send(400, "application/json", "{\\"error\\":\\"Invalid parameters\\"}");
  }
}

void handleStatus() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
#if ARDUINOJSON_VERSION_MAJOR >= 7
  JsonDocument doc;
#else
  StaticJsonDocument<256> doc;
#endif
  doc["status"] = "online";
  doc["uptime"] = millis() / 1000;
  doc["rssi"] = WiFi.RSSI();
  String out;
  serializeJson(doc, out);
  server.send(200, "application/json", out);
}

void setup() {
  Serial.begin(115200);
  setupPins();

  Serial.println("\\n==========================================");
  Serial.println("  ESP32 SMART HOME CONTROLLER - ANTIGRAVITY");
  Serial.println("==========================================");
  Serial.print("Menghubungkan ke WiFi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }

  Serial.println("\\n>>> WiFi Terhubung!");
  Serial.print(">>> ALAMAT IP ESP32: ");
  Serial.println(WiFi.localIP());
  Serial.println(">>> Gunakan Alamat IP di atas pada Web App Anda.");
  Serial.println(">>> Port WebSocket : 81");
  Serial.println(">>> Port HTTP Web  : 80");
  Serial.println("==========================================\\n");

  // Setup WebSocket Server
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);

  // Setup HTTP REST Routes
  server.on("/api/set", handleRestApi);
  server.on("/api/status", handleStatus);
  server.begin();
  Serial.println("Server Siap Menerima Perintah!");
}

void loop() {
  webSocket.loop();
  server.handleClient();

  // Periodic Telemetry Broadcast (tiap 5 detik)
  static unsigned long lastBroadcast = 0;
  if (millis() - lastBroadcast > 5000) {
    lastBroadcast = millis();
#if ARDUINOJSON_VERSION_MAJOR >= 7
    JsonDocument doc;
#else
    StaticJsonDocument<256> doc;
#endif
    doc["telemetry"]["uptimeSec"] = millis() / 1000;
    doc["telemetry"]["rssi"] = WiFi.RSSI();
    doc["telemetry"]["freeHeap"] = ESP.getFreeHeap();
    String output;
    serializeJson(doc, output);
    webSocket.broadcastTXT(output);
  }
}
`;
  }
}

window.esp32Bridge = new ESP32Bridge();
