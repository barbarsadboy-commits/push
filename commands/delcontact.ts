import fs from 'fs';
import path from 'path';

export default async function delcontactCommand(sock: any, msg: any, args: string[], userId: string) {
  const chatJid = msg.key.remoteJid;
  if (!chatJid) return;

  let numberToDelete = args[0];
  if (!numberToDelete) {
    await sock.sendMessage(chatJid, { text: '❌ Format salah. Gunakan: .delcontact 628123456789' }, { quoted: msg });
    return;
  }

  numberToDelete = numberToDelete.replace(/\D/g, '');
  if (numberToDelete.startsWith('0')) {
    numberToDelete = '62' + numberToDelete.substring(1);
  }

  if (numberToDelete.length < 10 || numberToDelete.length > 15) {
    await sock.sendMessage(chatJid, { text: '❌ Nomor tidak valid.' }, { quoted: msg });
    return;
  }

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

  const initialLength = contacts.length;
  contacts = contacts.filter(c => c.number !== numberToDelete);

  if (contacts.length === initialLength) {
    await sock.sendMessage(chatJid, { text: `❌ Kontak dengan nomor ${numberToDelete} tidak ditemukan.` }, { quoted: msg });
    return;
  }

  fs.writeFileSync(dbPath, JSON.stringify(contacts, null, 2));
  await sock.sendMessage(chatJid, { text: `✅ Kontak dengan nomor ${numberToDelete} berhasil dihapus.` }, { quoted: msg });
}
