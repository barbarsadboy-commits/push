import fs from 'fs';
import path from 'path';

export default async function saveCommand(sock: any, msg: any, args: string[], userId: string) {
  const chatJid = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.key.remoteJid;
  if (!chatJid || !senderJid) return;

  // 3. AMBIL DATA USER
  const number = senderJid.split('@')[0].split(':')[0];
  const name = args.join(' ').trim();

  // 4. VALIDASI INPUT
  if (!name) {
    await sock.sendMessage(chatJid, { text: '❌ Masukkan nama kontak\nContoh: .save Budi' }, { quoted: msg });
    return;
  }

  // 5. CEK DUPLIKAT
  const dbDir = path.join(process.cwd(), 'database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, 'contacts.json');
  
  let contacts: any[] = [];
  if (fs.existsSync(dbPath)) {
    try {
      contacts = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {
      contacts = [];
    }
  }

  let exists = contacts.find(c => c.number === number);

  if (exists) {
    await sock.sendMessage(chatJid, { text: '⚠️ Nomor ini sudah pernah disimpan' }, { quoted: msg });
    return;
  }

  // 6. SIMPAN KE DATABASE
  contacts.push({
    name: name,
    number: number,
    date: new Date().toISOString()
  });

  fs.writeFileSync(dbPath, JSON.stringify(contacts, null, 2));

  // 7. BUAT VCARD (INI KUNCI UTAMA)
  const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL;type=CELL;type=VOICE;waid=${number}:${number}\nEND:VCARD`;

  // 8. KIRIM KONTAK KE USER
  await sock.sendMessage(chatJid, {
    contacts: {
      displayName: name,
      contacts: [{ vcard }]
    }
  }, { quoted: msg });

  // 9. RESPONSE USER
  await sock.sendMessage(chatJid, {
    text: `✅ Kontak berhasil dibuat\n\nNama: ${name}\nNomor: ${number}\n\nSilakan tekan "Tambah ke Kontak"`
  }, { quoted: msg });
}
