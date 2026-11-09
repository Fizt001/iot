# 🔌 Dokumentasi Port, Pin GPIO & Protokol ESP32 Smart Home

Dokumentasi ini disusun khusus untuk panduan siswa/tim dalam memprogram mikroprosesor **ESP32 Dev Module** (`.ino`) menggunakan **Arduino IDE** agar terhubung secara real-time ke sistem **Smart Home Cloud IoT**.

---

## 🌐 1. Konfigurasi Jaringan & Port Server (VPS)

ESP32 terhubung ke server backend menggunakan protokol **WebSocket Client** melalui jaringan internet (WiFi Rumah / Hotspot HP).

| Parameter | Nilai Konfigurasi | Keterangan |
| :--- | :--- | :--- |
| **Host / Domain Server** | `smarthome.manajemensystem.my.id` | Alamat VPS Cloud |
| **Port ESP32** | `8005` | Port dedicated hardware (Plain WebSocket, non-SSL agar hemat memori & CPU ESP32) |
| **Path URL** | `/?role=device` | Menandai koneksi sebagai hardware ESP32 |
| **Baud Rate Serial** | `115200` | Kecepatan Serial Monitor Arduino IDE |
| **Protokol** | `WebSocket (ws://)` | Full-Duplex real-time < 10 ms |

> ⚠️ **Penting:**
> Port untuk ESP32 adalah **`8005`**, BUKAN port `443` (port 443 khusus HTTPS web browser). Server Nginx di VPS otomatis meneruskan port 8005 ke Node.js backend.

---

## 📌 2. Tabel Pemetaan Port / Pin GPIO ESP32 (12 Perangkat)

ESP32 mengontrol **9 Modul Relay (Lampu)** dan **3 Jalur PWM (Kipas Angin)**.

| No | Nama Ruangan / Perangkat | ID Perangkat (`device`) | Tipe Kontrol | Pin GPIO ESP32 | Level Logika / PWM |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **1** | Lampu Teras / Lobby Depan | `"lobby_light"` | Relay | **GPIO 16** | `LOW` = ON, `HIGH` = OFF |
| **2** | Lampu Ruang Tamu | `"living_light"` | Relay | **GPIO 17** | `LOW` = ON, `HIGH` = OFF |
| **3** | Kipas Ruang Tamu | `"living_fan"` | PWM Driver | **GPIO 27** | PWM Ch 0 (Duty: 0, 85, 170, 255) |
| **4** | Lampu Ruang Keluarga | `"family_light"` | Relay | **GPIO 18** | `LOW` = ON, `HIGH` = OFF |
| **5** | Kipas Ruang Keluarga | `"family_fan"` | PWM Driver | **GPIO 32** | PWM Ch 1 (Duty: 0, 85, 170, 255) |
| **6** | Lampu Kamar Tidur 1 (Utama) | `"bedroom1_light"` | Relay | **GPIO 19** | `LOW` = ON, `HIGH` = OFF |
| **7** | Lampu WC 1 (Dalam Kamar 1) | `"wc1_light"` | Relay | **GPIO 21** | `LOW` = ON, `HIGH` = OFF |
| **8** | Lampu Kamar Tidur 2 | `"bedroom2_light"` | Relay | **GPIO 22** | `LOW` = ON, `HIGH` = OFF |
| **9** | Lampu Kamar Tidur 3 | `"bedroom3_light"` | Relay | **GPIO 23** | `LOW` = ON, `HIGH` = OFF |
| **10** | Lampu Dapur | `"kitchen_light"` | Relay | **GPIO 25** | `LOW` = ON, `HIGH` = OFF |
| **11** | Kipas Dapur | `"kitchen_fan"` | PWM Driver | **GPIO 33** | PWM Ch 2 (Duty: 0, 85, 170, 255) |
| **12** | Lampu WC 2 (Luar / Umum) | `"wc2_light"` | Relay | **GPIO 26** | `LOW` = ON, `HIGH` = OFF |

---

## ⚡ 3. Karakteristik Elektronika & Wiring

### A. Modul Relay (Active LOW)
Mayoritas modul relay 4/8/16 channel di pasaran bekerja secara **Active LOW**:
- **Menyalakan Relay (ON):** Berikan tegangan `LOW` (0V):
  ```cpp
  digitalWrite(PIN, LOW); // Relay Aktif / Lampu Nyala
  ```
- **Mematikan Relay (OFF):** Berikan tegangan `HIGH` (3.3V):
  ```cpp
  digitalWrite(PIN, HIGH); // Relay Mati / Lampu Padam
  ```

### B. Kontrol Kecepatan Kipas (PWM)
Kipas DC dikontrol menggunakan transistor/MOSFET driver dengan sinyal PWM:
- **Frekuensi PWM:** `5000 Hz`
- **Resolusi PWM:** `8-bit` (nilai `0` s/d `255`)
- **Tingkat Kecepatan:**
  - `Speed 0` (Mati) : Duty cycle `0`
  - `Speed 1` (Pelan): Duty cycle `85` (33%)
  - `Speed 2` (Sedang): Duty cycle `170` (66%)
  - `Speed 3` (Cepat): Duty cycle `255` (100%)

