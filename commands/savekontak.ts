import { WASocket, proto } from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";

export default async function savekontakCommand(
  sock: WASocket,
  msg: proto.IWebMessageInfo,
  args: string[],
  userId: string
) {
  const senderId = msg.key.remoteJid;
  if (!senderId) return;

  const reply = async (text: string) => {
    await sock.sendMessage(senderId, { text }, { quoted: msg as any });
  };

  // Check if it's a group
  if (!senderId.endsWith('@g.us')) {
    return reply(`Fitur ini hanya bisa di dalam grup.`);
  }

  try {
    let meta = await sock.groupMetadata(senderId);
    let members = meta.participants.map(p => p.id); // JID asli

    if (!members.length) return reply("Tidak ada member dalam grup.");

    await reply(`📥 Mengambil semua kontak...\nTotal: ${members.length} member\nSedang membuat file vCard...`);

    let vcfContent = "";

    for (let jid of members) {
        let number = jid.split("@")[0];

        vcfContent += `BEGIN:VCARD\nVERSION:3.0\nFN:${number}\nTEL;type=CELL;waid=${number}:${number}\nEND:VCARD\n\n`;
    }

    // Simpan ke file
    const safeSubject = meta.subject ? meta.subject.replace(/\W+/g, "_") : "Group";
    let filename = `contact-${safeSubject}.vcf`;
    let filepath = path.join(process.cwd(), filename);

    fs.writeFileSync(filepath, vcfContent);

    // Send to the person who requested it
    const requesterJid = msg.key.participant || msg.key.remoteJid;
    if (requesterJid) {
      await sock.sendMessage(requesterJid, {
          document: fs.readFileSync(filepath),
          mimetype: "text/vcard",
          fileName: filename,
          caption: `Berhasil mengambil ${members.length} kontak dari grup ${meta.subject}`
      }, { quoted: msg as any });
    }

    // Clean up file
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

  } catch (error: any) {
    console.error("Error in savekontak:", error);
    await reply(`❌ Gagal mengambil kontak: ${error.message}`);
  }
}
