# Panduan Deployment ke GitHub & Vercel

Berikut adalah langkah-langkah untuk menjalankan kode ini 100% berfungsi di GitHub dan Vercel.

## 1. Persiapan GitHub

1.  Buat repository baru di GitHub (misal: `jhnz-suite`).
2.  Push kode ini ke repository tersebut:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git branch -M main
    git remote add origin https://github.com/USERNAME/REPO_NAME.git
    git push -u origin main
    ```

## 2. Persiapan Firebase

Aplikasi ini menggunakan Firebase untuk database dan autentikasi.

1.  Buka [Firebase Console](https://console.firebase.google.com/).
2.  Buat project baru.
3.  Aktifkan **Authentication** (Email/Password).
4.  Aktifkan **Firestore Database** (Mode Test atau Production).
5.  Atur **Firestore Rules** di tab Rules:
    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /{document=**} {
          allow read, write: if true; // Hati-hati, ini untuk development. Untuk production gunakan: if request.auth != null;
        }
      }
    }
    ```
6.  Dapatkan konfigurasi Firebase (Project Settings > General > Your apps > Web app).

## 3. Deployment ke Vercel

1.  Buka [Vercel Dashboard](https://vercel.com/dashboard).
2.  Klik **Add New...** > **Project**.
3.  Import repository GitHub yang baru dibuat.
4.  Di bagian **Environment Variables**, tambahkan variabel berikut (ambil dari konfigurasi Firebase):

    | Key | Value |
    | --- | --- |
    | `VITE_FIREBASE_API_KEY` | `AIzaSy...` |
    | `VITE_FIREBASE_AUTH_DOMAIN` | `project-id.firebaseapp.com` |
    | `VITE_FIREBASE_PROJECT_ID` | `project-id` |
    | `VITE_FIREBASE_STORAGE_BUCKET` | `project-id.firebasestorage.app` |
    | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456...` |
    | `VITE_FIREBASE_APP_ID` | `1:123456...` |
    | `VITE_IMGBB_API_KEY` | `0e0e532ac5784532b979921770cfdc74` (atau API key Anda sendiri) |

5.  Klik **Deploy**.

## 4. Konfigurasi Fitur Website Builder (PENTING)

Agar fitur "Website Builder" (deploy ke Netlify) berfungsi:

1.  Buka aplikasi yang sudah dideploy di Vercel.
2.  Login sebagai **Superadmin** (Anda perlu mengubah role user Anda menjadi `superadmin` di Firestore secara manual pertama kali, atau gunakan akun default jika ada).
    *   Cara manual: Buka Firestore > collection `users` > cari dokumen user Anda > ubah field `role` menjadi `superadmin`.
3.  Masuk ke halaman **Admin Panel** (`/admin`).
4.  Pilih menu **Netlify Deploy**.
5.  Masukkan **Netlify Access Token** Anda.
    *   Dapatkan token di: [Netlify User Settings > Applications > Personal access tokens](https://app.netlify.com/user/applications#personal-access-tokens).
6.  Simpan konfigurasi.

Sekarang fitur Website Builder akan dapat mendeploy website user secara otomatis ke akun Netlify Anda!

## 5. Deployment Backend (Opsional - Untuk Fitur WhatsApp)

**PENTING:** Fitur WhatsApp Automation menggunakan library `Baileys` yang membutuhkan server yang terus menyala (persistent). **Fitur ini TIDAK AKAN BERJALAN di Vercel** karena Vercel adalah platform serverless/static.

Jika Anda ingin fitur WhatsApp berfungsi 100%, Anda memiliki dua opsi:

### Opsi A: Deploy Full Stack ke VPS / Railway / Render (Rekomendasi untuk Fitur Penuh)

Alih-alih Vercel, deploy seluruh aplikasi ini ke layanan yang mendukung Node.js server, seperti **Railway**, **Render**, atau **VPS (DigitalOcean/Ubuntu)**.

**Cara Deploy ke Railway:**
1.  Buka [Railway.app](https://railway.app/).
2.  Login dengan GitHub.
3.  Klik **New Project** > **Deploy from GitHub repo**.
4.  Pilih repository `jhnz-suite` Anda.
5.  Tambahkan Environment Variables (sama seperti langkah Vercel di atas).
6.  Railway akan otomatis mendeteksi `package.json` dan menjalankan perintah `start` (`tsx server.ts`).
7.  Aplikasi Anda akan berjalan 100% termasuk fitur WhatsApp!

### Opsi B: Vercel Saja (Tanpa WhatsApp)

Jika Anda tetap ingin menggunakan Vercel:
1.  Ikuti langkah deployment Vercel di atas.
2.  Fitur Website Builder, Linktree, Payment, Testimonial akan berfungsi normal.
3.  **Fitur WhatsApp TIDAK akan berfungsi.**

## 6. Troubleshooting

*   **Error "Missing or insufficient permissions"**: Cek Firestore Rules Anda.
*   **Error Deploy Netlify**: Pastikan Access Token Netlify valid dan akun Netlify Anda aktif.
*   **Gambar tidak muncul**: Pastikan API Key ImgBB valid.
*   **WhatsApp tidak connect**: Pastikan Anda mendeploy ke Railway/VPS, bukan Vercel.
