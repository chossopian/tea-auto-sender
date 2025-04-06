
# ☕ Tea Testnet Auto Token & Native Coin Sender

Script Node.js ini secara otomatis mengirim **token ERC-20 dan native coin (TEA)** dari banyak wallet ke banyak address di jaringan **Tea Testnet** (`chainId: 10218`). Dilengkapi dengan fitur anti-duplikat, retry otomatis, delay acak, dan dukungan pengulangan otomatis setiap 24 jam.

---

## ⚙️ Fitur Utama

- 🔁 Kirim token & native coin secara otomatis ke banyak wallet
- 🔑 Multi-account sender (via banyak private key)
- ⏱️ Delay acak antara 5 - 20 detik
- 🔄 Looping otomatis setiap 24 jam
- 🧠 Anti-duplikat (tidak kirim ke address yang sudah pernah)
- 🚨 Retry otomatis jika transaksi gagal
- 💾 Log & data pengiriman tersimpan di file
- 🟢 Support PM2 (auto restart & auto-run di VPS/server)

---

## 🧱 Requirements

- Node.js v16+
- NPM
- PM2 (opsional)

---

## 📁 Struktur File

```
.
├── address.txt          # Daftar alamat tujuan
├── autoSender.js        # Script utama
├── tokens.json          # Konfigurasi token yang dikirim
├── sent.json            # Riwayat pengiriman (anti-duplikat)
├── .env                 # Konfigurasi rahasia (RPC, key, dll)
├── ecosystem.config.js  # Konfigurasi PM2
├── log.txt              # File log
└── README.md            # Dokumentasi
```

---

## 🔧 Setup Project

### 1. Clone dan install dependencies
```bash
git clone https://github.com/username/tea-auto-sender.git
cd tea-auto-sender
npm install
```

### 2. Buat file `.env`
```env
RPC_URL=https://tea-sepolia.g.alchemy.com/public
CHAIN_ID=10218
PRIVATE_KEYS=0xPRIVATEKEY1,0xPRIVATEKEY2

# Optional: untuk native coin random
NATIVE_MIN=0.005
NATIVE_MAX=0.01
NATIVE_PROBABILITY=0.3
```

### 3. Tambahkan file `address.txt`
Satu address per baris:
```
0xRecipientAddress1
0xRecipientAddress2
```

### 4. Tambahkan file `tokens.json`
```json
[
  {
    "address": "0xYourTokenAddress1",
    "min": 0.005,
    "max": 0.01
  },
  {
    "address": "0xYourTokenAddress2",
    "min": 0.002,
    "max": 0.006
  }
]
```

---

## 🚀 Menjalankan Script

### Manual:
```bash
node autoSender.js
```

### Otomatis pakai PM2:
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
```

🪟 **Catatan Windows**: `pm2 startup` tidak bisa jalan di Windows. Sebagai gantinya, gunakan Task Scheduler untuk auto-run `pm2 resurrect` saat booting.

---

## 📒 Log & Data

- Semua aktivitas tercatat di `log.txt`
- Transaksi yang sudah berhasil tercatat di `sent.json`
- Script akan otomatis berhenti 24 jam, lalu kirim ulang

---

## 📮 Contoh Log:
```
[2025-04-07T14:33:01Z] [0xFrom...] Sent 0.008 TEA to 0xTo... | TX: 0x123abc...
[2025-04-07T14:33:09Z] [0xFrom...] Sent 0.006 TOKEN to 0xTo... | TX: 0x456def...
```

---

## 💬 FAQ

**Q: Jaringan apa yang dipakai?**  
A: Script ini berjalan di jaringan [Tea Testnet](https://tea.xyz) (chainId: 10218).

**Q: Bisa mengirim token dan TEA sekaligus?**  
A: Ya! Token dipilih acak dari `tokens.json`, native coin (TEA) bisa dikirim secara acak juga.

**Q: Bisa dijalankan di VPS?**  
A: Sangat bisa! PM2 cocok digunakan di server Linux seperti Ubuntu (Free tier VPS seperti Oracle juga oke).

---

## ⚠️ Disclaimer

Script ini ditujukan untuk keperluan **testnet / development**. Jangan gunakan private key utama! Selalu pastikan wallet berisi dana uji coba saja.

---

## 🧑‍💻 Author

Made with ❤️ by [@chossopian](https://github.com/chossopian)

Feel free to fork and modify!
