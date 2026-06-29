# Panduan Mengatur Environment Variables di Railway.app

Berikut adalah langkah-langkah untuk mengatur Environment Variables agar aplikasi Anda (termasuk fitur WhatsApp) berjalan lancar di Railway.

## Langkah-langkah:

1.  **Buka Project di Railway**
    *   Masuk ke dashboard [Railway.app](https://railway.app/).
    *   Klik project yang sudah Anda buat/deploy.

2.  **Pilih Service**
    *   Klik kotak service aplikasi Anda (biasanya bernama sesuai repo GitHub Anda).

3.  **Buka Tab Variables**
    *   Di menu bagian atas, klik tab **Variables**.

4.  **Tambahkan Variable**
    *   Klik tombol **New Variable**.
    *   Masukkan **VARIABLE_NAME** (kiri) dan **VALUE** (kanan).
    *   Klik **Add**.

5.  **Daftar Variable Wajib:**

    Masukkan semua variable berikut satu per satu (sesuai data Firebase & ImgBB Anda):

    | Variable Name | Value (Contoh) |
    | :--- | :--- |
    | `VITE_FIREBASE_API_KEY` | `AIzaSy...` |
    | `VITE_FIREBASE_AUTH_DOMAIN` | `project-id.firebaseapp.com` |
    | `VITE_FIREBASE_PROJECT_ID` | `project-id` |
    | `VITE_FIREBASE_STORAGE_BUCKET` | `project-id.firebasestorage.app` |
    | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456...` |
    | `VITE_FIREBASE_APP_ID` | `1:123456...` |
    | `VITE_FIREBASE_MEASUREMENT_ID` | `G-XXXXXX` (Opsional) |
    | `VITE_IMGBB_API_KEY` | `0e0e532...` (Dapatkan di api.imgbb.com) |
    | `PORT` | `3000` (Railway biasanya otomatis, tapi bisa diset manual jika perlu) |

6.  **Redeploy Otomatis**
    *   Setelah Anda menambahkan atau mengubah variable, Railway akan **otomatis melakukan redeploy** aplikasi Anda.
    *   Tunggu proses build selesai (bisa dilihat di tab **Deployments**).

## Tips Penting:

*   **Mode RAW:** Anda bisa menggunakan fitur "Raw Editor" di Railway untuk mempaste isi file `.env` sekaligus. Klik tombol **Raw Editor** di pojok kanan atas tab Variables, lalu paste semua isinya (format `KEY=VALUE`).
*   **Rahasia:** Jangan pernah share screenshot tab Variables ini ke publik karena berisi kunci rahasia aplikasi Anda.
