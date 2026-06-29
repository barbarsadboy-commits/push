import { WASocket, proto } from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";

// 1. TAMBAHKAN VARIABLE GLOBAL
let isPushActive = false;
let isProcessing = false;
let currentIndex = 0;
let contacts: string[] = []; // array nomor target
let pushText = ""; // To store the message to send

// Helper for delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// 2. MODIFIKASI LOGIKA PUSH KONTAK
async function pushContacts(sock: WASocket, senderId: string) {
  // Gunakan: isProcessing = true saat push mulai
  isProcessing = true;
  
  try {
    // Gunakan loop dari currentIndex sampai contacts.length
    for (; currentIndex < contacts.length; currentIndex++) {
      // Jika isPushActive == false: hentikan proses (break loop)
      if (!isPushActive) {
        console.log("PUSH STOPPED ⛔");
        await sock.sendMessage(senderId, { text: "🛑 Push kontak dihentikan sementara (Paused)." });
        break;
      }

      const targetJid = contacts[currentIndex];
      
      try {
        const number = senderId.split('@')[0].split(':')[0];
        const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:My Contact\nTEL;type=CELL;type=VOICE;waid=${number}:${number}\nEND:VCARD`;
        let sent = false;
        let isSent = false;
        let retries = 0;
        const maxRetries = 3;

        while (!sent && retries < maxRetries) {
          try {
            await sock.sendMessage(targetJid, { 
              contacts: {
                displayName: "Contact",
                contacts: [{ vcard }]
              }
            });
            
            if (pushText) {
              await sock.sendMessage(targetJid, { text: pushText });
            }
            
            sent = true;
            isSent = true;
            console.log(`PROGRESS: ${currentIndex + 1} / ${contacts.length}`);
            
            // Integrasi Database Blast
            const targetNumber = targetJid.split('@')[0].split(':')[0];
            try {
              const blastService = await import("../src/services/blastService.ts");
              await blastService.addNumberToBlastDb(targetNumber);
            } catch (err) {
              console.error("Gagal save ke blast DB:", err);
            }

          } catch (err) {
            retries++;
            if (retries >= maxRetries) {
               console.error(`Gagal mengirim ke ${targetJid} setelah ${maxRetries} kali:`, err);
            } else {
              await delay(2000 * retries); // Exponential delay
            }
          }
        }
      } catch (err) {
        console.error(`Gagal mengirim ke ${targetJid}:`, err);
      }

      // Tambahkan delay 1-2 detik setiap pengiriman
      const delayMs = Math.floor(Math.random() * 1000) + 1000; // 1000 to 2000 ms
      await delay(delayMs);
    }

    // Setelah loop selesai semua:
    if (currentIndex >= contacts.length) {
      console.log("PUSH SELESAI ✅");
      await sock.sendMessage(senderId, { text: "✅ Push kontak telah selesai semua!" });
      // Reset:
      currentIndex = 0;
      isPushActive = false;
      isProcessing = false;
      contacts = [];
    } else {
      // Loop broken due to stop
      isProcessing = false;
    }
  } catch (error) {
    console.error("Error in pushContacts:", error);
    isProcessing = false;
    isPushActive = false;
  }
}

export default async function pushkontakCommand(
  sock: WASocket,
  msg: proto.IWebMessageInfo,
  args: string[],
  userId: string
) {
  const senderId = msg.key.remoteJid;
  if (!senderId) return;

  const commandAction = args[0]?.toLowerCase();

  if (commandAction === "start") {
    // 3. LOGIKA START PUSH
    const text = args.slice(1).join(" ");
    
    // Jika isProcessing == true: Jangan jalankan ulang (hindari double run)
    if (isProcessing) {
      await sock.sendMessage(senderId, { text: "⚠️ Push kontak sedang berjalan!" }, { quoted: msg as any });
      return;
    }

    // If starting fresh (not resuming)
    if (currentIndex === 0) {
      if (!text) {
        await sock.sendMessage(senderId, { text: "❌ Masukkan teks pesan!\nContoh: .pushkontak start Halo save back ya" }, { quoted: msg as any });
        return;
      }
      
      // Load contacts from group if in group, or from database
      if (senderId.endsWith('@g.us')) {
        try {
          const meta = await sock.groupMetadata(senderId);
          contacts = meta.participants.map(p => p.id);
          pushText = text;
        } catch (e) {
          await sock.sendMessage(senderId, { text: "❌ Gagal mengambil member grup." }, { quoted: msg as any });
          return;
        }
      } else {
        await sock.sendMessage(senderId, { text: "❌ Fitur start awal harus dilakukan di dalam grup untuk mengambil target member." }, { quoted: msg as any });
        return;
      }
    } else {
      // Resuming, can update text if provided, otherwise keep old text
      if (text) pushText = text;
    }

    // Set: isPushActive = true
    isPushActive = true;

    // Jika sebelumnya berhenti: lanjut dari currentIndex terakhir (JANGAN reset)
    if (currentIndex > 0) {
      console.log("PUSH RESUMED 🔁");
      await sock.sendMessage(senderId, { text: `🔁 Melanjutkan push kontak dari urutan ke-${currentIndex + 1}...` }, { quoted: msg as any });
    } else {
      console.log("PUSH STARTED 🔥");
      await sock.sendMessage(senderId, { text: `🔥 Memulai push kontak ke ${contacts.length} target...` }, { quoted: msg as any });
    }

    // Jalankan pushContacts()
    pushContacts(sock, senderId);

  } else if (commandAction === "stop") {
    // 4. LOGIKA STOP PUSH
    if (!isPushActive) {
      await sock.sendMessage(senderId, { text: "⚠️ Push kontak tidak sedang berjalan." }, { quoted: msg as any });
      return;
    }

    // Set: isPushActive = false
    isPushActive = false;
    // Jangan reset currentIndex
    // Proses akan berhenti otomatis di loop berikutnya
    await sock.sendMessage(senderId, { text: "⏳ Menghentikan push kontak... (akan berhenti setelah pesan terakhir terkirim)" }, { quoted: msg as any });

  } else {
    await sock.sendMessage(senderId, { 
      text: "❌ Format salah!\n\nGunakan:\n.pushkontak start <teks>\n.pushkontak stop\n.pushkontak start (untuk resume)" 
    }, { quoted: msg as any });
  }
}
