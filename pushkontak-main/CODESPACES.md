# Panduan Menjalankan di GitHub Codespaces

Ya, Anda BISA menggunakan GitHub Codespaces! Ini sangat mirip dengan menjalankan di `localhost` komputer Anda sendiri, tetapi di cloud.

Fitur **WhatsApp Automation** JUGA AKAN BERJALAN di sini selama Codespaces aktif, karena Codespaces menyediakan server (container) yang terus menyala, tidak seperti Vercel (serverless).

## Langkah-langkah:

1.  **Buka Repository di GitHub**
    -   Pastikan kode ini sudah ada di repository GitHub Anda.
    -   Klik tombol hijau **Code** > tab **Codespaces** > **Create codespace on main**.

2.  **Tunggu Setup Selesai**
    -   GitHub akan menyiapkan environment (container) untuk Anda. Ini mungkin memakan waktu beberapa menit pertama kali.
    -   Terminal akan terbuka di bagian bawah.

3.  **Install Dependencies**
    -   Di terminal Codespaces, jalankan:
        ```bash
        npm install
        ```

4.  **Setup Environment Variables**
    -   Buat file `.env` baru (atau rename `.env.example` jadi `.env`).
    -   Isi konfigurasi Firebase dan ImgBB Anda di sana:
        ```env
        VITE_FIREBASE_API_KEY=...
        VITE_FIREBASE_AUTH_DOMAIN=...
        # ... dst (lihat .env.example)
        VITE_IMGBB_API_KEY=...
        ```

5.  **Jalankan Aplikasi**
    -   Jalankan perintah development:
        ```bash
        npm run dev
        ```
    -   Atau jika ingin simulasi production:
        ```bash
        npm run build
        npm start
        ```

6.  **Akses Aplikasi**
    -   Codespaces akan mendeteksi port `3000` yang aktif.
    -   Klik tombol **Open in Browser** yang muncul di pojok kanan bawah, atau buka tab **Ports** dan klik icon bola dunia (Open in Browser) pada port 3000.

## Catatan Penting untuk Fitur WhatsApp:

*   **Scan QR Code:** Saat Anda membuka aplikasi di browser, masuk ke menu WhatsApp. QR Code akan muncul dan **BISA discan** karena server berjalan di background.
*   **Persistent Session:** Sesi WhatsApp akan tersimpan di folder `sessions/` di dalam Codespaces.
*   **Timeout:** GitHub Codespaces akan **mati otomatis** (suspend) jika tidak aktif (biasanya setelah 30 menit menutup tab). Saat Codespaces mati, bot WhatsApp juga akan mati.
*   **Solusi:** Codespaces cocok untuk **development** dan **testing** bot WhatsApp. Untuk production (bot nyala 24 jam), Anda tetap disarankan menggunakan VPS atau Railway seperti dijelaskan di `DEPLOY.md`.
