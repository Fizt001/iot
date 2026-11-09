/*
 * =========================================================================
 * SMART HOME ESP32 - EDISI KHUSUS 9 RELAY LAMPU
 * Host  : smarthome.manajemensystem.my.id
 * Port  : 8005 (Port Dedicated Hardware)
 * =========================================================================
 * PEMETAAN PIN RELAY LAMPU (ACTIVE LOW):
 * 1. GPIO 16 -> Lampu Teras (lobby_light)
 * 2. GPIO 17 -> Lampu Ruang Tamu (living_light)
 * 3. GPIO 18 -> Lampu Ruang Keluarga (family_light)
 * 4. GPIO 19 -> Lampu Kamar 1 (bedroom1_light)
 * 5. GPIO 21 -> Lampu WC 1 (wc1_light)
 * 6. GPIO 22 -> Lampu Kamar 2 (bedroom2_light)
 * 7. GPIO 23 -> Lampu Kamar 3 (bedroom3_light)
 * 8. GPIO 25 -> Lampu Dapur (kitchen_light)
 * 9. GPIO 26 -> Lampu WC 2 (wc2_light)
 * =========================================================================
 * LIBRARY YANG DIBUTUHKAN (Install di Tools -> Manage Libraries):
 * 1. "WebSockets" by Markus Sattler
 * 2. "ArduinoJson" by Benoit Blanchon (Versi 6 atau 7)
 * =========================================================================
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

// Header untuk mengatasi error 'Brownout detector was triggered'
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// 1. KONFIGURASI WIFI & SERVER
const char* ssid     = "Sumsang";                           // Ganti nama WiFi / Hotspot
const char* password = "123456789";                         // Ganti password WiFi
const char* vps_host = "smarthome.manajemensystem.my.id";   // Domain Cloud VPS
const int   vps_port = 8005;                                // Port khusus hardware ESP32

// =========================================================================
// PILIH MODE OUTPUT: LED BIASA (PROTOTIPE) vs MODUL RELAY ASLI
// =========================================================================
// 1. JIKA PAKAI LED BIASA (Kaki + ke GPIO, Kaki - ke GND):
#define RELAY_ON  HIGH  // Beri tegangan HIGH (3.3V) agar LED Nyala
#define RELAY_OFF LOW   // Beri tegangan LOW (0V) agar LED Mati

// 2. NANTI JIKA SUDAH PAKAI MODUL RELAY ASLI (ACTIVE LOW), CUKUP GANTI JADI INI:
// #define RELAY_ON  LOW   // Modul Relay: LOW = Aktif / Nyala
// #define RELAY_OFF HIGH  // Modul Relay: HIGH = Mati
// =========================================================================

// 2. DEFINISI PIN GPIO
#define PIN_LOBBY_LIGHT     16
#define PIN_LIVING_LIGHT    17
#define PIN_FAMILY_LIGHT    18
#define PIN_BEDROOM1_LIGHT  19
#define PIN_WC1_LIGHT       21
#define PIN_BEDROOM2_LIGHT  22
#define PIN_BEDROOM3_LIGHT  23
#define PIN_KITCHEN_LIGHT   25
#define PIN_WC2_LIGHT       26

// Struktur data sederhana untuk menghubungkan ID di website dengan Pin ESP32
struct LampuDevice {
  const char* id;
  int pin;
};

LampuDevice daftarLampu[] = {
  { "lobby_light",    PIN_LOBBY_LIGHT },
  { "living_light",   PIN_LIVING_LIGHT },
  { "family_light",   PIN_FAMILY_LIGHT },
  { "bedroom1_light", PIN_BEDROOM1_LIGHT },
  { "wc1_light",      PIN_WC1_LIGHT },
  { "bedroom2_light", PIN_BEDROOM2_LIGHT },
  { "bedroom3_light", PIN_BEDROOM3_LIGHT },
  { "kitchen_light",  PIN_KITCHEN_LIGHT },
  { "wc2_light",      PIN_WC2_LIGHT }
};

const int JUMLAH_LAMPU = sizeof(daftarLampu) / sizeof(daftarLampu[0]);

WebSocketsClient webSocket;

// 3. FUNGSI SETUP PIN RELAY
void inisialisasiPin() {
  for (int i = 0; i < JUMLAH_LAMPU; i++) {
    pinMode(daftarLampu[i].pin, OUTPUT);
    digitalWrite(daftarLampu[i].pin, RELAY_OFF); // Awal mula semua lampu MATI
  }
}

// 4. SINKRONISASI STATUS SEMUA LAMPU KE SERVER
void kirimSemuaStatusLampu() {
#if ARDUINOJSON_VERSION_MAJOR >= 7
  JsonDocument doc;
#else
  StaticJsonDocument<1024> doc;
#endif

  doc["from"] = "esp32";
  JsonArray devices = doc.createNestedArray("devices");

  for (int i = 0; i < JUMLAH_LAMPU; i++) {
    JsonObject obj = devices.createNestedObject();
    obj["id"] = daftarLampu[i].id;
    obj["state"] = (digitalRead(daftarLampu[i].pin) == RELAY_ON) ? 1 : 0;
  }

  String output;
  serializeJson(doc, output);
  webSocket.sendTXT(output);
}

// 5. PROSES PERINTAH LAMPU DARI WEBSITE
void eksekusiPerintah(const char* targetId, int targetState) {
  bool ketemu = false;
  for (int i = 0; i < JUMLAH_LAMPU; i++) {
    if (strcmp(daftarLampu[i].id, targetId) == 0) {
      digitalWrite(daftarLampu[i].pin, (targetState == 1) ? RELAY_ON : RELAY_OFF);
      Serial.printf("[KONTROL] %s (%s) -> PIN GPIO %d: %s\n", 
                    daftarLampu[i].id, 
                    (targetState == 1) ? "NYALA" : "MATI", 
                    daftarLampu[i].pin,
                    (targetState == 1) ? "LOW (ON)" : "HIGH (OFF)");
      ketemu = true;
      break;
    }
  }

  if (!ketemu) {
    Serial.printf("[PERINGATAN] ID Perangkat tidak dikenal: %s\n", targetId);
  }
}

// 6. EVENT HANDLER WEBSOCKET
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.println("\n>>> [WS] BERHASIL TERHUBUNG KE VPS CLOUD! <<<");
      // Kirim salam & status awal ke website
      webSocket.sendTXT("{\"from\":\"esp32\",\"msg\":\"ESP32 9 Lampu Siap Kontrol\"}");
      kirimSemuaStatusLampu();
      break;

    case WStype_DISCONNECTED:
      Serial.println("[WS] Terputus dari VPS. Mencoba menyambung kembali...");
      break;

    case WStype_TEXT: {
#if ARDUINOJSON_VERSION_MAJOR >= 7
      JsonDocument doc;
#else
      StaticJsonDocument<512> doc;
#endif
      DeserializationError err = deserializeJson(doc, payload);
      if (!err) {
        // Jika server meminta status lampu
        if (doc.containsKey("action") && strcmp(doc["action"], "getState") == 0) {
          kirimSemuaStatusLampu();
        } 
        // Jika server mengirim perintah saklar lampu
        else if (doc.containsKey("device")) {
          const char* dev = doc["device"];
          int state = doc["state"];
          eksekusiPerintah(dev, state);
        }
      }
      break;
    }

    default:
      break;
  }
}

// 7. SETUP UTAMA
void setup() {
  // Matikan Brownout Detector agar ESP32 tidak auto-reset saat WiFi menyala
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  inisialisasiPin();

  Serial.println("\n=============================================");
  Serial.println("  ESP32 SMART HOME - KONTROL 9 RELAY LAMPU   ");
  Serial.println("=============================================");
  Serial.printf("Menghubungkan ke WiFi: %s\n", ssid);

  WiFi.mode(WIFI_STA);
  WiFi.setTxPower(WIFI_POWER_15dBm); // Mengurangi spike arus RF agar aman dengan kabel USB
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }

  Serial.println("\n>>> WiFi Terhubung!");
  Serial.print(">>> IP Lokal ESP32: ");
  Serial.println(WiFi.localIP());

  // Hubungkan ke VPS Cloud via WebSocket Port 8005
  webSocket.begin(vps_host, vps_port, "/?role=device");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000); // Reconnect otomatis jika drop
}

// 8. LOOP UTAMA
void loop() {
  webSocket.loop();

  // Kirim Heartbeat / Telemetri tiap 5 detik agar indikator navbar di Web menyala Hijau
  static unsigned long lastHeartbeat = 0;
  if (millis() - lastHeartbeat > 5000) {
    lastHeartbeat = millis();
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