---

## 📦 4. Library Arduino IDE yang Wajib Diinstall

Buka **Arduino IDE** -> Menu **Tools** -> **Manage Libraries...** (`Ctrl + Shift + I` / `Cmd + Shift + I`), lalu cari dan install:

1. **`WebSockets`** oleh *Markus Sattler*
2. **`ArduinoJson`** oleh *Benoit Blanchon* (Versi 6 atau 7)

---

## 💬 5. Format Protokol Komunikasi JSON

Komunikasi antara ESP32 dan Cloud menggunakan JSON:

### A. Perintah Diterima oleh ESP32 dari Web (Incoming JSON)

1. **Kontrol Lampu:**
   ```json
   {
     "device": "living_light",
     "state": 1
   }
   ```
   *(state: 1 = Nyala, state: 0 = Mati)*

2. **Kontrol Kipas:**
   ```json
   {
     "device": "living_fan",
     "state": 1,
     "speed": 2
   }
   ```
   *(speed: 1, 2, atau 3)*

3. **Permintaan Sinkronisasi Awal dari Server:**
   ```json
   {
     "action": "getState"
   }
   ```

---

### B. Laporan yang Dikirim ESP32 ke Server (Outgoing JSON)

1. **Saat Pertama Kali Konek (Greeting):**
   ```json
   {
     "from": "esp32",
     "msg": "ESP32 Online Siap Kontrol"
   }
   ```

2. **Sinkronisasi Seluruh Status Pin (`sendAllStates`):**
   ```json
   {
     "from": "esp32",
     "devices": [
       { "id": "lobby_light", "state": 0 },
       { "id": "living_light", "state": 0 },
       { "id": "living_fan", "state": 0, "speed": 0 },
       { "id": "family_light", "state": 0 },
       { "id": "family_fan", "state": 0, "speed": 0 },
       { "id": "bedroom1_light", "state": 0 },
       { "id": "wc1_light", "state": 0 },
       { "id": "bedroom2_light", "state": 0 },
       { "id": "bedroom3_light", "state": 0 },
       { "id": "kitchen_light", "state": 0 },
       { "id": "kitchen_fan", "state": 0, "speed": 0 },
       { "id": "wc2_light", "state": 0 }
     ]
   }
   ```

3. **Telemetri / Heartbeat (Tiap 5 Detik):**
   ```json
   {
     "from": "esp32",
     "telemetry": {
       "uptimeSec": 45,
       "rssi": -62,
       "freeHeap": 178240
     }
   }
   ```
   *(Kirim telemetri ini agar indikator navbar web otomatis menyala **HIJAU SOLID (ESP32: Online)**)*

---

## 🚀 6. Struktur Dasar Kode `.ino` (Contoh Starter)

```cpp
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

const char* ssid     = "NAMA_WIFI_ATAU_HOTSPOT";
const char* password = "PASSWORD_WIFI";

const char* vps_host = "smarthome.manajemensystem.my.id";
const int   vps_port = 8005;

WebSocketsClient webSocket;

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.println("[WS] Terhubung ke Cloud VPS!");
      webSocket.sendTXT("{\"from\":\"esp32\",\"msg\":\"ESP32 Online Siap Kontrol\"}");
      break;

    case WStype_DISCONNECTED:
      Serial.println("[WS] Terputus. Menghubungkan ulang...");
      break;

    case WStype_TEXT: {
      JsonDocument doc;
      deserializeJson(doc, payload);
      if (doc["device"]) {
        const char* dev = doc["device"];
        int state = doc["state"];
        Serial.printf("Perintah: %s -> %d\n", dev, state);
        // Eksekusi digitalWrite pin sesuai pemetaan tabel
      }
      break;
    }
    default: break;
  }
}

void setup() {
  Serial.begin(115200);
  // Setup GPIO Relay & PWM di sini...

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Terhubung!");

  // Hubungkan WebSocket ke Port 8005
  webSocket.begin(vps_host, vps_port, "/?role=device");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void loop() {
  webSocket.loop();
}
```

---

## 💡 Troubleshooting Cepat
1. **ESP32 Gagal Konek ke WiFi:**
   - Pastikan frekuensi WiFi adalah **2.4 GHz** (ESP32 tidak mendukung WiFi 5 GHz).
2. **Indikator di Web Masih Merah (ESP32: Offline):**
   - Pastikan ESP32 mengirim `/?role=device` pada path URL `webSocket.begin(...)`.
   - Pastikan ESP32 mengirim pesan JSON telemetri / greeting pertama kali.
3. **Relay Terbalik (Nyala saat di web Mati):**
   - Cukup ubah definisi konstanta `#define RELAY_ON LOW` dan `#define RELAY_OFF HIGH`.
