# PENTING: Perbaikan Error Index Firestore

Jika Anda melihat error seperti ini saat membuka halaman Linktree atau Payment:

> "The query requires an index. You can create it here: https://console.firebase.google.com/..."

Ini **BUKAN** bug pada kode, melainkan persyaratan keamanan dan performa dari Firebase Firestore. Anda **WAJIB** membuat index tersebut secara manual (hanya sekali).

## Cara Memperbaiki

1.  **Buka Halaman yang Error** (Linktree atau Payment Page Anda).
2.  **Lihat Pesan Error** yang muncul di layar (sekarang sudah saya perbaiki agar pesan errornya lengkap).
3.  Di dalam pesan error tersebut, ada **LINK PANJANG** yang dimulai dengan `https://console.firebase.google.com/...`.
4.  **KLIK LINK TERSEBUT**.
5.  Anda akan diarahkan ke Firebase Console.
6.  Akan muncul popup "Create composite index".
7.  Klik tombol **Create Index**.
8.  Tunggu beberapa menit (biasanya 2-5 menit) sampai statusnya "Enabled".
9.  Refresh halaman website Anda. Error akan hilang.

## Mengapa Ini Terjadi?

Aplikasi ini melakukan query database yang kompleks (misalnya: "Ambil semua link yang `aktif=true` DAN urutkan berdasarkan `urutan` secara `ascending`"). Firebase mewajibkan kita membuat "Index" agar pencarian data seperti ini tetap cepat meskipun datanya ada ribuan.
