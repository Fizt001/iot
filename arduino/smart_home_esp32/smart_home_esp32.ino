/*
 * =========================================================================
 * SMART HOME ESP32 - CONTROLLER FIRMWARE (CLOUD VPS & LOCAL DUAL-MODE)
 * Author: Fizt001
 * Repo  : https://github.com/Fizt001/iot.git
 * =========================================================================
 * Pin Mapping:
 * 1.  GPIO 16 -> Lampu Teras / Lobby Depan (Relay 1)
 * 2.  GPIO 17 -> Lampu Ruang Tamu (Relay 2)
 * 3.  GPIO 27 -> Kipas Ruang Tamu (PWM Ch 0)
 * 4.  GPIO 18 -> Lampu Ruang Keluarga (Relay 3)
 * 5.  GPIO 32 -> Kipas Ruang Keluarga (PWM Ch 1)
 * 6.  GPIO 19 -> Lampu Kamar Tidur 1 (Utama) (Relay 4)
 * 7.  GPIO 21 -> Lampu WC 1 (Kamar 1) (Relay 5)
 * 8.  GPIO 22 -> Lampu Kamar Tidur 2 (Relay 6)
 * 9.  GPIO 23 -> Lampu Kamar Tidur 3 (Relay 7)
 * 10. GPIO 25 -> Lampu Dapur (Relay 8)
 * 11. GPIO 33 -> Kipas Dapur (PWM Ch 2)
 * 12. GPIO 26 -> Lampu WC 2 (Luar / Umum) (Relay 9)
 * =========================================================================
 * Library yang dibutuhkan (Install via Arduino IDE Library Manager):
 * 1. "WebSockets" by Markus Sattler
 * 2. "ArduinoJson" by Benoit Blanchon (v6 atau v7)
 * =========================================================================
 */

#include <WiFi.h>
#include <WebSocketsClient.h> // Menghubungkan ESP32 ke VPS Cloud via Internet
#include <ArduinoJson.h>

// =========================================================================
// 1. KONFIGURASI WIFI & VPS CLOUD
// =========================================================================
// Ganti dengan Nama & Password Hotspot HP / WiFi Anda
const char* ssid     = "HOTSPOT_HP_ANDA";
const char* password = "PASSWORD_HOTSPOT";

// Alamat Domain VPS Anda (Privat & Bersih tanpa IP)
const char* vps_host = "smarthome.manajemensystem.my.id"; // Domain VPS Anda
const int   vps_port = 8005;                              // Port khusus komunikasi ESP32 hardware (Port 8005)

// =========================================================================
// 2. DEFINISI PIN & RELAY
// =========================================================================
// Ubah RELAY_ON ke HIGH jika modul relay Anda tipe Active HIGH
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

// Definisi Pin Kipas Angin (PWM)
#define PIN_LIVING_FAN       27
#define PIN_FAMILY_FAN       32
#define PIN_KITCHEN_FAN      33

#define PWM_CH_LIVING        0
#define PWM_CH_FAMILY        1
#define PWM_CH_KITCHEN       2
#define PWM_FREQ             5000
#define PWM_RES              8 // 0-255 (8-bit resolution)

// Global State
int livingFanSpeed = 0;
int familyFanSpeed = 0;
int kitchenFanSpeed = 0;

WebSocketsClient webSocket;

