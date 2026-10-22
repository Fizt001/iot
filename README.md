# 🏠 Smart Home ESP32 - Cloud IoT Dashboard & Denah 2D Interaktif

Dashboard Smart Home modern berbasis Web PWA dengan visualisasi **Denah Rumah 2D Interaktif (SVG)**, kontrol ruangan responsif, suara efek, voice command bahasa Indonesia, dan **WebSocket Relay 2-Arah** untuk menghubungkan perangkat keras ESP32 fisik secara real-time via Internet/VPS.

![Smart Home Dashboard](icons/icon-512x512.png)

---

## 🌟 Fitur Utama

- 📐 **Denah Rumah 2D Interaktif (SVG)**: Denah arsitektural lengkap (Teras, Ruang Tamu, Ruang Keluarga, 3 Kamar Tidur, 2 WC, Dapur, Halaman Belakang). Titik lampu berpendar hangat saat menyala, dan baling-baling kipas berputar sesuai kecepatan (Level 1, 2, 3).
- 📱 **Mobile-First & PWA**: Tampilan presisi untuk HP (iPhone / Android), tombol 50-50, fitur lipat/buka (*accordion*) tiap ruangan agar hemat scroll, dan bisa dipasang langsung ke layar utama (*Add to Home Screen*).
- ⚡ **WebSocket Full-Duplex Real-Time**: Latensi super rendah (<10ms). Sinkronisasi dua arah instan antara browser dan ESP32 fisik.
- ☁️ **Cloud Relay Server (VPS Ready)**: ESP32 dapat tersambung melalui Hotspot HP / WiFi rumah ke server VPS di internet tanpa memerlukan IP Publik statis di rumah.
- 🎙️ **Voice Control (Bahasa Indonesia)**: Perintah suara langsung dari browser (contoh: *"Nyalakan lampu ruang tamu"*, *"Matikan semua lampu"*).
- 🔊 **Web Audio Synthesizer**: Efek suara tactile klik saklar, motor kipas, dan feedback suara tanpa file audio eksternal.

---

## 🔌 Pemetaan Pin GPIO ESP32 (12 Perangkat)

| No | Perangkat | Tipe | Pin GPIO ESP32 | Keterangan |
|---|---|---|---|---|
| 1 | Lampu Teras / Lobby Depan | Relay | **GPIO 16** | Relay Active LOW |
| 2 | Lampu Ruang Tamu | Relay | **GPIO 17** | Relay Active LOW |
| 3 | Kipas Ruang Tamu | PWM | **GPIO 27** | PWM Channel 0 (0-255) |
| 4 | Lampu Ruang Keluarga | Relay | **GPIO 18** | Relay Active LOW |
| 5 | Kipas Ruang Keluarga | PWM | **GPIO 32** | PWM Channel 1 (0-255) |
| 6 | Lampu Kamar Tidur 1 (Utama) | Relay | **GPIO 19** | Relay Active LOW |
| 7 | Lampu WC 1 (Dalam Kamar 1) | Relay | **GPIO 21** | Relay Active LOW |
| 8 | Lampu Kamar Tidur 2 | Relay | **GPIO 22** | Relay Active LOW |
| 9 | Lampu Kamar Tidur 3 | Relay | **GPIO 23** | Relay Active LOW |
| 10 | Lampu Dapur | Relay | **GPIO 25** | Relay Active LOW |
| 11 | Kipas Dapur | PWM | **GPIO 33** | PWM Channel 2 (0-255) |
| 12 | Lampu WC 2 (Luar / Umum) | Relay | **GPIO 26** | Relay Active LOW |

---

## 🌐 Arsitektur Sistem

```text
[ Browser HP / Laptop ]  <=== (WebSocket WSS) ===>  [ VPS Cloud Relay (server.js) ]
 (Kontrol dari Mana Saja)                                     ^
                                                              |
                                                      (WebSocket Client)
                                                              v
                                                    [ ESP32 Hardware Fisik ]
                                                  (Terhubung Hotspot HP / WiFi)
                                                              |
                                                +-------------+-------------+
                                                |                           |
                                         [ 9x Relay Lampu ]          [ 3x PWM Kipas ]
```

---

## 🚀 Panduan Deploy di VPS

### Opsi 1: Menggunakan Node.js & PM2 (Rekomendasi)

1. Clone repositori ke VPS:
   ```bash
   git clone https://github.com/Fizt001/iot.git
   cd iot
   ```
2. Pasang dependensi:
   ```bash
   npm install
   ```
3. Jalankan server dengan PM2 (agar jalan terus di background):
   ```bash
   npm install -g pm2
   pm2 start server.js --name "smarthome-esp32"
   pm2 save
   pm2 startup
   ```
4. Buka di browser: `http://IP_VPS_ANDA:8080`

### Opsi 2: Menggunakan Docker

```bash
git clone https://github.com/Fizt001/iot.git
cd iot
docker compose up -d
```

### Konfigurasi Nginx Reverse Proxy (Opsional untuk Domain & SSL)

Jika Anda ingin mengakses melalui domain dengan HTTPS (`https://iot.domainanda.com`), gunakan konfigurasi Nginx berikut:

```nginx
server {
    server_name iot.domainanda.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
```

---

## 🛠️ Panduan Flash ke ESP32 Fisik

1. Buka **Arduino IDE**.
2. Buka file firmware di: `arduino/smart_home_esp32/smart_home_esp32.ino`.
3. Pasang 2 library melalui menu **Sketch > Include Library > Manage Libraries**:
   - **`WebSockets`** by Markus Sattler
   - **`ArduinoJson`** by Benoit Blanchon (v6 atau v7)
4. Sesuaikan konfigurasi di bagian atas file:
   ```cpp
   const char* ssid     = "NAMA_HOTSPOT_HP_ANDA";
   const char* password = "PASSWORD_HOTSPOT";
   const char* vps_host = "IP_VPS_ANDA"; // Contoh: "103.xxx.xxx.xxx"
   const int   vps_port = 8080;
   ```
5. Pilih Board: **ESP32 Dev Module** dan pilih Port COM yang sesuai.
6. Klik **Upload**.
7. Buka **Serial Monitor** (115200 baud) untuk melihat status koneksi ESP32 ke hotspot HP dan VPS.

---

## 👤 Pengembang

- **GitHub**: [@Fizt001](https://github.com/Fizt001)
- **Repository**: [https://github.com/Fizt001/iot.git](https://github.com/Fizt001/iot.git)

Lisensi: MIT
