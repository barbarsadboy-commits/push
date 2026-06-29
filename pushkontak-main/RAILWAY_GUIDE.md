# Panduan Railway Selanjutnya

Berdasarkan screenshot Anda, silakan ikuti langkah ini:

1.  **Klik Project "handsome-abundance"**
    *   Itu adalah project aplikasi Anda yang sedang berjalan di Railway.
    *   Klik kotak bertuliskan **"handsome-abundance"** tersebut.

2.  **Setelah Masuk ke Project:**
    *   Anda akan melihat kotak service (biasanya bernama repo GitHub Anda). Klik kotak itu.
    *   Di menu atas, cari tab **Settings** -> **Domains** -> **Custom Domain**.
    *   Masukkan domain Anda: `zynderjhnz.jhnz.online`.
    *   Railway akan memberikan instruksi DNS (CNAME/A Record). Copy settingan itu ke penyedia domain Anda.

3.  **Cek Environment Variables:**
    *   Masih di dalam project, klik tab **Variables**.
    *   Pastikan semua variabel (Firebase, ImgBB, dll) sudah ada di sana.

Dengan melakukan ini, domain `zynderjhnz.jhnz.online` akan mengarah ke server Railway yang mendukung fitur WhatsApp, bukan ke Vercel lagi.