// =========================================================================
// 3. HARDWARE SETUP & CONTROL FUNCTIONS
// =========================================================================
void setupPins() {
  int relayPins[] = {
    PIN_LOBBY_LIGHT, PIN_LIVING_LIGHT, PIN_FAMILY_LIGHT,
    PIN_BEDROOM1_LIGHT, PIN_WC1_LIGHT, PIN_BEDROOM2_LIGHT,
    PIN_BEDROOM3_LIGHT, PIN_KITCHEN_LIGHT, PIN_WC2_LIGHT
  };

  for (int pin : relayPins) {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, RELAY_OFF);
  }

  // Setup PWM Kipas (Kompatibel ESP32 Core v2 & v3)
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

  Serial.printf("[PERINTAH] Perangkat: %s | Status: %s | Kecepatan: %d\n", 
                dev, state ? "NYALA" : "MATI", speed);

  // Lampu
  if (strcmp(dev, "lobby_light") == 0) digitalWrite(PIN_LOBBY_LIGHT, state ? RELAY_ON : RELAY_OFF);
  else if (strcmp(dev, "living_light") == 0) digitalWrite(PIN_LIVING_LIGHT, state ? RELAY_ON : RELAY_OFF);
  else if (strcmp(dev, "family_light") == 0) digitalWrite(PIN_FAMILY_LIGHT, state ? RELAY_ON : RELAY_OFF);
  else if (strcmp(dev, "bedroom1_light") == 0) digitalWrite(PIN_BEDROOM1_LIGHT, state ? RELAY_ON : RELAY_OFF);
  else if (strcmp(dev, "wc1_light") == 0) digitalWrite(PIN_WC1_LIGHT, state ? RELAY_ON : RELAY_OFF);
  else if (strcmp(dev, "bedroom2_light") == 0) digitalWrite(PIN_BEDROOM2_LIGHT, state ? RELAY_ON : RELAY_OFF);
  else if (strcmp(dev, "bedroom3_light") == 0) digitalWrite(PIN_BEDROOM3_LIGHT, state ? RELAY_ON : RELAY_OFF);
  else if (strcmp(dev, "kitchen_light") == 0) digitalWrite(PIN_KITCHEN_LIGHT, state ? RELAY_ON : RELAY_OFF);
  else if (strcmp(dev, "wc2_light") == 0) digitalWrite(PIN_WC2_LIGHT, state ? RELAY_ON : RELAY_OFF);

  // Kipas
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

// Kirim seluruh status pin ke VPS agar web app tersinkronisasi instan
void sendAllStates() {
#if ARDUINOJSON_VERSION_MAJOR >= 7
  JsonDocument doc;
#else
  StaticJsonDocument<1024> doc;
#endif
  doc["from"] = "esp32";
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
  webSocket.sendTXT(output);
}

// =========================================================================
// 4. WEBSOCKET CLIENT EVENT HANDLER
// =========================================================================
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.println("\n>>> [WS] BERHASIL TERHUBUNG KE VPS CLOUD! <<<");
      // Kirim identitas awal ke VPS
      webSocket.sendTXT("{\"from\":\"esp32\",\"msg\":\"ESP32 Online Siap Kontrol\"}");
      // Sinkronisasi status awal ke VPS
      sendAllStates();
      break;

    case WStype_DISCONNECTED:
      Serial.println("[WS] Terputus dari VPS. Mencoba menghubungkan kembali...");
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
          sendAllStates();
        } else if (doc.containsKey("device")) {
          processDeviceCommand(doc.as<JsonObject>());
        }
      }
      break;
    }

    default:
      break;
  }
}

// =========================================================================
// 5. MAIN SETUP & LOOP
// =========================================================================
void setup() {
  Serial.begin(115200);
  setupPins();

  Serial.println("\n==========================================");
  Serial.println("  ESP32 SMART HOME - IOT CLOUD CONTROLLER");
  Serial.println("==========================================");
  Serial.print("Menghubungkan ke WiFi / Hotspot: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }

  Serial.println("\n>>> WiFi / Hotspot Terhubung!");
  Serial.print(">>> IP Lokal ESP32: ");
  Serial.println(WiFi.localIP());
  Serial.print(">>> Menghubungkan ke VPS: ");
  Serial.print(vps_host);
  Serial.print(":");
  Serial.println(vps_port);

  // Inisialisasi WebSocket Client ke VPS
  webSocket.begin(vps_host, vps_port, "/?role=device");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000); // Otomatis reconnect tiap 5 detik jika koneksi drop
}

void loop() {
  webSocket.loop();

  // Kirim Telemetry berkala ke VPS tiap 5 detik
  static unsigned long lastTelemetry = 0;
  if (millis() - lastTelemetry > 5000) {
    lastTelemetry = millis();
    if (webSocket.isConnected()) {
#if ARDUINOJSON_VERSION_MAJOR >= 7
      JsonDocument doc;
#else
      StaticJsonDocument<256> doc;
#endif
      doc["from"] = "esp32";
      doc["telemetry"]["uptimeSec"] = millis() / 1000;
      doc["telemetry"]["rssi"] = WiFi.RSSI();
      doc["telemetry"]["freeHeap"] = ESP.getFreeHeap();
      String out;
      serializeJson(doc, out);
      webSocket.sendTXT(out);
    }
  }
}
