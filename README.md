# Kirimly — Share Files & Text Instantly

Kirimly adalah aplikasi web untuk berbagi file & teks langsung antar perangkat menggunakan teknologi WebRTC — tanpa upload ke server.

🌐 **Website**: [kirimly.my.id](https://kirimly.my.id)

## Fitur

- ⚡ **Transfer Cepat** — File dikirim langsung antar perangkat (peer-to-peer)
- 📋 **Share Teks/Clipboard** — Kirim teks atau clipboard ke perangkat lain secara instan
- 🔒 **Aman & Privat** — Tidak ada data yang melewati server eksternal
- 📱 **Multi-Platform** — Bekerja di desktop dan mobile browser
- 🎯 **Tanpa Instalasi** — Cukup buka browser, langsung pakai
- 🔍 **Auto-Discovery** — Perangkat terdeteksi otomatis di jaringan yang sama

## Cara Menggunakan

1. Buka [kirimly.my.id](https://kirimly.my.id) di browser
2. Pastikan perangkat lain terhubung ke jaringan WiFi yang sama
3. Perangkat akan otomatis terdeteksi
4. Pilih perangkat tujuan, lalu kirim file atau teks

## Teknologi

- **React** — Framework UI
- **Vite** — Build tool
- **WebRTC (PeerJS)** — Transfer data peer-to-peer
- **WebSocket** — Device discovery & signaling

## Pengembangan

```bash
# Install dependencies
npm install

# Jalankan development server
npm run dev

# Build untuk production
npm run build

# Jalankan production server
npm start
```

## Catatan

- Pastikan AP Isolation dimatikan di router
- Semua perangkat harus membuka URL yang sama
- Transfer file & teks terjadi langsung antar perangkat (P2P)

## Lisensi

MIT — Made with ❤️ by Faizal
