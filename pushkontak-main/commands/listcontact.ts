import fs from 'fs';
import path from 'path';

export default async function listcontactCommand(sock: any, msg: any, args: string[], userId: string) {
  const chatJid = msg.key.remoteJid;
  if (!chatJid) return;

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

  if (contacts.length === 0) {
    await sock.sendMessage(chatJid, { text: '📒 Daftar kontak kosong.' }, { quoted: msg });
    return;
  }

  let responseText = '📒 *DAFTAR KONTAK*\n\n';
  contacts.forEach((c, index) => {
    responseText += `${index + 1}. ${c.name} - ${c.number}\n`;
  });

  await sock.sendMessage(chatJid, { text: responseText }, { quoted: msg });
}
