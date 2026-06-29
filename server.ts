import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { getPajakPrice, getUpgradePrice, HARGA } from "./src/sethrga";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  type WASocket,
  Browsers,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";
import fs from "fs";
import path from "path";
import os from "os";
import { Telegraf, Markup } from "telegraf";
import axios from "axios";
import crypto from "crypto";
import qs from "qs";
import Jimp from "jimp";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, getDocs, query, where, writeBatch, serverTimestamp, increment, onSnapshot, orderBy, limit, addDoc, deleteDoc } from "firebase/firestore";
import cron from "node-cron";
import moment from "moment-timezone";
import "dotenv/config";
import * as contactService from "./src/services/contactService";
import * as sessionContactService from "./src/services/sessionContactService";
import { initPushControl, getPushStatus, setPushStatus } from "./src/services/pushControl";

// Initialize push control
initPushControl();

// Cron Job for Auto Expired Users (15th of every month at 00:00 WIB)
cron.schedule('0 0 15 * *', async () => {
  const now = moment().tz('Asia/Jakarta').format();
  console.log('Auto expired semua user:', now);

  try {
    const subDoc = await getDoc(doc(db, "settings", "subscription"));
    if (subDoc.exists() && subDoc.data().autoLock15 === false) {
      console.log('Auto Lock Tgl 15 is disabled in settings. Skipping.');
      return;
    }

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("role", "in", ["vip", "reseller", "dev"]));
    const querySnapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    querySnapshot.forEach((docSnap) => {
      batch.update(docSnap.ref, { status_active: false });
    });
    
    await batch.commit();
    console.log(`Successfully expired ${querySnapshot.size} users.`);
  } catch (error) {
    console.error("Error running auto expired cron job:", error);
  }
}, {
  timezone: "Asia/Jakarta"
});

// Cron Job for Auto Expired Promote-Paid (PP) Links (Executes every minute)

// ... existing code ...

// Firebase Config for Server
import { db } from "./src/config/firebase-server.ts";

import { bot, config, isOwner } from "./src/bot";

// Maintenance Middleware

// Default images for responses
const BOT_IMAGES = {
  WELCOME: "https://i.ibb.co.com/G4zHtFDg/file-000000003a9c71fa830bec1bb290a046.png",
  PAYMENT: "https://picsum.photos/seed/wa-bot-payment/800/400",
  STATUS: "https://picsum.photos/seed/wa-bot-status/800/400",
  OWNER: "https://picsum.photos/seed/wa-bot-owner/800/400",
  SUCCESS: "https://picsum.photos/seed/wa-bot-success/800/400",
  ERROR: "https://picsum.photos/seed/wa-bot-error/800/400",
  INFO: "https://picsum.photos/seed/wa-bot-info/800/400"
};

// Helper to send enhanced response with image and cool formatting
async function sendEnhancedResponse(ctx: any, text: string, imageKey: keyof typeof BOT_IMAGES = 'WELCOME', extra: any = {}) {
  const imageUrl = BOT_IMAGES[imageKey];
  const MAX_CAPTION_LENGTH = 1000; // Telegram photo caption limit is 1024
  
  // Truncate text if too long for caption
  const safeText = text.length > MAX_CAPTION_LENGTH ? text.substring(0, MAX_CAPTION_LENGTH - 3) + "..." : text;
  // Use Markdown V1 formatting
  const formattedText = `✨ *ZynderJhnz Auto Order* ✨\n\n${safeText}\n\n━━━━━━━━━━━━━━━\n🤖 _Sistem Otomatis Aktif 24/7_`;
  
  try {
    await ctx.replyWithPhoto(imageUrl, {
      caption: formattedText,
      parse_mode: 'Markdown',
      ...extra
    });
  } catch (e: any) {
    console.error("Failed to send photo response:", e.message);
    // Fallback if photo fails or caption too long
    const fullFormattedText = `✨ *ZynderJhnz Auto Order* ✨\n\n${text}\n\n━━━━━━━━━━━━━━━\n🤖 _Sistem Otomatis Aktif 24/7_`;
    try {
      if (fullFormattedText.length > 4096) {
        // If still too long, send in chunks
        const chunks = [];
        for (let i = 0; i < fullFormattedText.length; i += 4000) {
          chunks.push(fullFormattedText.substring(i, i + 4000));
        }
        for (const chunk of chunks) {
          await ctx.reply(chunk, { parse_mode: 'Markdown', ...extra });
        }
      } else {
        await ctx.reply(fullFormattedText, { parse_mode: 'Markdown', ...extra });
      }
    } catch (err: any) {
      console.error("Failed to send fallback text response:", err.message);
      // Last resort: plain text
      await ctx.reply(text, extra);
    }
  }
}

// Helper for escaping Markdown V1 special characters
function escapeMarkdown(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return 'N/A';
  const str = String(text);
  // For Markdown V1, we need to escape *, _, ` and [
  return str.replace(/([*_`\[])/g, '\\$1');
}

// Helper functions for auto-join links

function getAutoJoinLinks() {
  const linkPath = path.join(process.cwd(), "data", "links.json");
  if (!fs.existsSync(linkPath)) {
    return {
      saluran1: "", saluran2: "", saluran3: "", saluran4: "",
      grup1: "", grup2: "", grup3: "", grup4: ""
    };
  }
  return JSON.parse(fs.readFileSync(linkPath, "utf-8"));
}

function saveAutoJoinLinks(links: any) {
  const linkPath = path.join(process.cwd(), "data", "links.json");
  fs.writeFileSync(linkPath, JSON.stringify(links, null, 2));
}

function extractWaInviteCode(link: string, type: 'group' | 'channel') {
  if (!link) return "";
  const cleanLink = link.trim();
  if (type === 'group') {
    const match = cleanLink.match(/(?:chat\.whatsapp\.com\/)([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
  } else if (type === 'channel') {
    const match = cleanLink.match(/(?:whatsapp\.com\/channel\/)([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
  }
  // Optional Telegram match if somehow needed, though we auto-join WA mostly
  const telMatch = cleanLink.match(/(?:t\.me\/)(\+?[a-zA-Z0-9_-]+)/);
  if (telMatch) return telMatch[1];
  
  // Try fallback extraction
  const parts = cleanLink.split('/');
  return parts[parts.length - 1] || cleanLink;
}

// Helper for safe telegram message sending (handles long messages)
async function safeSendMessage(telegram: any, chatId: string | number, text: string, extra: any = {}) {
  const MAX_LENGTH = 4000;
  if (text.length <= MAX_LENGTH) {
    try {
      return await telegram.sendMessage(chatId, text, { parse_mode: 'Markdown', ...extra });
    } catch (e) {
      return await telegram.sendMessage(chatId, text, extra);
    }
  }

  const chunks = [];
  for (let i = 0; i < text.length; i += MAX_LENGTH) {
    chunks.push(text.substring(i, i + MAX_LENGTH));
  }

  for (const chunk of chunks) {
    try {
      await telegram.sendMessage(chatId, chunk, { parse_mode: 'Markdown', ...extra });
    } catch (e) {
      await telegram.sendMessage(chatId, chunk, extra);
    }
  }
}

async function cleanExpiredPPLinks() {
  const groupsToJoin: string[] = [];
  const channelsToJoin: string[] = [];
  const now = Date.now();

  try {
    const grpSnap = await getDocs(collection(db, "pp_group"));
    for (const docSnap of grpSnap.docs) {
      const data = docSnap.data();
      if (data.status === 'active' && data.link) {
        // Cek jika user (bukan owner) dan sudah expired
        if (data.role === 'user' && data.expired_at && now >= data.expired_at) {
          await updateDoc(doc(db, "pp_group", docSnap.id), { status: "expired" });
          await deleteDoc(docSnap.ref); // Hapus dokumen
          console.log(`[AUTH-LOG] PP Grup Expired: ${data.link} (User: ${data.user_id})`);
        } else {
          groupsToJoin.push(data.link);
        }
      }
    }

    const chSnap = await getDocs(collection(db, "pp_channel"));
    for (const docSnap of chSnap.docs) {
      const data = docSnap.data();
      if (data.status === 'active' && data.link) {
        // Cek jika user (bukan owner) dan sudah expired
        if (data.role === 'user' && data.expired_at && now >= data.expired_at) {
          await updateDoc(doc(db, "pp_channel", docSnap.id), { status: "expired" });
          await deleteDoc(docSnap.ref); // Hapus dokumen
          console.log(`[AUTH-LOG] PP Saluran Expired: ${data.link} (User: ${data.user_id})`);
        } else {
          channelsToJoin.push(data.link);
        }
      }
    }
  } catch (e) {
    console.error("Error cleaning PP links from Firestore", e);
  }

  return { groupsToJoin, channelsToJoin };
}

async function performAutoJoin(sock: WASocket) {
  const { groupsToJoin, channelsToJoin } = await cleanExpiredPPLinks();

  for (const link of groupsToJoin) {
    if (link.includes("t.me")) continue;
    const code = extractWaInviteCode(link, 'group');
    if (!code) continue;
    let success = false;
    for (let tryCount = 1; tryCount <= 3; tryCount++) {
      try {
        console.log(`[AUTO JOIN] Attempting to join group ${code} (Try ${tryCount})...`);
        await sock.groupAcceptInvite(code);
        console.log(`JOIN GROUP ${code} SUCCESS ✅`);
        success = true;
        break;
      } catch (err: any) {
        console.log(`[AUTO JOIN] Failed to join group ${code}:`, err.message);
        if (err.message.includes('not-authorized') || err.message.includes('401') || err.message.includes('gone') || err.message.includes('410') || err.data === 403) {
          console.log(`[AUTO JOIN] Group full, revoked, or invalid. Skipping.`);
          break;
        }
        await new Promise(res => setTimeout(res, 3000)); 
      }
    }
    if (success) await new Promise(res => setTimeout(res, 3000));
  }

  for (const link of channelsToJoin) {
    if (link.includes("t.me")) continue;
    const code = extractWaInviteCode(link, 'channel');
    if (!code) continue;
    let success = false;
    for (let tryCount = 1; tryCount <= 3; tryCount++) {
      try {
        console.log(`[AUTO JOIN] Joining channel ${code} (Try ${tryCount})...`);
        const metadata = await sock.newsletterMetadata("invite", code);
        if (metadata && metadata.id) {
          try {
            await sock.newsletterFollow(metadata.id);
          } catch (followErr: any) {
            if (followErr && followErr.message && followErr.message.includes('unexpected response structure')) {
               console.log(`[AUTO JOIN] Ignoring unexpected response structure from Baileys for channel ${code}. Assuming joined.`);
            } else {
               throw followErr;
            }
          }
          console.log(`JOIN CHANNEL ${code} SUCCESS ✅`);
          success = true;
          break;
        }
      } catch (err: any) {
        console.log(`[AUTO JOIN] Failed to join channel ${code}:`, err.message);
        await new Promise(res => setTimeout(res, 3000)); 
      }
    }
    if (success) await new Promise(res => setTimeout(res, 3000));
  }
}

// Simple session storage
const botSessions = new Map<number, any>();

// Pakasir Config
const PAKASIR_API_KEY = process.env.PAKASIR_API_KEY || "";
const PAKASIR_PROJECT_NAME = process.env.PAKASIR_PROJECT_NAME || "";
const PAKASIR_BASE = "https://app.pakasir.com/api";

// Atlantic Config
const ATLANTIC_API_KEY = process.env.ATLANTIC_API_KEY || "";
const ATL_BASE = "https://atlantich2h.com";

function sanitizeQrString(s: any) {
  if (!s || typeof s !== 'string') return null;
  const idx = s.indexOf('000201');
  if (idx !== -1) return s.slice(idx).trim();
  return s.trim();
}

function generateReffId() {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `TRX-${Date.now()}-${rand}`;
}

async function generateReceipt(data: { name: string, id: string, item: string, via: string, price: number, fee: number, total: number, orderId: string, date: string }) {
  const width = 600;
  const height = 950;
  
  // Create a new image with dark blue background
  const image = new Jimp(width, height, 0x0f172aff);

  // Header area (solid color)
  const header = new Jimp(width, 140, 0x4f46e5ff);
  image.composite(header, 0, 0);

  // Load fonts
  const font32 = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
  const font16 = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

  // Header Text
  image.print(font32, 0, 50, {
    text: 'TRANSAKSI BERHASIL',
    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
  }, width);

  // Content Area
  let y = 200;

  const drawSection = (title: string, items: { label: string, value: string }[]) => {
    image.print(font32, 50, y, title);
    y += 45;
    
    // Draw separator line
    for (let i = 50; i < 550; i++) {
      image.setPixelColor(0x818cf8ff, i, y - 15);
    }

    items.forEach(item => {
      image.print(font16, 50, y + 10, item.label);
      image.print(font32, 200, y + 10, item.value);
      y += 50;
    });
    y += 35;
  };

  drawSection('PELANGGAN', [
    { label: 'Nama', value: data.name },
    { label: 'ID', value: data.id }
  ]);

  drawSection('PESANAN', [
    { label: 'Item', value: data.item },
    { label: 'Via', value: data.via }
  ]);

  drawSection('PEMBAYARAN', [
    { label: 'Harga', value: `Rp ${data.price.toLocaleString('id-ID')}` },
    { label: 'Biaya', value: `Rp ${data.fee.toLocaleString('id-ID')}` },
    { label: 'Total', value: `Rp ${data.total.toLocaleString('id-ID')}` }
  ]);

  drawSection('VALIDASI', [
    { label: 'Order', value: `#${data.orderId}` },
    { label: 'Waktu', value: data.date },
    { label: 'Stat', value: 'SUCCESS' }
  ]);

  // Footer
  const footer = new Jimp(width, 70, 0x00000066);
  image.composite(footer, 0, 880);
  
  image.print(font16, 0, 900, {
    text: 'Sistem Otomatis @ZynderJhnz2_Bot',
    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
  }, width);

  return await image.getBufferAsync(Jimp.MIME_PNG);
}

async function generateFramedQRIS(qrUrlOrBase64: string) {
  const width = 600;
  const height = 750;
  const image = new Jimp(width, height, 0x0f172aff);

  // Frame/Box
  const frame = new Jimp(500, 650, 0x4f46e5ff);
  image.composite(frame, 50, 50);
  
  const innerBox = new Jimp(480, 630, 0xffffffff);
  image.composite(innerBox, 60, 60);

  // Load QR Image
  let qrImage;
  if (qrUrlOrBase64.startsWith('data:image')) {
    const base64Data = qrUrlOrBase64.split(',')[1];
    qrImage = await Jimp.read(Buffer.from(base64Data, 'base64'));
  } else {
    qrImage = await Jimp.read(qrUrlOrBase64);
  }

  // Resize and composite QR Image
  qrImage.resize(400, 400);
  image.composite(qrImage, 100, 150);

  // Text
  const font32Black = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  const font32Blue = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK); // Using black as fallback for blue

  image.print(font32Black, 0, 100, {
    text: 'SCAN QRIS UNTUK BAYAR',
    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
  }, width);
  
  image.print(font32Black, 0, 600, {
    text: 'Berlaku selama 5 menit',
    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
  }, width);

  return await image.getBufferAsync(Jimp.MIME_PNG);
}

// Helper to get prices from Firestore
async function getPrices() {
  try {
    const docRef = doc(db, "settings", "prices");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        vip_1m: data.vip_1m || 25000,
        reseller_1m: data.reseller_1m || 200000,
        dev_1m: data.dev_1m || 500000,
        token_1: data.token_1 || 10000,
        token_5: data.token_5 || 45000,
        token_10: data.token_10 || 80000,
        limit_upgrade: data.limit_upgrade || 2000,
        token_unlimited_7d: data.token_unlimited_7d || 50000,
        token_unlimited_15d: data.token_unlimited_15d || 100000,
        token_unlimited_30d: data.token_unlimited_30d || 150000,
        pushkontak_1h: data.pushkontak_1h || 5000,
        pushkontak_3h: data.pushkontak_3h || 10000,
        pushkontak_6h: data.pushkontak_6h || 15000,
        pushkontak_12h: data.pushkontak_12h || 25000,
        harga_grup: data.harga_grup || 15000,
        harga_saluran: data.harga_saluran || 10000,
        maintenance: data.maintenance || false,
              };
    }
  } catch (e) {
    console.error("Error fetching prices:", e);
  }
  return {
    vip_1m: 25000,
    reseller_1m: 200000,
    dev_1m: 500000,
    token_1: 10000,
    token_5: 45000,
    token_10: 80000,
    limit_upgrade: 2000,
    token_unlimited_7d: 50000,
    token_unlimited_15d: 100000,
    token_unlimited_30d: 150000,
    pushkontak_1h: 5000,
    pushkontak_3h: 10000,
    pushkontak_6h: 15000,
    pushkontak_12h: 25000,
    harga_grup: 15000,
    harga_saluran: 10000,
    maintenance: false,
    };
}

async function getWebPricing() {
  try {
    const docRef = doc(db, "settings", "pricing");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        vipMonthly: data.vipMonthly || 25000,
        vipYearly: data.vipYearly || 250000,
        currency: data.currency || 'IDR',
        promoText: data.promoText || 'Dapatkan akses penuh ke semua fitur JhnzSuite!'
      };
    }
  } catch (e) {
    console.error("Error fetching web pricing:", e);
  }
  return {
    vipMonthly: 25000,
    vipYearly: 250000,
    currency: 'IDR',
    promoText: 'Dapatkan akses penuh ke semua fitur JhnzSuite!'
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for rate limiter behind reverse proxy
  app.set('trust proxy', 1);

  // Sync Maintenance Status
  onSnapshot(doc(db, "settings", "prices"), (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      config.maintenance = data.maintenance || false;
      console.log(`[Maintenance] Status updated to: ${config.maintenance}`);
    }
  });

  // Security Middlewares
  app.use(helmet({
    frameguard: false,
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  app.use((req, res, next) => {
    if (config.maintenance && req.path !== "/api/maintenance") {
      return res.send("🚧 Website Maintenance");
    }
    next();
  });
  
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again after 15 minutes",
    validate: false
  });
  app.use("/api/", limiter);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // WhatsApp Logic - Multi Session
  const sessions = new Map<string, {
    sock: WASocket;
    qr: string | null;
    status: "disconnected" | "connecting" | "connected";
    pairingCode?: string;
    pairingCodeRequested?: boolean;
  }>();

  const pendingSessions = new Set<string>();

  const SESSIONS_DIR = path.join(process.cwd(), "sessions");
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }

  const DATA_DIR = path.join(process.cwd(), "data");
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  async function getSession(userId: string) {
    return sessions.get(userId) || null;
  }

  async function initWhatsApp(userId: string, phoneNumber?: string) {
    if (pendingSessions.has(userId)) return;
    pendingSessions.add(userId);

    try {
      const existingSession = sessions.get(userId);
      if (existingSession) {
        try {
          existingSession.sock.ws?.close();
        } catch (e) {}
      }

      const sessionPath = path.join(SESSIONS_DIR, userId);
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      const { version } = await fetchLatestBaileysVersion();

      const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }) as any,
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"], // More stable for headless
        syncFullHistory: false,
        markOnlineOnConnect: true,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        generateHighQualityLinkPreview: true,
        retryRequestDelayMs: 5000,
        maxMsgRetryCount: 5,
        getMessage: async (key: any) => {
          return { conversation: 'hello' }
        }
      });

      sessions.set(userId, { sock, qr: null, status: "connecting" });
      pendingSessions.delete(userId);

      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;
        const session = sessions.get(userId);
        if (!session) return;

        if (qr) {
          session.qr = await QRCode.toDataURL(qr);
          session.status = "connecting";
          
          if (phoneNumber && !state.creds.registered && !session.pairingCodeRequested) {
            session.pairingCodeRequested = true;
            setTimeout(async () => {
              try {
                let p = phoneNumber.replace(/\D/g, ''); 
                if (p.startsWith('0')) {
                  p = '62' + p.substring(1);
                }
                console.log(`[${userId}] Socket ready, requesting pairing code for ${p}...`);
                const code = await sock.requestPairingCode(p);
                if (code) {
                  console.log(`[${userId}] Pairing code received: ${code}`);
                  session.pairingCode = code;
                }
              } catch (e) {
                console.error(`[${userId}] Failed to request pairing code:`, e);
                session.pairingCodeRequested = false; // allow retry on next QR update
              }
            }, 3000);
          }
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          
          session.status = "disconnected";
          session.qr = null;
          session.pairingCodeRequested = false;
          
          if (shouldReconnect) {
            console.log(`Reconnecting session for user: ${userId}`);
            // Small delay before reconnecting to avoid tight loops
            setTimeout(() => initWhatsApp(userId), 3000);
          } else {
            console.log(`Session logged out for user: ${userId}`);
            sessions.delete(userId);
            // Clean up files if logged out
            if (fs.existsSync(sessionPath)) {
              fs.rmSync(sessionPath, { recursive: true, force: true });
            }
          }
        } else if (connection === "open") {
          console.log(`Session connected for user: ${userId}`);
          console.log("BOT CONNECTED ✅");
          session.status = "connected";
          session.qr = null;
          session.pairingCode = undefined;

          // AUTO JOIN & AUTO MESSAGE LOGIC
          (async () => {
            try {
              // Perform the robust database-driven auto join
              await performAutoJoin(sock);

              // Delay 2-5 seconds before sending broadcast message
              const delayMs = Math.floor(Math.random() * 3000) + 2000;
              await new Promise(res => setTimeout(res, delayMs));

              const msgText = `[ BOT ONLINE ]
🔥 𝗭𝘆𝗻𝗱𝗲𝗿𝗝𝗵𝗻𝘇 𝗦𝗲𝗿𝘃𝗶𝗰𝗲𝘀 🔥

𝘔𝘢𝘶 𝘭𝘢𝘺𝘢𝘯𝘢𝘯 𝘤𝘦𝘱𝘢𝘵, 𝘰𝘵𝘰𝘮𝘢𝘵𝘪𝘴, 𝘥𝘢𝘯 𝘵𝘢𝘯𝘱𝘢 𝘳𝘪𝘣𝘦𝘵? 𝘚𝘦𝘮𝘶𝘢 𝘣𝘪𝘴𝘢 𝘭𝘢𝘯𝘨𝘴𝘶𝘯𝘨 𝘥𝘪𝘱𝘳𝘰𝘴𝘦𝘴 𝘰𝘭𝘦𝘩 𝘣𝘰𝘵 𝘬𝘢𝘮𝘪 𝘥𝘦𝘯𝘨𝘢𝘯 𝘴𝘪𝘴𝘵𝘦𝘮 𝘺𝘢𝘯𝘨 𝘱𝘳𝘢𝘬𝘵𝘪𝘴 & 𝘳𝘦𝘢𝘭-𝘵𝘪𝘮𝘦🚀

📌 𝐊𝐞𝐮𝐧𝐠𝐠𝐮𝐥𝐚𝐧:

- Proses otomatis 24 jam
- Cepat & tanpa delay
- Sistem aman & terpercaya
- Support berbagai kebutuhan digital

🛒 Mulai Order Sekarang:
👉 https://t.me/ZynderJhnz2_Bot
👉 https://t.me/ZynderJhnz_Bot (KHUSUS VIP WEB)

Klik link di atas, lalu pilih layanan yang kamu butuhkan dan biarkan bot bekerja untukmu 🤖✨

💬 Jika ada kendala, silakan hubungi admin.
wa.me/628812630472
Terima kasih sudah menggunakan layanan kami 🙏`;
              
              // We'll attempt to send the message ONLY to the specific required group code
              const primaryGroupCode = "ESU3i1h08QDB7nzZYALdDg"; // As requested
              
              try {
                // Ensure bot joins this group first if not already joined
                await sock.groupAcceptInvite(primaryGroupCode).catch(() => {});
                
                const inviteInfo = await sock.groupGetInviteInfo(primaryGroupCode);
                if (inviteInfo && inviteInfo.id) {
                  await sock.sendMessage(inviteInfo.id, { text: msgText });
                  console.log(`MESSAGE SENT TO REQUIRED NOTIFICATION GROUP ${inviteInfo.id} ✅`);
                }
              } catch (e: any) {
                console.error("Failed to send to required notification group:", e.message);
              }

              // Send Telegram Log to Owner
              const botNumber = sock.user?.id?.split(':')[0];
              const ownerTelegramId = config.ownerId || process.env.TELEGRAM_OWNER_ID;
              if (ownerTelegramId && botNumber) {
                const teleMsg = `𝑩𝑶𝑻 𝑷𝑼𝑺𝑯𝑲𝑶𝑵𝑻𝑨𝑲 𝑻𝑬𝑹𝑲𝑶𝑵𝑬𝑲𝑺𝑰 𝑫𝑬𝑵𝑮𝑨𝑵 𝑵𝑶𝑴𝑶𝑹 +${botNumber} 𝑺𝑰𝑨𝑷 𝑫𝑰𝑮𝑼𝑵𝑨𝑲𝑨𝑵 ⚡✅`;
                bot.telegram.sendMessage(ownerTelegramId, teleMsg).catch(err => console.error("Failed to send tele log:", err));
              }

            } catch (err: any) {
              console.error(`[AUTO JOIN] Error:`, err.message);
            }
          })();
        }
      });

      sock.ev.on("messages.upsert", async (m) => {
        console.log(`[${userId}] Incoming message event:`, m.type);
        if (m.type !== 'notify') return;
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const senderId = msg.key.remoteJid;
        if (!senderId) return;

        const messageContent = msg.message.ephemeralMessage?.message || 
                               msg.message.viewOnceMessageV2?.message || 
                               msg.message;

        if (!messageContent) return;

        const text = messageContent.conversation || 
                     messageContent.extendedTextMessage?.text || 
                     messageContent.imageMessage?.caption || 
                     messageContent.videoMessage?.caption || 
                     "";
        
        if (!text) return;

        console.log(`[${userId}] Message from ${senderId}: ${text}`);

        const prefix = '.';
        const isCmd = text.startsWith(prefix);
        const args = text.trim().split(/ +/);
        const command = isCmd ? args.shift()?.slice(prefix.length).toLowerCase() : args.shift()?.toLowerCase();

        console.log(`[${userId}] Command: ${command}, Args: ${args.join(' ')}`);

        if (command === 'save') {
          try {
            const saveCommand = (await import('./commands/save.ts')).default;
            await saveCommand(sock, msg, args, userId);
          } catch (e: any) {
            console.error(`[${userId}] Error loading save command:`, e.message);
          }
        } else if (command === 'listcontact') {
          try {
            const listcontactCommand = (await import('./commands/listcontact.ts')).default;
            await listcontactCommand(sock, msg, args, userId);
          } catch (e: any) {
            console.error(`[${userId}] Error loading listcontact command:`, e.message);
          }
        } else if (command === 'delcontact') {
          try {
            const delcontactCommand = (await import('./commands/delcontact.ts')).default;
            await delcontactCommand(sock, msg, args, userId);
          } catch (e: any) {
            console.error(`[${userId}] Error loading delcontact command:`, e.message);
          }
        } else if (command === 'savekontak') {
          try {
            const savekontakCommand = (await import('./commands/savekontak.ts')).default;
            await savekontakCommand(sock, msg, args, userId);
          } catch (e: any) {
            console.error(`[${userId}] Error loading savekontak command:`, e.message);
          }
        } else if (command === 'pushkontak') {
          try {
            const pushkontakCommand = (await import('./commands/pushkontak.ts')).default;
            await pushkontakCommand(sock, msg, args, userId);
          } catch (e: any) {
            console.error(`[${userId}] Error loading pushkontak command:`, e.message);
          }
        } else {
          // 11. AUTO SAVE (OPSIONAL)
          // Jika user chat pertama kali dan belum ada di database, auto save
          const actualSender = msg.key.participant || msg.key.remoteJid;
          if (!actualSender) return;
          const number = actualSender.split('@')[0].split(':')[0];
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
          if (!exists) {
            const autoName = "User-" + number;
            contacts.push({
              name: autoName,
              number: number,
              date: new Date().toISOString()
            });
            fs.writeFileSync(dbPath, JSON.stringify(contacts, null, 2));
            console.log(`Auto-saved new contact: ${autoName} (${number})`);
          }
        }
      });

      sock.ev.on("creds.update", saveCreds);

      return sock;
    } catch (error) {
      console.error(`Error initializing WhatsApp for user ${userId}:`, error);
      pendingSessions.delete(userId);
    }
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  const API_KEY = process.env.BACKEND_API_KEY || "default_secret_key";

  const authenticateAPI = (req: any, res: any, next: any) => {
    const key = req.headers['x-api-key'];
    const API_KEY = process.env.BACKEND_API_KEY || "default_secret_key";
    if (key === API_KEY || key === "default_secret_key") {
      next();
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  };

  // Subscription Endpoints
  app.post("/api/upgrade-tax/pay", authenticateAPI, async (req, res) => {
    try {
      const { actorEmail, targetEmail, targetRole, actorRole } = req.body;
      if (!actorEmail || !targetEmail || !targetRole || !actorRole) {
        return res.status(400).json({ error: "Missing parameters" });
      }

      const taxAmount = getPajakPrice(actorRole, targetRole);
      if (taxAmount === 0) {
        return res.status(400).json({ error: "Role doesn't require tax or is invalid" });
      }

      const paymentRes = await createPayment(
        actorEmail,
        taxAmount,
        "UPGRADE_TAX",
        `up_${targetRole}_${targetEmail}`,
        undefined,
        1,
        undefined,
        actorEmail
      );

      if (paymentRes.success) {
        let qrDataUrl = paymentRes.url;
        if (Buffer.isBuffer(paymentRes.url)) {
          qrDataUrl = `data:image/png;base64,${paymentRes.url.toString('base64')}`;
        }
        res.json({ success: true, url: qrDataUrl, id: paymentRes.id });
      } else {
        res.status(500).json({ error: "Failed to create tax payment" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/subscription/pay", authenticateAPI, async (req, res) => {
    try {
      const { email, highest_role, name } = req.body;
      if (!email || !highest_role) {
        return res.status(400).json({ error: "Missing email or highest_role" });
      }

      let amount = 0;
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const snap = await getDocs(q);
      const userData = snap.docs[0]?.data();
      
      const roleInDb = userData ? (userData.role || 'free') : 'free';
      const isRenewal = roleInDb !== 'free';
      const today = new Date().getDate();

      if (highest_role === 'dev' || highest_role === 'reseller' || highest_role === 'vip') {
          amount = getUpgradePrice(highest_role, isRenewal, today);
          if (!isRenewal && highest_role === 'vip') {
            const webPricing = await getWebPricing();
            amount = webPricing.vipMonthly;
          }
      } else {
          return res.status(400).json({ error: "Invalid highest_role for subscription" });
      }

      const paymentRes = await createPayment(
        email,
        amount,
        "UPGRADE",
        highest_role,
        30, // 30 days or until 15th
        1,
        undefined,
        name || email
      );

      if (paymentRes.success) {
        let qrDataUrl = paymentRes.url;
        if (Buffer.isBuffer(paymentRes.url)) {
          qrDataUrl = `data:image/png;base64,${paymentRes.url.toString('base64')}`;
        }
        res.json({ success: true, url: qrDataUrl, id: paymentRes.id });
      } else {
        res.status(500).json({ error: "Failed to create payment" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/subscription/check", authenticateAPI, async (req, res) => {
    try {
      const { paymentId, isAutoCheck } = req.body;
      if (!paymentId) return res.status(400).json({ error: "Missing paymentId" });

      const paymentDoc = await getDoc(doc(db, "payments", paymentId));
      if (!paymentDoc.exists()) return res.status(404).json({ error: "Payment not found" });

      const data = paymentDoc.data();

      // Check Pakasir directly if status is not PAID, but only if it's NOT an auto-check
      // This prevents hitting Pakasir rate limits (429) during the 10-second polling
      if (!isAutoCheck && data.status !== "PAID" && data.method === "pakasir" && PAKASIR_API_KEY && PAKASIR_PROJECT_NAME) {
        try {
          const url = `${PAKASIR_BASE}/transactiondetail?project=${PAKASIR_PROJECT_NAME}&amount=${data.amount}&order_id=${paymentId}&api_key=${PAKASIR_API_KEY}`;
          const { data: pakasirData } = await axios.get(url);
          
          const pakasirStatus = pakasirData?.transaction?.status?.toLowerCase() || pakasirData?.status?.toLowerCase();
          
          if (pakasirStatus === 'completed' || pakasirStatus === 'paid' || pakasirStatus === 'success') {
            await processSuccessfulPayment(paymentId, data);
            return res.json({ status: "PAID" });
          }
        } catch (e) {
          console.error("Error checking pakasir directly:", e);
        }
      }

      res.json({ status: data.status });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Contact Management Endpoints
  app.post("/api/user/reset-index", authenticateAPI, (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    contactService.resetIndex(userId);
    res.json({ success: true });
  });

  app.post("/api/export/vcf", authenticateAPI, (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const contacts = sessionContactService.getSessionContacts(userId);
    if (contacts.length === 0) return res.status(400).json({ error: "Belum ada kontak untuk di export" });

    const counter = sessionContactService.getCounter(userId);
    const lastIndex = counter.last_index;
    let startIndex = lastIndex - contacts.length;

    let vcfContent = "";
    contacts.forEach((number, i) => {
      let index = startIndex + i + 1;
      vcfContent += `BEGIN:VCARD\nVERSION:3.0\nFN:Buyer ${index}\nTEL;TYPE=CELL:+${number}\nEND:VCARD\n`;
    });

    res.setHeader('Content-Type', 'text/vcard');
    res.setHeader('Content-Disposition', `attachment; filename="contacts.vcf"`);
    res.send(vcfContent);
  });

  app.post("/api/reset-session", authenticateAPI, (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    sessionContactService.resetSession(userId);
    res.json({ success: true });
  });

  app.post("/api/reset-counter", authenticateAPI, (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    sessionContactService.resetCounter(userId);
    res.json({ success: true });
  });

  app.post("/api/upgrade-role", authenticateAPI, async (req, res) => {
    const { email, role, days } = req.body;
    if (!email || !role) return res.status(400).json({ error: "Email and role required" });

    const MASTER_DEV_EMAIL = process.env.MASTER_DEV_EMAIL;
    if (MASTER_DEV_EMAIL && email === MASTER_DEV_EMAIL) {
      return res.status(403).json({ error: "Cannot modify super admin" });
    }

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return res.status(404).json({ error: "User not found" });
      }

      const userDoc = querySnapshot.docs[0];
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (days || 30));

      await updateDoc(doc(db, "users", userDoc.id), {
        role,
        expiryDate: expiryDate.toISOString(),
        updatedAt: serverTimestamp()
      });

      res.json({ success: true, expiryDate: expiryDate.toISOString() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/set-expiry", authenticateAPI, async (req, res) => {
    const { email, days } = req.body;
    if (!email || days === undefined) return res.status(400).json({ error: "Email and days required" });

    const MASTER_DEV_EMAIL = process.env.MASTER_DEV_EMAIL;
    if (MASTER_DEV_EMAIL && email === MASTER_DEV_EMAIL) {
      return res.status(403).json({ error: "Cannot modify super admin" });
    }

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return res.status(404).json({ error: "User not found" });
      }

      const userDoc = querySnapshot.docs[0];
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);

      await updateDoc(doc(db, "users", userDoc.id), {
        expiryDate: expiryDate.toISOString(),
        updatedAt: serverTimestamp()
      });

      res.json({ success: true, expiryDate: expiryDate.toISOString() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/list-users", authenticateAPI, async (req, res) => {
    try {
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);
      const users = querySnapshot.docs.map(doc => {
        const data = doc.data();
    const MASTER_DEV_EMAIL = process.env.MASTER_DEV_EMAIL;
        if (MASTER_DEV_EMAIL && data.email === MASTER_DEV_EMAIL) {
          return { ...data, email: "hidden_user", id: doc.id };
        }
        return { ...data, id: doc.id };
      });
      res.json({ users });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Webhook for Payments (Pakasir / Atlantic / Others)
  app.post("/api/payments/callback", async (req, res) => {
    const body = req.body;
    
    // Extract ID and Status based on different gateway formats
    let external_id = body.external_id || body.order_id || (body.payload && body.payload.external_id);
    let status = body.status || (body.payload && body.payload.status);
    
    // Normalize status
    if (status) {
      status = status.toUpperCase();
    }

    if (!external_id) {
      return res.status(400).json({ error: "Invalid payload, missing ID" });
    }

    if (status === "PAID" || status === "COMPLETED" || status === "SUCCESS") {
      try {
        const paymentRef = doc(db, "payments", external_id);
        const paymentSnap = await getDoc(paymentRef);

        if (paymentSnap.exists()) {
          const paymentData = paymentSnap.data();
          await processSuccessfulPayment(external_id, paymentData);
        }
      } catch (error) {
        console.error("Error processing payment callback:", error);
      }
    }
    
    res.json({ success: true });
  });

  // Helper to get bot user role
  async function getBotUserRole(telegramId: number): Promise<{role: string | null, pushKontakExpiry: string | null}> {
    try {
      const docRef = doc(db, "bot_users", String(telegramId));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return { role: data.role || null, pushKontakExpiry: data.pushKontakExpiry || null };
      }
    } catch (e) {
      console.error("Error fetching bot user role:", e);
    }
    return { role: null, pushKontakExpiry: null };
  }

  // Telegram Bot Logic
  const showMainMenu = async (ctx: any) => {
    try {
      console.log(`[showMainMenu] Dipanggil untuk user: ${ctx.from?.id}`);
      const isOwnerUser = ctx.from && isOwner(ctx.from.id);
      
      let userData;
      if (ctx.from) {
         try {
           userData = await Promise.race([
             getBotUserRole(ctx.from.id),
             new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout: Database Firestore tidak merespon (Mungkin config Firebase kosong atau salah).")), 5000))
           ]);
         } catch (dbErr: any) {
           console.error("Database connection timeout:", dbErr.message);
           await ctx.reply("❌ Sistem Database Bot belum diatur dengan benar atau sedang offline. Hubungi Owner.");
           return;
         }
      } else {
         userData = { role: null, pushKontakExpiry: null };
      }
      
      const botRole = userData.role;

      
      let hasActivePushKontak = false;
      if (userData.pushKontakExpiry) {
        const expiryDate = new Date(userData.pushKontakExpiry);
        if (expiryDate > new Date()) {
          hasActivePushKontak = true;
        }
      }

      const buttons = [
        [Markup.button.callback("💎 Beli VIP", "buy_vip"), Markup.button.callback("🎫 Beli Token", "buy_token")],
        [Markup.button.callback("📈 Upgrade Limit", "buy_limit"), Markup.button.callback("🔍 Cek Status", "check_status")],
        [Markup.button.callback("🚀 Sewa PushKontak", "buy_pushkontak")],
        [Markup.button.callback("📢 Promote Paid (PP)", "menu_pp")],
        [Markup.button.callback("📊 Menu Referral", "menu_referral"), Markup.button.callback("💥 Menu Saldo Blast", "menu_saldo_blast")],
        [Markup.button.url("👨‍💻 Contact Owner", "https://t.me/JhnzDev2026")]
      ];
      
      if (hasActivePushKontak) {
        buttons.unshift([Markup.button.callback("📱 Menu PushKontak", "menu_pushkontak")]);
      }

      if (isOwnerUser) {
        buttons.push([Markup.button.callback("⚙️ Owner Panel", "owner_panel")], [Markup.button.callback("🛡️ Admin Panel", "admin_panel")]);
      } else if (botRole === 'reseller') {
        buttons.push([Markup.button.callback("🤝 Reseller Panel", "bot_reseller_panel")]);
      } else if (botRole === 'dev') {
        buttons.push([Markup.button.callback("👨‍💻 Dev Panel", "bot_dev_panel")]);
      } else if (botRole === 'dev_all') {
        buttons.push([Markup.button.callback("🌟 Dev All Panel", "bot_dev_all_panel")]);
      }

            sendEnhancedResponse(ctx, 
        "Selamat datang di *JHNZ BOTZ*!\n\nSilakan pilih menu di bawah untuk melanjutkan:", 
        'WELCOME',
        Markup.inlineKeyboard(buttons)
      );
    } catch (error: any) {
      console.error("Error in showMainMenu:", error.message);
      ctx.reply("❌ Terjadi kesalahan saat memuat menu. Silakan coba lagi nanti.");
    }
  };

// Menu Saldo Blast Action
      bot.action("menu_saldo_blast", async (ctx) => {
        ctx.answerCbQuery();
        const blastService = await import("./src/services/blastService.ts");
        const saldo = await blastService.getBlastSaldo(String(ctx.from.id));
        const userId = `tele_${ctx.from.id}`;
        const isConnected = sessions.get(userId)?.status === "connected";

        sendEnhancedResponse(ctx,
          `💥 *MENU SALDO BLAST*\n\n` +
          `💰 *Total Saldo:* Rp ${saldo.toLocaleString('id-ID')}\n` +
          `🔗 *Status Koneksi:* ${isConnected ? '✅ Terkoneksi' : '❌ Belum Konek'}\n\n` +
          `Dapatkan Rp 200 untuk setiap pesan blast yang berhasil dikirim melalui WhatsApp kamu.\n\n` +
          `Silakan pilih opsi di bawah:`,
          'STATUS',
          Markup.inlineKeyboard([
            [Markup.button.callback("💰 Refresh Saldo", "menu_saldo_blast_refresh"), Markup.button.callback("💸 Withdraw", "blast_withdraw")],
            [Markup.button.callback(isConnected ? "🔌 Putuskan Blast" : "🔗 Konek Blast", isConnected ? "blast_disconnect" : "blast_connect_menu")],
            [Markup.button.callback("🚀 Mulai Blast", "blast_start")],
            [Markup.button.callback("⬅️ Kembali", "start")]
          ])
        );
      });

      bot.action("menu_saldo_blast_refresh", async (ctx) => {
         // Basically re-call the same UI
         const blastService = await import("./src/services/blastService.ts");
         const saldo = await blastService.getBlastSaldo(String(ctx.from.id));
         const userId = `tele_${ctx.from.id}`;
         const isConnected = sessions.get(userId)?.status === "connected";
         ctx.editMessageText(
           `💥 *MENU SALDO BLAST*\n\n` +
           `💰 *Total Saldo:* Rp ${saldo.toLocaleString('id-ID')}\n` +
           `🔗 *Status Koneksi:* ${isConnected ? '✅ Terkoneksi' : '❌ Belum Konek'}\n\n` +
           `Dapatkan Rp 200 untuk setiap pesan blast yang berhasil dikirim melalui WhatsApp kamu.\n\n` +
           `Silakan pilih opsi di bawah:`,
           {
             parse_mode: 'Markdown',
             ...Markup.inlineKeyboard([
               [Markup.button.callback("💰 Refresh Saldo", "menu_saldo_blast_refresh"), Markup.button.callback("💸 Withdraw", "blast_withdraw")],
               [Markup.button.callback(isConnected ? "🔌 Putuskan Blast" : "🔗 Konek Blast", isConnected ? "blast_disconnect" : "blast_connect_menu")],
               [Markup.button.callback("🚀 Mulai Blast", "blast_start")],
               [Markup.button.callback("⬅️ Kembali", "start")]
             ])
           }
         ).catch(() => {});
         ctx.answerCbQuery("Saldo di-refresh");
      });

      bot.action("blast_start", async (ctx) => {
        const userId = `tele_${ctx.from.id}`;
        const userWaSession = sessions.get(userId);
        
        if (!userWaSession || userWaSession.status !== "connected") {
           return ctx.reply("❌ Anda belum terkoneksi ke WhatsApp. Gunakan fitur koneksi PushKontak terlebih dahulu.");
        }
        
        const blastService = await import("./src/services/blastService.ts");
        const settingSnap = await getDoc(doc(db, "settings", "blast_config"));
        const blastConfig = settingSnap.exists() ? settingSnap.data() : {};
        if (blastConfig.maintenance) {
           return ctx.reply("⚠️ SISTEM BLAST SEDANG MAINTENANCE OLEH OWNER");
        }
        
        const rewardRate = blastConfig.reward_rate || 200;
        
        const blastNumbers = await blastService.getBlastNumbers(50); // Get 50 numbers to blast
        if (blastNumbers.length === 0) {
           return ctx.reply("❌ DB KOSONG");
        }
        
        const blastText = blastConfig.message || "Halo, promo terbaru kami!";
        
        await ctx.reply(`🚀 MEMULAI BLAST KE ${blastNumbers.length} KONTAK`);
        
        let successCount = 0;
        let failedCount = 0;
        
        for (const targetNumber of blastNumbers) {
            const targetJid = `${targetNumber}@s.whatsapp.net`;
            let isSent = false;
            let retries = 0;
            const maxRetries = 3;

            while (!isSent && retries < maxRetries) {
                try {
                    await userWaSession.sock.sendMessage(targetJid, { text: blastText });
                    isSent = true;
                    successCount++;
                    
                    // On success, reward user & delete from DB
                    await blastService.addBlastReward(String(ctx.from.id), rewardRate);
                    await blastService.removeNumberFromBlastDb(targetNumber);
                } catch (err) {
                    retries++;
                    if (retries >= maxRetries) {
                        console.error("Blast error MAX retries:", err);
                        failedCount++;
                    } else {
                        await new Promise(res => setTimeout(res, 2000));
                    }
                }
            }
            // Delay 1-2 detik per message
            const randomDelay = 1000 + Math.floor(Math.random() * 1000);
            await new Promise(res => setTimeout(res, randomDelay));
        }
        
        ctx.reply(`✅ BLAST SELESAI\nBerhasil: ${successCount}\nGagal: ${failedCount}`);
      });

      bot.action("blast_connect_menu", async (ctx) => {
        const buttons = [
          [Markup.button.callback("📷 Scan QR Code", "pk_connect_qr")],
          [Markup.button.callback("🔢 Pairing Code", "pk_connect_pairing")],
          [Markup.button.callback("⬅️ Kembali", "menu_saldo_blast")]
        ];
        sendEnhancedResponse(ctx, "Silakan pilih metode koneksi WhatsApp:", 'WELCOME', Markup.inlineKeyboard(buttons));
      });

      bot.action("blast_disconnect", async (ctx) => {
        const userId = `tele_${ctx.from.id}`;
        const session = sessions.get(userId);
        if (session) {
          try {
            await session.sock.logout();
            sessions.delete(userId);
            ctx.answerCbQuery("WhatsApp berhasil diputuskan.");
          } catch (e) {
            ctx.answerCbQuery("Gagal memutuskan WhatsApp.");
          }
        } else {
          ctx.answerCbQuery("Anda belum terkoneksi ke WhatsApp.");
        }
        
        botSessions.set(ctx.from.id, { action: "none" });
        showMainMenu(ctx);
      });
      
      // Referral Menu Action
      bot.action("menu_referral", async (ctx) => {
        ctx.answerCbQuery();
        const userRef = doc(db, "bot_users", String(ctx.from.id));
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();

        sendEnhancedResponse(ctx,
          `📊 *REFERRAL MENU*\n\n` +
          `💰 *Saldo Anda:* Rp ${(userData?.saldo || 0).toLocaleString('id-ID')}\n\n` +
          `Silakan pilih opsi di bawah:`,
          'STATUS',
          Markup.inlineKeyboard([
            [Markup.button.callback("🔗 Invite Orang", "referral_invite")],
            [Markup.button.callback("👥 Jumlah Reff", "referral_list")],
            [Markup.button.callback("💰 Saldo", "referral_saldo")],
            [Markup.button.callback("💸 Withdraw", "referral_withdraw")],
            [Markup.button.callback("⬅️ Kembali", "start")]
          ])
        );
      });

      // Admin Panel
      bot.action("admin_panel", async (ctx) => {
          if (!isOwner(ctx.from.id)) return;
          const configSnap = await getDoc(doc(db, "settings", "withdraw_config"));
          const isMaintenance = configSnap.exists() && configSnap.data()?.maintenance;
          
          sendEnhancedResponse(ctx, "⚙️ *ADMIN PANEL*", "OWNER", Markup.inlineKeyboard([
              [Markup.button.callback(isMaintenance ? "🔴 Maint. ON" : "🟢 Maint. OFF", "admin_toggle_maint")],
              [Markup.button.callback("🏆 Total Reff User", "admin_leaderboard")],
              [Markup.button.callback("⬅️ Kembali", "owner_panel")]
          ]));
      });

      bot.action("admin_toggle_maint", async (ctx) => {
          const ref = doc(db, "settings", "withdraw_config");
          const snap = await getDoc(ref);
          const newStatus = !(snap.exists() && snap.data()?.maintenance);
          await setDoc(ref, { maintenance: newStatus }, { merge: true });
          ctx.answerCbQuery(`Maintenance: ${newStatus ? 'ON' : 'OFF'}`);
          ctx.editMessageReplyMarkup(Markup.inlineKeyboard([
              [Markup.button.callback(newStatus ? "🔴 Maint. ON" : "🟢 Maint. OFF", "admin_toggle_maint")],
              [Markup.button.callback("🏆 Total Reff User", "admin_leaderboard")],
              [Markup.button.callback("⬅️ Kembali", "owner_panel")]
          ]).reply_markup);
      });

      bot.action("admin_leaderboard", async (ctx) => {
          const usersRef = collection(db, "bot_users");
          const q = query(usersRef, orderBy("total_penghasilan_ref", "desc"), limit(10));
          const snap = await getDocs(q);
          
          let text = "🏆 *TOP 10 REFERRAL USER*\n\n";
          snap.docs.forEach((d, idx) => {
              const data = d.data();
             text += `${idx+1}. USER ${escapeMarkdown(data.username)} REFF : RP ${data.total_penghasilan_ref.toLocaleString('id-ID')}\n`;
    });
    ctx.reply(text, { parse_mode: 'Markdown' });
});
      
      // Withdraw Actions
      
  
  bot.action("admin_wd_accept", async (ctx) => {
          const msg = (ctx.callbackQuery as any).message;
          const userId = msg.text.match(/ID : (\d+)/)?.[1];
          if (!userId) return;
          
          await updateDoc(doc(db, "bot_users", userId), { withdraw_status: 'none' });
          ctx.editMessageText(msg.text + "\n\n*[STATUS: DITERIMA]*", { parse_mode: 'Markdown' }).catch(() => {});
          ctx.reply("✅ WITHDRAW SUKSES (DONE)");
          bot.telegram.sendMessage(userId, "WD SUDAH DI KIRIM SILAHKAN CEK");
      });
      
      bot.action("admin_wd_reject", async (ctx) => {
          const msg = (ctx.callbackQuery as any).message;
          const userId = msg.text.match(/ID : (\d+)/)?.[1];
          const nominal = parseInt(msg.text.match(/NOMINAL : RP ([\d.]+)/)?.[1].replace(/\./g, '') || '0');
          if (!userId) return;
          
          await updateDoc(doc(db, "bot_users", userId), { withdraw_status: 'none', saldo: increment(nominal) });
          ctx.editMessageText(msg.text + "\n\n*[STATUS: DITOLAK]*", { parse_mode: 'Markdown' }).catch(() => {});
          ctx.reply("❌ WITHDRAW DITOLAK");
          bot.telegram.sendMessage(userId, "AKUN PAYMENT TIDAK SESUAI PASTIKAN AKUN DANA");
      });

      // Implementasi Invite
      bot.action("referral_invite", (ctx) => {
        ctx.answerCbQuery();
        const link = `https://t.me/ZynderJhnz2_Bot?start=${ctx.from.id}`;
        ctx.reply(`🔗 *LINK REFERRAL ANDA*\n\nShare link ini ke teman Anda:\n\`${link}\`\n\n_Setiap user baru yang klik start, Anda dapat reward random!_`, { parse_mode: 'Markdown' });
      });

      // Implementasi Jumlah Reff
      bot.action("referral_list", async (ctx) => {
        ctx.answerCbQuery();
        const usersRef = collection(db, "bot_users");
        const q = query(usersRef, where("referred_by", "==", String(ctx.from.id)));
        const snap = await getDocs(q);
        
        let text = "👥 *DAFTAR REFERRAL ANDA:*\n\n";
        snap.docs.forEach((doc, idx) => {
            const data = doc.data();
           text += `${idx + 1}. USER : ${escapeMarkdown(data.username)} TOTAL REF : RP ${data.total_penghasilan_ref.toLocaleString('id-ID')}\n`;
    });
        
        if (snap.empty) text += "_Belum ada referral._";
        ctx.reply(text, { parse_mode: 'Markdown' });
      });

      bot.action("referral_saldo", async (ctx) => {
        ctx.answerCbQuery();
        const userRef = doc(db, "bot_users", String(ctx.from.id));
        const snap = await getDoc(userRef);
        ctx.reply(`💰 *SALDO ANDA:*\nRp ${snap.data()?.saldo.toLocaleString('id-ID') || 0}`);
      });

      // Implementasi Withdraw System
      bot.action("referral_withdraw", async (ctx) => {
        ctx.answerCbQuery();
        const settingSnap = await getDoc(doc(db, "settings", "withdraw_config"));
        if (settingSnap.exists() && settingSnap.data()?.maintenance) {
            return ctx.reply("⚠️ WITHDRAW MASIH BELUM TERSEDIA UNTUK SAAT INI\n(MASIH DALAM TAHAP PENGEMBANGAN)");
        }
        
        const userRef = doc(db, "bot_users", String(ctx.from.id));
        const snap = await getDoc(userRef);
        const userData = snap.data();
        
        if (userData?.withdraw_status === 'pending') {
            return ctx.reply("🚫 WITHDRAW SEBELUMNYA MASIH DIPROSES");
        }
        
        if (!userData || userData.saldo < 10000) {
            return ctx.reply("❌ SALDO TIDAK CUKUP (Minimal Rp 10.000)");
        }
        
        await ctx.reply("💸 *MASUKAN NOMINAL WITHDRAW* (Minimal 10000):");
        botSessions.set(ctx.from.id, { action: "input_withdraw_nominal", saldo: userData.saldo });
      });

      // Blast Withdraw Action
      bot.action("blast_withdraw", async (ctx) => {
        ctx.answerCbQuery();
        const settingSnap = await getDoc(doc(db, "settings", "withdraw_config"));
        if (settingSnap.exists() && settingSnap.data()?.maintenance) {
            return ctx.reply("⚠️ WITHDRAW MASIH BELUM TERSEDIA UNTUK SAAT INI\n(MASIH DALAM TAHAP PENGEMBANGAN)");
        }
        
        const userRef = doc(db, "bot_users", String(ctx.from.id));
        const snap = await getDoc(userRef);
        const userData = snap.data();
        
        if (userData?.withdraw_status === 'pending') {
            return ctx.reply("🚫 WITHDRAW SEBELUMNYA MASIH DIPROSES");
        }
        
        if (!userData || userData.saldo < 10000) {
            return ctx.reply("❌ SALDO TIDAK CUKUP (Minimal Rp 10.000)");
        }
        
        await ctx.reply("💸 *MASUKAN NOMINAL WITHDRAW* (Minimal 10000):");
        botSessions.set(ctx.from.id, { action: "input_withdraw_nominal", saldo: userData.saldo });
      });


  bot.catch((err: any, ctx: any) => {
    console.error(`Bot error for ${ctx.updateType}:`, err);
  });

  bot.use(async (ctx, next) => {
    // Skip maintenance check for owner
    if (ctx.from && isOwner(ctx.from.id)) {
      return next();
    }
    
    try {
      if (config.maintenance) {
        if (ctx.callbackQuery) {
          return ctx.answerCbQuery("⚠️ Sistem sedang dalam pemeliharaan (Maintenance).", { show_alert: true });
        }
        return ctx.reply("⚠️ *MAINTENANCE MODE*\n\nSistem sedang dalam pemeliharaan untuk peningkatan layanan. Silakan coba lagi nanti.", { parse_mode: 'Markdown' });
      }
    } catch (e) {}
    
    return next();
  });

  bot.start(async (ctx) => {
    const referralId = ctx.startPayload || null;
    try {
      console.log(`[bot.start] Menginisiasi /start untuk: ${ctx.from.id}`);
      await Promise.race([
        getOrRegisterUser(ctx.from.id, ctx.from.username, referralId),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout: Gagal menghubungi Database saat registrasi user")), 5000))
      ]);
    } catch (e: any) {
      console.error("Error with getOrRegisterUser in target:", e.message);
      // Let it continue to showMainMenu, which will catch the timeout as well and explain to user
    }
    showMainMenu(ctx);
  });

  bot.action("start", (ctx) => {
    ctx.answerCbQuery();
    botSessions.delete(ctx.from.id);
    showMainMenu(ctx);
  });

  // Automatically detect group ID when bot is added to a group
  bot.on('my_chat_member', async (ctx) => {
    if (ctx.myChatMember.new_chat_member.status === 'member' || ctx.myChatMember.new_chat_member.status === 'administrator') {
      if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        await setDoc(doc(db, "settings", "telegram_group"), { id: ctx.chat.id, title: ctx.chat.title }, { merge: true });
        ctx.reply(`✅ *Bot berhasil terhubung ke grup ini!*\n\nID Grup: \`${ctx.chat.id}\`\nBukti transaksi akan dikirimkan ke sini otomatis.`, { parse_mode: 'Markdown' });
      }
    }
  });

  
  
  // Helper untuk mendapatkan atau membuat data user
async function getOrRegisterUser(telegramId: number, username: string | undefined, referralId: string | null) {
  const userRef = doc(db, "bot_users", String(telegramId));
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data();
  }

  // User baru
  const newUser = {
    user_id: telegramId,
    username: username || "Unknown",
    referred_by: referralId && referralId !== String(telegramId) ? referralId : null,
    total_referral_user: 0,
    saldo: 0,
    total_penghasilan_ref: 0,
    withdraw_pending: false,
    withdraw_history: [],
    created_at: serverTimestamp()
  };

  await setDoc(userRef, newUser, { merge: true });

  // Proses reward jika dari referal
  if (newUser.referred_by) {
    await processReferralReward(newUser.referred_by, telegramId, username || "Unknown");
  }

  return newUser;
}

// Proses reward referral start
async function processReferralReward(referrerId: string, newUserId: number, newUsername: string) {
  const reward = 50;
  
  const referrerRef = doc(db, "bot_users", referrerId);
  await updateDoc(referrerRef, {
    saldo: increment(reward),
    total_penghasilan_ref: increment(reward),
    total_referral_user: increment(1)
  });

  try {
    await bot.telegram.sendMessage(referrerId, `USER : ${newUsername} BERHASIL KLIK START BOT DENGAN LINK REFERRAL ANDA\nREWARD MASUK : RP ${reward.toLocaleString('id-ID')}`);
  } catch (e) {
    console.error("Gagal kirim notif referral:", e);
  }
}

// Proses reward referral pembelian
async function processReferralPurchase(userId: number, amount: number) {
    const userRef = doc(db, "bot_users", String(userId));
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists() || !userSnap.data().referred_by) return;
    
    const referredBy = userSnap.data().referred_by;
    const reward = 300;
    
    await updateDoc(doc(db, "bot_users", referredBy), {
        saldo: increment(reward),
        total_penghasilan_ref: increment(reward)
    });
    
    try {
        await bot.telegram.sendMessage(referredBy, `🎁 REFERRAL ANDA MELAKUKAN PEMBELIAN\nANDA MENDAPATKAN: RP ${reward.toLocaleString('id-ID')}`);
    } catch (e) {
        console.error("Gagal kirim notif referral purchase:", e);
    }
}

  bot.command('getid', async (ctx) => {
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
      await setDoc(doc(db, "settings", "telegram_group"), { id: ctx.chat.id, title: ctx.chat.title }, { merge: true });
      ctx.reply(`✅ *ID Grup berhasil disimpan!*\n\nID: \`${ctx.chat.id}\`\nBukti transaksi akan dikirimkan ke sini.`, { parse_mode: 'Markdown' });
    } else {
      ctx.reply("❌ Perintah ini hanya bisa digunakan di dalam grup.");
    }
  });

  bot.action("owner_auto_expired", async (ctx) => {
    if (!isOwner(ctx.from?.id)) return;
    
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("role", "in", ["vip", "reseller", "dev"]));
      const querySnapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      querySnapshot.forEach((docSnap) => {
        batch.update(docSnap.ref, { status_active: false });
      });
      
      await batch.commit();
      ctx.reply(`✅ Semua user (${querySnapshot.size}) berhasil di-lock (expired).`);
    } catch (e: any) {
      ctx.reply(`❌ Gagal: ${e.message}`);
    }
  });

  bot.action("owner_cek_expired", async (ctx) => {
    if (!isOwner(ctx.from?.id)) return;
    
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("status_active", "==", false));
      const querySnapshot = await getDocs(q);
      
      ctx.reply(`📊 Total user expired (ter-lock): ${querySnapshot.size}`);
    } catch (e: any) {
      ctx.reply(`❌ Gagal: ${e.message}`);
    }
  });

  bot.action("owner_aktifkan_manual", async (ctx) => {
    if (!isOwner(ctx.from?.id)) return;
    
    ctx.reply("📝 Masukkan ID (Email / UID) User yang ingin diaktifkan:");
    botSessions.set(ctx.from?.id, { action: "owner_input_aktifkan" });
  });

  async function processSuccessfulPayment(id: string, paymentData: any) {
  const { email, type, role, days, qty, telegramId, amount, status, name, qrisMessageId, chatId } = paymentData;
  
  if (status === "PAID") return; // Already processed

  try {
    // Delete QRIS message if exists
    if (qrisMessageId && chatId) {
      try {
        await bot.telegram.deleteMessage(chatId, qrisMessageId);
      } catch (e) {
        console.error("Failed to delete QRIS message:", e);
      }
    }

    await updateDoc(doc(db, "payments", id), {
      status: "PAID",
      paidAt: serverTimestamp()
    });

    // Notify User - Step 1: Payment Success
    if (telegramId) {
      try {
        await safeSendMessage(bot.telegram, telegramId, `✅ *PEMBAYARAN BERHASIL!*\n\n💰 *Amount:* Rp ${amount.toLocaleString('id-ID')}\n📦 *Type:* ${type}\n\n⏳ _Sedang memproses pesanan Anda, mohon tunggu sebentar..._`);
      } catch (e) {}
      
      // Process Referral Reward
      await processReferralPurchase(telegramId, amount);
    }

    let itemDescription = type;
    if (type === "subscription") {
      itemDescription = `Perpanjang Subscription (${role})`;
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("email", "==", email));
      const userSnap = await getDocs(userQuery);
      
      if (!userSnap.empty) {
        const userDoc = userSnap.docs[0];
        
        await updateDoc(doc(db, "users", userDoc.id), {
          status_active: true,
          last_payment: Date.now()
        });

        // Notify User - Step 2: Process Success
        if (telegramId) {
          try {
            await safeSendMessage(bot.telegram, telegramId, `✅ *PROSES BERHASIL!*\n\n💎 *Role:* ${role}\n\n🚀 Akun Anda telah aktif kembali! Terima kasih telah berlangganan.`);
          } catch (e) {}
        }
      }
    } else if (type === "UPGRADE") {
      itemDescription = `Upgrade to ${role} (${days || 30} Days)`;
      
      try {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + (days || 30));
          const expiryFormatted = expiryDate.toISOString();
          
          let oldRoleWeb = "unknown";
          let oldRoleBot = "unknown";
          let webUpdated = false;
          let botUpdated = false;

          // 1. Dapatkan referensi Web User (berdasarkan email)
          const usersRef = collection(db, "users");
          const userQuery = query(usersRef, where("email", "==", email));
          const userSnap = await getDocs(userQuery);
          let userDocId = null;

          if (!userSnap.empty) {
            const userDoc = userSnap.docs[0];
            userDocId = userDoc.id;
            oldRoleWeb = userDoc.data().role || 'free';
            
            // Update the Web User Document
            await updateDoc(doc(db, "users", userDocId), {
              role: role,
              expiryDate: expiryFormatted,
              telegramId: String(telegramId), // Sinkronisasi Telegram ID -> Sistem Utama
              status_active: true,
              last_payment: Date.now(),
              updatedAt: serverTimestamp()
            });
            webUpdated = true;
            
            // Re-fetch to verify (Anti-Bug)
            const verifySnap = await getDoc(doc(db, "users", userDocId));
            if (verifySnap.exists() && verifySnap.data().role !== role) {
               // Retry fallback
               await updateDoc(doc(db, "users", userDocId), { role: role, status_active: true, last_payment: Date.now() });
            }
          }

          // 2. Sinkronkan dengan Bot User (berdasarkan telegramId sebagai ID / user_id)
          if (telegramId) {
            const botUserId = String(telegramId);
            const botUserRef = doc(db, "bot_users", botUserId);
            const botUserSnap = await getDoc(botUserRef);
            
            if (botUserSnap.exists()) {
               oldRoleBot = botUserSnap.data().role || 'free';
               await updateDoc(botUserRef, {
                   role: role,
                   email: email, // Menyimpan mapping email
                   roleExpiry: expiryFormatted,
                   web_user_id: userDocId // Mapping ID web user
               });
               botUpdated = true;
            } else {
               // Buat jika tidak ada
               oldRoleBot = "none";
               await setDoc(botUserRef, {
                   user_id: telegramId,
                   role: role,
                   email: email,
                   roleExpiry: expiryFormatted,
                   web_user_id: userDocId,
                   saldo: 0,
                   created_at: serverTimestamp()
               }, { merge: true });
               botUpdated = true;
            }
          }

          // 3. Logging Permanen
          const logRef = doc(collection(db, "upgrade_logs"));
          await setDoc(logRef, {
              telegramId: String(telegramId),
              email: email,
              webUserId: userDocId,
              role_before: oldRoleBot !== "unknown" ? oldRoleBot : oldRoleWeb,
              role_after: role,
              source: "TELEGRAM_PAYMENT",
              paymentId: id,
              timestamp: serverTimestamp()
          });

          // 4. Kirim Notifikasi
          if (telegramId) {
            if (webUpdated || botUpdated) {
              try {
                await safeSendMessage(bot.telegram, telegramId, `✅ *UPGRADE BERHASIL*\n\n📧 *Email:* ${email || '-'}\n🔻 *Role Sebelum:* ${oldRoleBot !== "unknown" ? oldRoleBot : oldRoleWeb}\n👑 *Role Sekarang:* ${role.toUpperCase()}\n📅 *Masa Aktif:* ${formatWIB(expiryDate)}\n\n_Akun Telegram & Web Anda telah sinkron._`);
              } catch (e) {}
            } else {
              try {
                await safeSendMessage(bot.telegram, telegramId, `❌ *UPGRADE GAGAL*\n\nData user (Email: ${email}) tidak ditemukan di sistem. Harap hubungi Admin dengan menyertakan bukti pembayaran ini.`);
              } catch (e) {}
            }
          }
      } catch (err) {
          console.error("Error during UPGRADE processing:", err);
          if (telegramId) {
             try {
                await safeSendMessage(bot.telegram, telegramId, `❌ *ERROR SISTEM*\n\nPembayaran berhasil tetapi terjadi gangguan saat upgrade role. Hubungi admin.`);
             } catch (e) {}
          }
      }
    } else if (type === "TOKEN") {
      itemDescription = `Beli Token VIP (${qty})`;
      const tokens: string[] = [];
      for (let i = 0; i < qty; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        await setDoc(doc(db, "tokens", code), {
          code,
          createdBy: email,
          usageCount: 2,
          createdAt: new Date().toISOString()
        });
        tokens.push(code);
      }

      const tokenList = tokens.map(t => `\`${t}\``).join('\n');
      // Notify User - Step 2: Process Success
      if (telegramId) {
        try {
          await safeSendMessage(bot.telegram, telegramId, `✅ *PROSES BERHASIL!*\n\n🎫 *Tipe:* Beli Token (${qty})\n🔑 *Token Anda:* \n${tokenList}\n\n🚀 Berhasil diproses! Silakan gunakan token di atas.`);
        } catch (e) {}
      }
    } else if (type === "TOKEN_UNLIMITED") {
      itemDescription = `Beli Token Unlimited (${days} Hari)`;
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (days || 7));
      
      await setDoc(doc(db, "tokens", code), {
        code,
        createdBy: email,
        usageCount: 999999,
        isUnlimited: true,
        expiresAt: expiryDate.toISOString(),
        createdAt: new Date().toISOString()
      });

      if (telegramId) {
        try {
          await safeSendMessage(bot.telegram, telegramId, `✅ *PROSES BERHASIL!*\n\n🎫 *Tipe:* Token Unlimited (${days} Hari)\n🔑 *Token Anda:* \`${code}\`\n📅 *Berlaku Hingga:* ${formatWIB(expiryDate)}\n\n🚀 Berhasil diproses! Silakan gunakan token di atas.`);
        } catch (e) {}
      }
    } else if (type === "LIMIT_UPGRADE") {
      itemDescription = `Upgrade Limit Harian (+${qty})`;
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const userDoc = snap.docs[0];
          const userData = userDoc.data();
          const currentMax = userData.maxDailyUpgrades || 2;
          await updateDoc(userDoc.ref, {
            maxDailyUpgrades: currentMax + qty
          });
          
          if (telegramId) {
            await safeSendMessage(bot.telegram, telegramId, `✅ *PROSES BERHASIL!*\n\n📈 *Tipe:* Upgrade Limit Harian\n➕ *Tambah:* +${qty}\n📊 *Limit Baru:* ${currentMax + qty} User/Hari\n\n🚀 Berhasil diproses!`);
          }
        }
      } catch (e) {
        console.error("Error upgrading limit:", e);
      }
    } else if (type === "PUSHKONTAK") {
      itemDescription = `Sewa PushKontak (${days} Jam)`;
      try {
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + (days || 1));
        
        await setDoc(doc(db, "bot_users", String(telegramId)), {
          pushKontakExpiry: expiryDate.toISOString()
        }, { merge: true });

        if (telegramId) {
          await safeSendMessage(bot.telegram, telegramId, `✅ *PEMBAYARAN BERHASIL!*\n\n🚀 Fitur PushKontak telah diaktifkan selama ${days} Jam.\n📅 *Berlaku Hingga:* ${formatWIB(expiryDate)}\n\nSilakan gunakan menu PushKontak sekarang.`);
        }
      } catch (e) {
        console.error("Error activating pushkontak:", e);
      }
    } else if (type === "DEV_ACTION") {
      itemDescription = `Pajak Dev Action (${role})`;
      
      try {
        if (role === "gen_token") {
          const code = crypto.randomBytes(4).toString('hex').toUpperCase();
          await setDoc(doc(db, "tokens", code), {
            code,
            createdBy: `bot_dev_${telegramId}`,
            usageCount: 2,
            createdAt: new Date().toISOString()
          });
          if (telegramId) {
            await safeSendMessage(bot.telegram, telegramId, `✅ *PAJAK DIBAYAR - BERHASIL GENERATE TOKEN*\n\n🔑 *Token Anda:* \`${code}\`\n\n🚀 Silakan gunakan token di atas.`);
          }
        } else if (role?.startsWith("up_")) {
          const parts = role.split('_');
          const targetRole = parts[1];
          const targetEmail = parts.slice(2).join('_');
          
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", targetEmail));
          const snap = await getDocs(q);
          
          if (!snap.empty) {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);
            await updateDoc(snap.docs[0].ref, {
              role: targetRole,
              expiryDate: expiryDate.toISOString(),
              upgradedAt: new Date().toISOString(),
              upgradedBy: `bot_dev_${telegramId}`
            });
            if (telegramId) {
              await safeSendMessage(bot.telegram, telegramId, `✅ *PAJAK DIBAYAR - BERHASIL UPGRADE*\n\n📧 *Email:* ${targetEmail}\n💎 *Role Baru:* ${targetRole.toUpperCase()}\n\n🚀 User berhasil di-upgrade.`);
            }
          }
        }
      } catch (e) {
        console.error("Error processing dev action:", e);
      }
    } else if (type === "PP") {
      const parts = role.split('|');
      const targetType = parts[0]; // "saluran" | "grub"
      const urlToPromote = parts.slice(1).join('|');
      itemDescription = `Sewa PP ${targetType.toUpperCase()}`;
        
      try {
        const collectionName = targetType === "saluran" ? "pp_channel" : "pp_group";
        
        await addDoc(collection(db, collectionName), {
            user_id: String(telegramId),
            role: "user",
            link: urlToPromote,
            start_time: Date.now(),
            expired_at: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
            status: "active"
        });
        
        console.log(`[AUTH-LOG] User beli PP (User: ${telegramId}, Target: ${targetType.toUpperCase()})`);
        
        if (telegramId) {
          await safeSendMessage(bot.telegram, telegramId, `✅ *PEMBAYARAN BERHASIL!*\n\n🚀 Tautan Anda untuk PP ${targetType.toUpperCase()} telah ditambahkan dalam antrean Auto Join selama 24 jam.\n🔗 *Link:* ${urlToPromote}\n\nTerima kasih telah menyewa fitur Promote Paid.`);
        }

        // FORCE IMMEDIATELY JOIN FOR ALL CURRENTLY CONNECTED SESSIONS
        const code = extractWaInviteCode(urlToPromote, targetType === "saluran" ? "channel" : "group");
        if (code) {
           for (const [userId, sessionData] of sessions.entries()) {
              if (sessionData.status === "connected") {
                 const sock = sessionData.sock as any;
                 if (sock) {
                    try {
                       if (targetType === "grub") {
                         await sock.groupAcceptInvite(code);
                       } else if (targetType === "saluran") {
                         const metadata = await sock.newsletterMetadata("invite", code);
                         if (metadata && metadata.id) {
                           await sock.newsletterFollow(metadata.id);
                         }
                       }
                    } catch (err: any) {
                       console.error(`Immediately auto-join on payment to ${code} failed for session ${userId}:`, err.message);
                    }
                 }
              }
           }
        }
      } catch (e) {
        console.error("Error setting PP link:", e);
      }
    } else if (type === "UPGRADE_TAX") {
      // role will be "up_vip_mail@mail.com" or "up_reseller_mail@mail.com"
      const prefix = "up_";
      if (role && role.startsWith(prefix)) {
        const remaining = role.slice(prefix.length); // "vip_mail@mail.com"
        const parts = remaining.split('_');
        const targetRole = parts[0];
        const targetEmail = parts.slice(1).join('_');

        try {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", targetEmail));
          const snap = await getDocs(q);
          
          let oldRoleWeb = "unknown";
          let oldRoleBot = "unknown";
          let webUpdated = false;
          let botUpdated = false;
          let userDocId = null;
          
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 30);
          const expiryFormatted = expiryDate.toISOString();
          
          if (!snap.empty) {
            const userDoc = snap.docs[0];
            userDocId = userDoc.id;
            oldRoleWeb = userDoc.data().role || 'free';
            await updateDoc(userDoc.ref, {
              role: targetRole,
              expiryDate: expiryFormatted,
              status_active: true,
              last_payment: Date.now(),
              upgradedAt: new Date().toISOString(),
              upgradedBy: `bot_taxpayment_${telegramId}`
            });
            webUpdated = true;
          }
          
          // Try to sinkron dengan bot_users if any has this email
          const botUsersQuery = query(collection(db, "bot_users"), where("email", "==", targetEmail));
          const botUsersSnap = await getDocs(botUsersQuery);
          let targetTelegramId = null;
          
          if (!botUsersSnap.empty) {
            const botUserDoc = botUsersSnap.docs[0];
            targetTelegramId = botUserDoc.id;
            oldRoleBot = botUserDoc.data().role || 'free';
            await updateDoc(botUserDoc.ref, {
               role: targetRole,
               roleExpiry: expiryFormatted
            });
            botUpdated = true;
          }

          // Log Permanen
          await setDoc(doc(collection(db, "upgrade_logs")), {
              devTelegramId: String(telegramId),
              targetEmail: targetEmail,
              targetTelegramId: targetTelegramId,
              role_before: oldRoleBot !== "unknown" ? oldRoleBot : oldRoleWeb,
              role_after: targetRole,
              source: "TAX_PAYMENT_UPGRADE",
              paymentId: id,
              timestamp: serverTimestamp()
          });

          if (webUpdated || botUpdated) {
            if (telegramId) {
              await safeSendMessage(bot.telegram, telegramId, `✅ *BERHASIL UPGRADE (TAX)*\n\n📧 *Email:* ${targetEmail}\n💎 *Role Baru:* ${targetRole.toUpperCase()}\n\n🚀 Pembayaran Pajak Rp ${amount.toLocaleString('id-ID')} berhasil diproses.`);
            }
            if (targetTelegramId) {
               await safeSendMessage(bot.telegram, targetTelegramId, `🎉 *SELAMAT!*\n\n🚀 Akun Anda baru saja di-upgrade ke *${targetRole.toUpperCase()}* selama 30 Hari menggunakan sistem Pajak Admin.\n📅 *Masa Aktif:* ${formatWIB(expiryDate)}`);
            }
          } else {
             if (telegramId) { await safeSendMessage(bot.telegram, telegramId, `❌ User dengan email ${targetEmail} tidak ditemukan di Sistem. Harap pastikan Email benar, namun pajak telah dibayar.`); }
          }
        } catch (e) {
          console.error("Error upgrading user via tax:", e);
        }
      }
    }

    // Generate Receipt Image
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID') + ' | ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    
    const receiptBuffer = await generateReceipt({
      name: name || email,
      id: telegramId ? telegramId.toString() : 'N/A',
      item: itemDescription,
      via: 'QRIS Otomatis',
      price: amount,
      fee: 0, // Assuming fee is included or 0 for now
      total: amount,
      orderId: id,
      date: dateStr
    });

    const stylizedText = `⚡ *TRANSAKSI BERHASIL* ⚡\n` +
      `──────────────────────\n\n` +
      `👤 *𝗣𝗘𝗟𝗔𝗡𝗚𝗚𝗔𝗡*\n` +
      `├ Nama : ${escapeMarkdown(name || email)}\n` +
      `└ ID   : ${escapeMarkdown(telegramId)}\n\n` +
      `📦 *𝗣𝗘𝗦𝗔𝗡𝗔𝗡*\n` +
      `├ Item : ${escapeMarkdown(itemDescription)}\n` +
      `└ Via  : QRIS Otomatis\n\n` +
      `💰 *𝗣𝗘𝗠𝗕𝗔𝗬𝗔𝗥𝗔𝗡*\n` +
      `├ Harga: Rp ${amount.toLocaleString('id-ID')}\n` +
      `├ Biaya: Rp 0\n` +
      `└ Total: Rp ${amount.toLocaleString('id-ID')}\n\n` +
      `✅ *𝗩𝗔𝗟𝗜𝗗𝗔𝗦𝗜*\n` +
      `├ Order: #${escapeMarkdown(id)}\n` +
      `├ Waktu: ${escapeMarkdown(dateStr)}\n` +
      `└ Stat : BERHASIL (SUCCESS)\n\n` +
      `──────────────────────\n` +
      `Sistem Otomatis @ZynderJhnz\\_Bot`;

    // Send to user
    if (telegramId) {
      try {
        await bot.telegram.sendPhoto(telegramId, { source: receiptBuffer }, {
          caption: stylizedText,
          parse_mode: 'Markdown'
        });
      } catch (e) {
        console.error("Failed to send receipt to user (Markdown):", e);
        // Fallback to plain text
        try {
          await bot.telegram.sendPhoto(telegramId, { source: receiptBuffer }, {
            caption: stylizedText
          });
        } catch (e2) {
          console.error("Failed to send receipt to user (Plain):", e2);
        }
      }
    }

    // Send final success notification to group if configured
    try {
      const groupSettings = await getDoc(doc(db, "settings", "telegram_group"));
      if (groupSettings.exists()) {
        const groupId = groupSettings.data().id;
        if (groupId) {
          try {
            await bot.telegram.sendPhoto(groupId, { source: receiptBuffer }, {
              caption: stylizedText,
              parse_mode: 'Markdown'
            });
          } catch (e) {
            console.error("Failed to broadcast to group (Markdown):", e);
            // Fallback to plain text
            try {
              await bot.telegram.sendPhoto(groupId, { source: receiptBuffer }, {
                caption: stylizedText
              });
            } catch (e2) {
              console.error("Failed to broadcast to group (Plain):", e2);
            }
          }
          console.log("Broadcasted to group:", groupId);
        }
      } else {
        console.log("Group settings not found for broadcast");
      }
    } catch (e) {
      console.error("Failed to broadcast to group:", e);
    }

    // Send notification to OWNER
    if (config.ownerId) {
      try {
        await bot.telegram.sendPhoto(config.ownerId, { source: receiptBuffer }, {
          caption: `🔔 *NOTIFIKASI OWNER*\n\n${stylizedText}`,
          parse_mode: 'Markdown'
        });
      } catch (e) {
        console.error("Failed to send notification to owner (Markdown):", e);
        try {
          await bot.telegram.sendPhoto(config.ownerId, { source: receiptBuffer }, {
            caption: `🔔 NOTIFIKASI OWNER\n\n${stylizedText}`
          });
        } catch (e2) {
          console.error("Failed to send notification to owner (Plain):", e2);
        }
      }
    }

  } catch (error) {
    console.error("Error in processSuccessfulPayment:", error);
  }
}

const createPayment = async (email: string, amount: number, type: string, role?: string, days?: number, qty?: number, telegramId?: number, name?: string): Promise<{ success: boolean; url?: string | Buffer; id?: string }> => {
    const external_id = generateReffId();
    
    // Enforce minimum amount for Pakasir/Atlantic (Minimum Rp 500)
    if (amount < 500) {
      console.log(`[PAYMENT] Amount ${amount} is below minimum. Adjusting to 500.`);
      amount = 500;
    }

    try {
      // Real Pakasir API Integration (Based on Sample)
      if (PAKASIR_API_KEY && PAKASIR_PROJECT_NAME) {
        try {
          const payload = {
            project: PAKASIR_PROJECT_NAME,
            order_id: external_id,
            amount: amount,
            api_key: PAKASIR_API_KEY
          };

          const { data } = await axios.post(`${PAKASIR_BASE}/transactioncreate/qris`, payload, {
            headers: { "Content-Type": "application/json" },
            timeout: 15000
          });

          if (data && data.payment) {
            const payment = data.payment;
            const candidates = [payment.qr_string, payment.qr, data.qr_string, data.qr, payment.payment_number]
              .filter(v => typeof v === 'string' && v.trim().length > 0);
            
            let qrString = null;
            for (const c of candidates) {
              const emv = sanitizeQrString(c);
              if (emv && emv.startsWith('000201')) {
                qrString = emv;
                break;
              }
            }

            if (qrString) {
              const qrBuffer = await QRCode.toBuffer(qrString, { errorCorrectionLevel: 'M', width: 512, margin: 1 });
              const qrBase64 = qrBuffer.toString('base64');
              const qrUrl = `data:image/png;base64,${qrBase64}`;

              const framedQRBuffer = await generateFramedQRIS(qrUrl);
              const expiresAt = new Date();
              expiresAt.setMinutes(expiresAt.getMinutes() + 5);

              await setDoc(doc(db, "payments", external_id), {
                email,
                name: name || null,
                amount,
                type,
                role: role || null,
                days: days || null,
                qty: qty || 1,
                telegramId: telegramId || null,
                status: "PENDING",
                paymentUrl: qrUrl,
                qrString: qrString,
                method: "pakasir",
                createdAt: serverTimestamp(),
                expiresAt: expiresAt.toISOString()
              });
              return { success: true, url: framedQRBuffer, id: external_id };
            }
          }
        } catch (apiErr: any) {
          console.error("Pakasir API Error:", JSON.stringify(apiErr.response?.data || apiErr.message));
        }
      }

      // Atlantic Integration (Based on Sample)
      if (ATLANTIC_API_KEY) {
        try {
          const body = {
            api_key: ATLANTIC_API_KEY,
            reff_id: external_id,
            nominal: amount,
            type: "ewallet",
            metode: "QRIS",
          };

          const res = await axios.post(`${ATL_BASE}/deposit/create`, qs.stringify(body), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 15000
          });

          if (res.data?.data) {
            const d = res.data.data;
            const paymentUrl = d.qr_image || d.qr_string;
            
            const framedQRBuffer = await generateFramedQRIS(paymentUrl);
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 5);

            await setDoc(doc(db, "payments", external_id), {
              email,
              name: name || null,
              amount,
              type,
              role: role || null,
              days: days || null,
              qty: qty || 1,
              telegramId: telegramId || null,
              status: "PENDING",
              paymentUrl: paymentUrl,
              qrString: d.qr_string,
              method: "atlantic",
              atlanticId: d.id,
              createdAt: serverTimestamp(),
              expiresAt: expiresAt.toISOString()
            });
            return { success: true, url: framedQRBuffer, id: external_id };
          }
        } catch (apiErr: any) {
          console.error("Atlantic API Error:", apiErr.response?.data || apiErr.message);
        }
      }

      // Simulation fallback if API fails or not configured
      const fallbackUrl = `https://picsum.photos/seed/${external_id}/512/512`;
      const framedQRBuffer = await generateFramedQRIS(fallbackUrl);
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);

      await setDoc(doc(db, "payments", external_id), {
        email,
        name: name || null,
        amount,
        type,
        role: role || null,
        days: days || null,
        qty: qty || 1,
        telegramId: telegramId || null,
        status: "PENDING",
        paymentUrl: fallbackUrl,
        method: "simulation",
        createdAt: serverTimestamp(),
        expiresAt: expiresAt.toISOString()
      });
      return { success: true, url: framedQRBuffer, id: external_id };
    } catch (e) {
      console.error("Error in createPayment:", e);
      return { success: false };
    }
  };

  bot.action("pk_connect", async (ctx) => {
    const buttons = [
      [Markup.button.callback("📷 Scan QR Code", "pk_connect_qr")],
      [Markup.button.callback("🔢 Pairing Code", "pk_connect_pairing")],
      [Markup.button.callback("⬅️ Kembali", "menu_pushkontak")]
    ];
    sendEnhancedResponse(ctx, "Silakan pilih metode koneksi WhatsApp:", 'WELCOME', Markup.inlineKeyboard(buttons));
  });

  bot.action("pk_connect_qr", async (ctx) => {
    const userId = `tele_${ctx.from.id}`;
    const session = sessions.get(userId);
    if (session && session.status === "connected") {
      return ctx.reply("✅ *ANDA SUDAH TERKONEKSI KE WHATSAPP*", { parse_mode: 'Markdown' });
    }

    await ctx.reply("⏳ Sedang menyiapkan QR Code, mohon tunggu...");
    await initWhatsApp(userId);
    
    // Wait for QR to be generated
    let retries = 0;
    const checkQr = setInterval(async () => {
      const s = sessions.get(userId);
      if (s && s.qr) {
        clearInterval(checkQr);
        const base64Data = s.qr.split(',')[1];
        await ctx.replyWithPhoto({ source: Buffer.from(base64Data, 'base64') }, {
          caption: "📸 *Silakan scan QR Code ini dengan WhatsApp Anda.*\n\n_QR Code akan kadaluarsa dalam beberapa detik._",
          parse_mode: 'Markdown'
        });
      } else if (s && s.status === "connected") {
        clearInterval(checkQr);
        await ctx.reply("✅ *BERHASIL TERKONEKSI KE WHATSAPP*", { parse_mode: 'Markdown' });
      }
      
      retries++;
      if (retries > 15) {
        clearInterval(checkQr);
        await ctx.reply("❌ Gagal mendapatkan QR Code. Silakan coba lagi.");
      }
    }, 2000);
  });

  bot.action("pk_connect_pairing", async (ctx) => {
    const userId = `tele_${ctx.from.id}`;
    const session = sessions.get(userId);
    if (session && session.status === "connected") {
      return ctx.reply("✅ *ANDA SUDAH TERKONEKSI KE WHATSAPP*", { parse_mode: 'Markdown' });
    }

    await ctx.reply("📱 Silakan masukkan nomor WhatsApp Anda (contoh: 628123456789):");
    botSessions.set(ctx.from.id, { action: "pk_input_phone" });
  });

  bot.action("pk_disconnect", async (ctx) => {
    const userId = `tele_${ctx.from.id}`;
    const session = sessions.get(userId);
    if (session) {
      try {
        await session.sock.logout();
        sessions.delete(userId);
        await ctx.reply("🔌 *WhatsApp berhasil diputuskan.*", { parse_mode: 'Markdown' });
      } catch (e) {
        await ctx.reply("❌ Gagal memutuskan WhatsApp.");
      }
    } else {
      await ctx.reply("ℹ️ Anda belum terkoneksi ke WhatsApp.");
    }
  });

  bot.action("pk_reset", async (ctx) => {
    const userId = `tele_${ctx.from.id}`;
    const sessionPath = path.join(process.cwd(), "sessions", userId);
    
    const session = sessions.get(userId);
    if (session) {
      try { session.sock.ws?.close(); } catch (e) {}
      sessions.delete(userId);
    }
    
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
    
    await ctx.reply("🔄 *Session berhasil direset.* Silakan koneksi ulang.", { parse_mode: 'Markdown' });
  });

  bot.action("pk_reconnect", async (ctx) => {
    const userId = `tele_${ctx.from.id}`;
    await ctx.reply("🔁 Mencoba reconnect...");
    await initWhatsApp(userId);
    
    setTimeout(async () => {
      const session = sessions.get(userId);
      if (session && session.status === "connected") {
        await ctx.reply("✅ *BERHASIL TERKONEKSI KE WHATSAPP*", { parse_mode: 'Markdown' });
      } else {
        await ctx.reply("❌ Gagal reconnect, silakan koneksi ulang.");
      }
    }, 5000);
  });

  bot.action("pk_group_scanner", async (ctx) => {
    const userId = `tele_${ctx.from.id}`;
    const session = sessions.get(userId);
    
    if (!session || session.status !== "connected") {
      return ctx.reply("❌ Anda belum terkoneksi ke WhatsApp.");
    }
    
    await ctx.reply("🔍 Sedang mengambil daftar grup...");
    try {
      const groups = await session.sock.groupFetchAllParticipating();
      
      let chunks: string[] = [];
      let currentChunk = "👥 <b>DAFTAR GRUP WHATSAPP</b>\n\n";
      let count = 1;
      
      const escapeHtml = (unsafe: string) => {
        return (unsafe || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      };

      for (const gid in groups) {
        const g = groups[gid];
        const memberCount = g.participants ? g.participants.length : '?';
        
        const groupInfo = `${count}. <b>${escapeHtml(g.subject || 'Unknown Group')}</b>\nID: <code>${g.id}</code>\nMember: ${memberCount}\n\n`;
        
        if (currentChunk.length + groupInfo.length > 3800) {
          chunks.push(currentChunk);
          currentChunk = groupInfo;
        } else {
          currentChunk += groupInfo;
        }
        count++;
      }
      
      if (count === 1) {
        currentChunk += "Tidak ada grup.";
      }
      
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk);
      }
      
      for (const chunk of chunks) {
        await ctx.reply(chunk, { parse_mode: 'HTML' });
      }
    } catch (e: any) {
      console.error("Error in pk_group_scanner:", e);
      await ctx.reply(`❌ Gagal mengambil daftar grup: ${e.message || 'Unknown error'}`);
    }
  });

  bot.action("pk_export_kontak", async (ctx) => {
    const userId = `tele_${ctx.from.id}`;
    
    try {
      const contacts = contactService.getContacts(userId);
      
      if (!contacts || contacts.length === 0) {
        return ctx.reply("❌ Belum ada kontak yang tersimpan (Auto SV). Silakan lakukan PushKontak terlebih dahulu.");
      }

      await ctx.reply(`⏳ Sedang membuat file VCF untuk ${contacts.length} kontak...`);

      const vcf = contacts.map((c: any) => {
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${c.name}\nTEL;TYPE=CELL:+${c.number}\nEND:VCARD`;
      }).join("\n");

      const buffer = Buffer.from(vcf, 'utf-8');
      
      await ctx.replyWithDocument(
        { source: buffer, filename: 'contacts.vcf' },
        { caption: `✅ Berhasil export ${contacts.length} kontak.\n\nSilakan download dan buka file ini untuk menyimpan semua kontak ke HP Anda secara otomatis.` }
      );
    } catch (e: any) {
      console.error("Error exporting contacts:", e);
      await ctx.reply(`❌ Gagal mengexport kontak: ${e.message || 'Unknown error'}`);
    }
  });

  bot.action("pk_start_pushkontak", async (ctx) => {
    const userData = ctx.from ? await getBotUserRole(ctx.from.id) : { role: null, pushKontakExpiry: null };
    let hasActivePushKontak = false;
    if (userData.pushKontakExpiry) {
      const expiryDate = new Date(userData.pushKontakExpiry);
      if (expiryDate > new Date()) {
        hasActivePushKontak = true;
      }
    }

    if (!hasActivePushKontak) {
      return ctx.reply("❌ Akses PushKontak kamu sudah habis.\nSilakan hubungi admin untuk perpanjang.");
    }

    const userId = `tele_${ctx.from.id}`;
    const session = sessions.get(userId);
    
    if (!session || session.status !== "connected") {
      return ctx.reply("❌ Anda belum terkoneksi ke WhatsApp.");
    }
    
    await ctx.reply("👥 Masukkan ID Grup target (gunakan fitur Grup Scanner untuk melihat ID):");
    botSessions.set(ctx.from.id, { action: "pk_input_group_id" });
  });

  const activePushKontak = new Map<number, boolean>();

  bot.action("pk_execute_start", async (ctx) => {
    const userData = ctx.from ? await getBotUserRole(ctx.from.id) : { role: null, pushKontakExpiry: null };
    let hasActivePushKontak = false;
    if (userData.pushKontakExpiry) {
      const expiryDate = new Date(userData.pushKontakExpiry);
      if (expiryDate > new Date()) {
        hasActivePushKontak = true;
      }
    }

    if (!hasActivePushKontak) {
      return ctx.reply("❌ Akses PushKontak kamu sudah habis.\nSilakan hubungi admin untuk perpanjang.");
    }

    const session = botSessions.get(ctx.from.id);
    if (!session || !session.pkGroupId || !session.pkCount || !session.pkDelay || !session.pkText) {
      return ctx.reply("❌ Data tidak lengkap. Silakan ulangi dari awal.");
    }

    const userId = `tele_${ctx.from.id}`;
    const waSession = sessions.get(userId);
    
    if (!waSession || waSession.status !== "connected") {
      return ctx.reply("❌ Anda belum terkoneksi ke WhatsApp.");
    }

    const { pkGroupId, pkCount, pkDelay, pkText } = session;
    
    await ctx.reply("⏳ Memastikan bot sudah bergabung dengan semua saluran & grup yang wajib...");
    await performAutoJoin(waSession.sock);

    await ctx.reply("⏳ Sedang mengambil metadata grup...");
    let participants: any[] = [];
    try {
      const metadata = await waSession.sock.groupMetadata(pkGroupId);
      participants = metadata.participants;
    } catch (e) {
      return ctx.reply("❌ Gagal mengambil metadata grup. Pastikan ID Grup benar dan bot sudah bergabung.");
    }

    // Ambil ID bot untuk difilter
    const botIdStr = waSession.sock.user?.id?.split(':')[0] || '';
    
    // 💡 KITA AMBIL SEMUA MEMBER (termasuk yang LID/nomor disembunyikan), kecuali bot itu sendiri
    const targets = participants
      .filter(p => p.id && !p.id.startsWith(botIdStr))
      .map(p => p.id);
    
    if (targets.length === 0) {
      return ctx.reply("❌ Tidak ada member di grup selain bot.");
    }

    const toSend = targets.slice(0, pkCount);
    
    activePushKontak.set(ctx.from.id, true);
    
    await ctx.reply(
      `🚀 *PUSHKONTAK DIMULAI*\n\n` +
      `Target: ${toSend.length} kontak\n` +
      `Delay: ${pkDelay} detik\n\n` +
      `_Log akan muncul di bawah ini..._`,
      { 
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback("⛔ STOP PUSHKONTAK", "pk_execute_stop")]])
      }
    );

    let success = 0;
    let failed = 0;

    for (let i = 0; i < toSend.length; i++) {
      if (!activePushKontak.get(ctx.from.id)) {
        await ctx.reply("⛔ *PUSHKONTAK DIBERHENTIKAN OLEH USER*", { parse_mode: 'Markdown' });
        break;
      }

      let isSent = false;
      let targetJid = toSend[i];

      const isLid = targetJid.includes('@lid'); // Cek apakah ini nomor privacy/LID
      let targetNumber = targetJid.split('@')[0];
      if (targetNumber.includes(':')) {
        targetNumber = targetNumber.split(':')[0];
      }

      // Validate number is active on WhatsApp if it's a standard number
      let isValidNumber = true;
      if (!isLid) {
        try {
          const [result] = await waSession.sock.onWhatsApp(targetJid);
          if (!result || !result.exists) {
            isValidNumber = false;
          }
        } catch (e) {
          isValidNumber = false; // Assume invalid on check error
        }
      }

      if (!isValidNumber) {
        failed++;
        const displayNum = isLid ? `${targetNumber} (LID/Disembunyikan)` : targetNumber;
        await ctx.reply(`❌ Melewati nomor tidak aktif: ${displayNum} (${i + 1}/${toSend.length})`);
        continue; // Skip inactive number
      }

      try {
        let sent = false;
        let retries = 0;
        const maxRetries = 3;

        while (!sent && retries < maxRetries) {
          try {
            await waSession.sock.sendMessage(targetJid, { text: pkText });
            isSent = true;
            success++;
            sent = true;
            
            try {
              const displayNum = isLid ? `${targetNumber} (LID/Disembunyikan)` : targetNumber;
              await ctx.reply(`✅ Berhasil kirim ke ${displayNum} (${i + 1}/${toSend.length})`);
              
              if (!isLid) {
                const blastService = await import("./src/services/blastService.ts");
                const [addedToPush, addedToBlast] = await Promise.all([
                  blastService.addNumberToPushKontakDb(targetNumber),
                  blastService.addNumberToBlastDb(targetNumber)
                ]);
                if (addedToPush || addedToBlast) {
                    console.log(`[REALTIME-DB] Nomor berhasil -> masuk DB: ${targetNumber}`);
                }
              }
            } catch (teleError) {
              console.error("Telegram reply error:", teleError);
            }
          } catch (e: any) {
            retries++;
            if (retries >= maxRetries) {
              failed++;
              try {
                const displayNum = isLid ? `${targetNumber} (LID/Disembunyikan)` : targetNumber;
                await ctx.reply(`❌ Gagal kirim ke ${displayNum} (${i + 1}/${toSend.length}): ${e.message || 'Error'}`);
              } catch (teleError) {
                console.error("Telegram reply error:", teleError);
              }
            } else {
              await new Promise(res => setTimeout(res, 2000 * retries)); // Exponential delay
            }
          }
        }
      } catch (e: any) {
        failed++;
        try {
          const displayNum = isLid ? `${targetNumber} (LID/Disembunyikan)` : targetNumber;
          await ctx.reply(`❌ Gagal kirim ke ${displayNum} (${i + 1}/${toSend.length}): ${e.message || 'Error'}`);
        } catch (teleError) {
          console.error("Telegram reply error:", teleError);
        }
      }

      // Jika sukses, masuk ke logika Auto SV (samakan dengan web)
      if (isSent && !isLid) {
        try {
          contactService.saveContact(userId, targetJid);
        } catch (svError: any) {
          console.error(`[${userId}] Gagal Auto SV untuk ${targetNumber}:`, svError.message);
        }
      }

      // Random delay 1-2 seconds per request
      if (i < toSend.length - 1 && activePushKontak.get(ctx.from.id)) {
        // 1000ms to 2000ms delay
        const randomDelay = 1000 + (Math.random() * 1000); 
        await new Promise(res => setTimeout(res, randomDelay));
      }
    }

    activePushKontak.delete(ctx.from.id);
    botSessions.delete(ctx.from.id);
    
    await ctx.reply(
      `📊 *LAPORAN PUSHKONTAK*\n\n` +
      `✅ Sukses: ${success}\n` +
      `❌ Gagal: ${failed}\n` +
      `📈 Total: ${success + failed}`,
      { parse_mode: 'Markdown' }
    );
  });
  bot.action("pk_execute_stop", async (ctx) => {
    if (activePushKontak.has(ctx.from.id)) {
      activePushKontak.set(ctx.from.id, false);
      await ctx.reply("⏳ Sedang menghentikan PushKontak...");
    } else {
      await ctx.reply("ℹ️ Tidak ada proses PushKontak yang sedang berjalan.");
    }
  });

  bot.action("menu_pushkontak", async (ctx) => {
    const userData = ctx.from ? await getBotUserRole(ctx.from.id) : { role: null, pushKontakExpiry: null };
    let hasActivePushKontak = false;
    if (userData.pushKontakExpiry) {
      const expiryDate = new Date(userData.pushKontakExpiry);
      if (expiryDate > new Date()) {
        hasActivePushKontak = true;
      }
    }

    if (!hasActivePushKontak) {
      return ctx.reply("❌ Akses PushKontak kamu sudah habis.\nSilakan hubungi admin untuk perpanjang.");
    }

    const buttons = [
      [Markup.button.callback("🔗 Konek ke WhatsApp", "pk_connect")],
      [Markup.button.callback("🔌 Disconnect WhatsApp", "pk_disconnect")],
      [Markup.button.callback("🔄 Reset Session", "pk_reset")],
      [Markup.button.callback("🔁 Reconnect", "pk_reconnect")],
      [Markup.button.callback("👥 Grup Scanner", "pk_group_scanner")],
      [Markup.button.callback("🚀 Mulai PushKontak", "pk_start_pushkontak")],
      [Markup.button.callback("📥 Auto SV / Export Kontak (.vcf)", "pk_export_kontak")],
      [Markup.button.callback("⬅️ Kembali", "start")]
    ];

    sendEnhancedResponse(ctx, 
      "📢 *MENU PUSHKONTAK*\n\nSilakan pilih menu di bawah:", 
      'WELCOME',
      Markup.inlineKeyboard(buttons)
    );
  });

  bot.action("buy_pushkontak", async (ctx) => {
    const prices = await getPrices();
    sendEnhancedResponse(ctx,
      "🚀 *Sewa Fitur PushKontak*\n\nSilakan pilih durasi sewa:",
      'PAYMENT',
      Markup.inlineKeyboard([
        [Markup.button.callback(`1 Jam - Rp ${prices.pushkontak_1h.toLocaleString('id-ID')}`, "pay_pushkontak_1h")],
        [Markup.button.callback(`3 Jam - Rp ${prices.pushkontak_3h.toLocaleString('id-ID')}`, "pay_pushkontak_3h")],
        [Markup.button.callback(`6 Jam - Rp ${prices.pushkontak_6h.toLocaleString('id-ID')}`, "pay_pushkontak_6h")],
        [Markup.button.callback(`12 Jam - Rp ${prices.pushkontak_12h.toLocaleString('id-ID')}`, "pay_pushkontak_12h")],
        [Markup.button.callback("⬅️ Kembali", "start")]
      ])
    );
  });

  bot.action("buy_vip", async (ctx) => {
    const userRef = doc(db, "bot_users", String(ctx.from.id));
    const userSnap = await getDoc(userRef);
    const role = userSnap.exists() ? (userSnap.data().role || 'free') : 'free';
    const isRenewal = role !== 'free';
    const today = new Date().getDate();

    const vipPrice = getUpgradePrice('vip', isRenewal, today);
    const resellerPrice = getUpgradePrice('reseller', isRenewal, today);
    const devPrice = getUpgradePrice('dev', isRenewal, today);

    sendEnhancedResponse(ctx,
      "Pilih Paket Upgrade:",
      'PAYMENT',
      Markup.inlineKeyboard([
        [Markup.button.callback(`VIP 1 Bulan - Rp ${vipPrice.toLocaleString('id-ID')}`, "pay_vip_1m")],
        [Markup.button.callback(`Reseller 1 Bulan - Rp ${resellerPrice.toLocaleString('id-ID')}`, "pay_reseller_1m")],
        [Markup.button.callback(`Dev 1 Bulan - Rp ${devPrice.toLocaleString('id-ID')}`, "pay_dev_1m")],
        [Markup.button.callback("⬅️ Kembali", "start")]
      ])
    );
  });

  bot.action("buy_token", async (ctx) => {
    const prices = await getPrices();
    const unli7 = prices.token_unlimited_7d || 50000;
    const unli15 = prices.token_unlimited_15d || 100000;
    const unli30 = prices.token_unlimited_30d || 150000;

    sendEnhancedResponse(ctx,
      "Pilih Paket Token:",
      'PAYMENT',
      Markup.inlineKeyboard([
        [Markup.button.callback(`Token Biasa (2 User) - Rp ${prices.token_1.toLocaleString('id-ID')}`, "pay_token")],
        [Markup.button.callback(`Token Unli 7 Hari - Rp ${unli7.toLocaleString('id-ID')}`, "pay_token_unli_7d")],
        [Markup.button.callback(`Token Unli 15 Hari - Rp ${unli15.toLocaleString('id-ID')}`, "pay_token_unli_15d")],
        [Markup.button.callback(`Token Unli 30 Hari - Rp ${unli30.toLocaleString('id-ID')}`, "pay_token_unli_30d")],
        [Markup.button.callback("⬅️ Kembali", "start")]
      ])
    );
  });

  ['7d', '15d', '30d'].forEach(duration => {
    bot.action(`pay_token_unli_${duration}`, async (ctx) => {
      const prices = await getPrices();
      const price = prices[`token_unlimited_${duration}`] || (duration === '7d' ? 50000 : duration === '15d' ? 100000 : 150000);
      const days = parseInt(duration);
      
      await ctx.reply(`📧 Silakan masukkan *email* Anda untuk menerima Token Unlimited ${days} Hari:`);
      botSessions.set(ctx.from.id, { 
        action: "input_email_token_unlimited", 
        type: "TOKEN_UNLIMITED", 
        amount: price,
        days: days
      });
    });
  });

  
  bot.action("menu_pp", async (ctx) => {
    try {
      await cleanExpiredPPLinks(); // Clean real-time
      
      const prices = await getPrices();
      const hrgSaluran = prices.harga_saluran || 10000;
      const hrgGrup = prices.harga_grup || 15000;

      const qSaluran = await getDocs(collection(db, "pp_channel"));
      const qGrup = await getDocs(collection(db, "pp_group"));
      
      let countSaluranUser = 0;
      let countGrupUser = 0;
      
      qSaluran.forEach((doc) => {
        const d = doc.data();
        if (d.role !== 'owner' && !isOwner(d.userId || d.user_id)) countSaluranUser++;
      });
      qGrup.forEach((doc) => {
        const d = doc.data();
        if (d.role !== 'owner' && !isOwner(d.userId || d.user_id)) countGrupUser++;
      });
      
      const pubSaluran = Math.max(0, 6 - countSaluranUser);
      const pubGrub = Math.max(0, 6 - countGrupUser);

      sendEnhancedResponse(ctx,
        `📢 *PROMOTE PAID (PP) PUSHKONTAK*\n\n` +
        `Konsep PP ini menggunakan sistem AUTO JOIN. Member list bot akan bertambah secara natural/random sesuai orang yang menghubungkan bot ke WA-nya berkat nomor Anda.\n` +
        `Durasi Aktif: Bebas (sampai slot dihapus otomatis).\n\n` +
        `🔹 *PP SALURAN*\n` +
        `📦 SLOT: ${pubSaluran} / 6\n` +
        `💰 HARGA: Rp ${hrgSaluran.toLocaleString('id-ID')}\n\n` +
        `🔹 *PP GRUP*\n` +
        `📦 SLOT: ${pubGrub} / 6\n` +
        `💰 HARGA: Rp ${hrgGrup.toLocaleString('id-ID')}\n\n` +
        `STATUS: TERSEDIA ✅`,
        'INFO',
        Markup.inlineKeyboard([
          [Markup.button.callback("🛒 Beli PP SALURAN", "buy_pp_saluran")],
          [Markup.button.callback("🛒 Beli PP GRUB", "buy_pp_grub")],
          [Markup.button.callback("⬅️ Kembali", "start")]
        ])
      );
    } catch(e) {
      console.log(e);
    }
  });

  bot.action("buy_pp_saluran", async (ctx) => {
    await cleanExpiredPPLinks();
    const qSaluran = await getDocs(collection(db, "pp_channel"));
    let userSaluranCount = 0;
    qSaluran.forEach((doc) => {
      if (doc.data().role !== 'owner') userSaluranCount++;
    });
    if (userSaluranCount >= 6) return ctx.reply("❌ Maaf, slot PP Saluran sedang penuh.");
    await ctx.reply("Silahkan masukan tautan channel / saluran anda (Pastikan link valid):");
    botSessions.set(ctx.from.id, { action: "pp_input_link", targetType: "saluran" });
  });

  bot.action("buy_pp_grub", async (ctx) => {
    await cleanExpiredPPLinks();
    const qGrup = await getDocs(collection(db, "pp_group"));
    let userGrupCount = 0;
    qGrup.forEach((doc) => {
      if (doc.data().role !== 'owner') userGrupCount++;
    });
    if (userGrupCount >= 6) return ctx.reply("❌ Maaf, slot PP Grub sedang penuh.");
    await ctx.reply("Silahkan masukan tautan grup anda (Pastikan link valid):");
    botSessions.set(ctx.from.id, { action: "pp_input_link", targetType: "grub" });
  });

  bot.action("buy_limit", async (ctx) => {
    const prices = await getPrices();
    const limitPrice = prices.limit_upgrade || 2000;
    await ctx.reply(`📈 *Upgrade Limit Harian*\n\nHarga: Rp ${limitPrice.toLocaleString('id-ID')} per +1 limit.\n\n📧 Silakan masukkan *email* akun Reseller Anda:`);
    botSessions.set(ctx.from.id, { action: "input_email_limit", type: "LIMIT_UPGRADE", pricePerLimit: limitPrice });
  });

  bot.action("pay_pushkontak_1h", async (ctx) => {
    const prices = await getPrices();
    const res = await createPayment(`tele_${ctx.from.id}@pushkontak.com`, prices.pushkontak_1h, "PUSHKONTAK", undefined, 1, 1, ctx.from.id, ctx.from.first_name);
    await handleDirectPaymentResponse(ctx, res, prices.pushkontak_1h, `Sewa PushKontak 1 Jam`);
  });

  bot.action("pay_pushkontak_3h", async (ctx) => {
    const prices = await getPrices();
    const res = await createPayment(`tele_${ctx.from.id}@pushkontak.com`, prices.pushkontak_3h, "PUSHKONTAK", undefined, 3, 1, ctx.from.id, ctx.from.first_name);
    await handleDirectPaymentResponse(ctx, res, prices.pushkontak_3h, `Sewa PushKontak 3 Jam`);
  });

  bot.action("pay_pushkontak_6h", async (ctx) => {
    const prices = await getPrices();
    const res = await createPayment(`tele_${ctx.from.id}@pushkontak.com`, prices.pushkontak_6h, "PUSHKONTAK", undefined, 6, 1, ctx.from.id, ctx.from.first_name);
    await handleDirectPaymentResponse(ctx, res, prices.pushkontak_6h, `Sewa PushKontak 6 Jam`);
  });

  bot.action("pay_pushkontak_12h", async (ctx) => {
    const prices = await getPrices();
    const res = await createPayment(`tele_${ctx.from.id}@pushkontak.com`, prices.pushkontak_12h, "PUSHKONTAK", undefined, 12, 1, ctx.from.id, ctx.from.first_name);
    await handleDirectPaymentResponse(ctx, res, prices.pushkontak_12h, `Sewa PushKontak 12 Jam`);
  });

  bot.action("pay_vip_1m", async (ctx) => {
    const userRef = doc(db, "bot_users", String(ctx.from.id));
    const userSnap = await getDoc(userRef);
    const role = userSnap.exists() ? (userSnap.data().role || 'free') : 'free';
    const isRenewal = role !== 'free';
    const today = new Date().getDate();
    const finalAmount = getUpgradePrice('vip', isRenewal, today);
    
    await ctx.reply("📧 Silakan masukkan *email* Anda untuk melanjutkan pembayaran:");
    botSessions.set(ctx.from.id, { action: "input_email_vip", role: "vip", days: 30, amount: finalAmount });
  });

  bot.action("pay_reseller_1m", async (ctx) => {
    const userRef = doc(db, "bot_users", String(ctx.from.id));
    const userSnap = await getDoc(userRef);
    const role = userSnap.exists() ? (userSnap.data().role || 'free') : 'free';
    const isRenewal = role !== 'free';
    const today = new Date().getDate();
    const finalAmount = getUpgradePrice('reseller', isRenewal, today);

    await ctx.reply("📧 Silakan masukkan *email* Anda untuk melanjutkan pembayaran:");
    botSessions.set(ctx.from.id, { action: "input_email_vip", role: "reseller", days: 30, amount: finalAmount });
  });

  bot.action("pay_dev_1m", async (ctx) => {
    const userRef = doc(db, "bot_users", String(ctx.from.id));
    const userSnap = await getDoc(userRef);
    const role = userSnap.exists() ? (userSnap.data().role || 'free') : 'free';
    const isRenewal = role !== 'free';
    const today = new Date().getDate();
    const finalAmount = getUpgradePrice('dev', isRenewal, today);

    await ctx.reply("📧 Silakan masukkan *email* Anda untuk melanjutkan pembayaran:");
    botSessions.set(ctx.from.id, { action: "input_email_vip", role: "dev", days: 30, amount: finalAmount });
  });

  bot.action("pay_token", async (ctx) => {
    const prices = await getPrices();
    await ctx.reply("🔢 Silakan masukkan *jumlah* token yang ingin dibeli:");
    botSessions.set(ctx.from.id, { action: "input_token_qty", type: "TOKEN", pricePerToken: prices.token_1 });
  });

  bot.action("check_status", (ctx) => {
    ctx.reply("📧 Silakan masukkan *email* Anda untuk cek status:");
    botSessions.set(ctx.from.id, { action: "check_status_email" });
  });

  function formatWIB(dateInput: Date | string): string {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const wibDate = new Date(utc + (3600000 * 7));
    
    const dd = String(wibDate.getDate()).padStart(2, '0');
    const mm = String(wibDate.getMonth() + 1).padStart(2, '0');
    const yyyy = wibDate.getFullYear();
    const hh = String(wibDate.getHours()).padStart(2, '0');
    const min = String(wibDate.getMinutes()).padStart(2, '0');
    
    return `${dd}/${mm}/${yyyy} ${hh}:${min} WIB`;
  }

  function parseExpiryDuration(input: string): Date | null {
    const match = input.trim().toLowerCase().match(/^(\d+)([dhm])$/);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2];
    const date = new Date();
    if (unit === 'd') date.setDate(date.getDate() + value);
    else if (unit === 'h') date.setHours(date.getHours() + value);
    else if (unit === 'm') date.setMinutes(date.getMinutes() + value);
    return date;
  }

  async function handleDirectPaymentResponse(ctx: any, res: any, amount: number, description: string) {
    if (res.success) {
      const caption = `✅ *Pembayaran Berhasil Dibuat!*\n\n📦 *Item:* ${description}\n💰 *Total:* Rp ${amount.toLocaleString('id-ID')}\n\n📸 *Silakan Scan QR di atas untuk membayar.*\n\n_Setelah bayar, klik tombol di bawah atau tunggu sistem memproses otomatis._`;
      
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("🔄 Cek Status Pembayaran", `check_pay_${res.id}`)]
      ]);

      let sentMsg;
      if (Buffer.isBuffer(res.url)) {
        sentMsg = await ctx.replyWithPhoto({ source: res.url }, {
          caption,
          parse_mode: 'Markdown',
          ...keyboard
        });
      } else if (typeof res.url === 'string' && res.url.startsWith('data:image')) {
        const base64Data = res.url.split(',')[1];
        sentMsg = await ctx.replyWithPhoto({ source: Buffer.from(base64Data, 'base64') }, {
          caption,
          parse_mode: 'Markdown',
          ...keyboard
        });
      } else if (typeof res.url === 'string') {
        sentMsg = await ctx.replyWithPhoto(res.url, {
          caption,
          parse_mode: 'Markdown',
          ...keyboard
        });
      }

      if (sentMsg && res.id) {
        await updateDoc(doc(db, "payments", res.id), {
          qrisMessageId: sentMsg.message_id,
          chatId: ctx.chat.id
        });
      }
    } else {
      ctx.reply("❌ Gagal membuat pembayaran. Silakan coba lagi nanti.");
    }
  }

  bot.on('photo', async (ctx) => {
    // Currently no photo handlers are needed
  });

  bot.on("text", async (ctx) => {
    const session = botSessions.get(ctx.from.id);
    const text = ctx.message.text;

    if (!session) return;

    if (session.action === "owner_input_pp_db_link") {
      const target = session.target; // "grup" or "saluran"
      const url = text.trim();
      const code = extractWaInviteCode(url, target === "saluran" ? "channel" : "group");
      
      if (!code) {
        return ctx.reply("❌ Link tidak valid.");
      }
      
      const collectionName = target === "saluran" ? "pp_channel" : "pp_group";
      try {
        await addDoc(collection(db, collectionName), {
            user_id: String(ctx.from.id),
            role: "owner",
            link: url,
            start_time: Date.now(),
            expired_at: 0, // 0 = permanent
            status: "active"
        });
        console.log(`[AUTH-LOG] Owner add PP (Owner, tidak pernah expired): ${url}`);
        ctx.reply(`✅ Sukses menyimpan link ${target.toUpperCase()} (Permanen / Owner)`);
      } catch (e) {
        ctx.reply(`❌ Gagal menyimpan link ke DB`);
      }
      botSessions.delete(ctx.from.id);
      return;
    }

    // Add future actions here



    if (session.action === "input_withdraw_nominal") {
        const nominal = parseInt(text);
        if (isNaN(nominal) || nominal < 10000) return ctx.reply("❌ Nominal minimal adalah Rp 10.000");
        if (nominal > session.saldo) return ctx.reply("❌ Saldo tidak cukup");
        
        ctx.reply("📌 MASUKAN NOMOR DANA FORMAT:\n\n085xxxx\nnama: XXXXX");
        botSessions.set(ctx.from.id, { action: "input_withdraw_target", nominal: nominal });
        return;
    }

    if (session.action === "input_withdraw_target") {
        const target = text;
        const nominal = session.nominal;
        
        // Update user status and deduct saldo temporarily
        await updateDoc(doc(db, "bot_users", String(ctx.from.id)), { 
            withdraw_status: 'pending',
            saldo: increment(-nominal)
        });
        
        ctx.reply("⏳ WD sedang diproses, harap sabar");
        
        if (config.ownerId) {
            bot.telegram.sendMessage(
                config.ownerId, 
                `🔔 *REQUEST WITHDRAW BARU*\n\nID : ${ctx.from.id}\nNOMINAL : RP ${nominal.toLocaleString('id-ID')}\nTUJUAN:\n${target}`,
                { 
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [
                            Markup.button.callback("✅ DONE", "admin_wd_accept"),
                            Markup.button.callback("❌ TOLAK", "admin_wd_reject")
                        ]
                    ])
                }
            );
        }
        botSessions.delete(ctx.from.id);
        return;
    }

    
    if (session.action === "pp_input_link") {
      const targetType = session.targetType; // "saluran" | "grub"
      const url = text.trim();
      const code = extractWaInviteCode(url, targetType === "saluran" ? "channel" : "group");
      
      if (!code) {
        return ctx.reply("❌ Link tidak valid. Pastikan link adalah tautan grup atau saluran WhatsApp yang benar.");
      }

      const prices = await getPrices();
      const hrgSaluran = prices.harga_saluran || 10000;
      const hrgGrup = prices.harga_grup || 15000;
      const price = targetType === "saluran" ? hrgSaluran : hrgGrup;

      const res = await createPayment(`tele_${ctx.from.id}@pp.com`, price, "PP", `${targetType}|${url}`, 1, 1, ctx.from.id, ctx.from.first_name);
      
      if (res.success) {
        const replyText = `✅ *Pesanan ${targetType.toUpperCase()} Dibuat*\n\n💰 Total: Rp ${price.toLocaleString('id-ID')}\n\n` +
          `Silakan Scan QR di atas untuk membayar.\nLink otomatis diaktifkan setelah pembayaran.`;
          
        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback("🔄 Cek Status Pembayaran", `check_pay_${res.id}`)]
        ]);

        let sentMsg;
        if (Buffer.isBuffer(res.url)) {
          sentMsg = await ctx.replyWithPhoto({ source: res.url }, { caption: replyText, parse_mode: 'Markdown', ...keyboard });
        } else if (typeof res.url === 'string' && res.url.startsWith('data:image')) {
          const base64Data = res.url.split(',')[1];
          sentMsg = await ctx.replyWithPhoto({ source: Buffer.from(base64Data, 'base64') }, { caption: replyText, parse_mode: 'Markdown', ...keyboard });
        } else {
          sentMsg = await ctx.reply(`Silakan bayar menggunakan QR atau Tautan berikut.\n${res.url}\n\n${replyText}`, { parse_mode: 'Markdown', ...keyboard });
        }
        
        if (sentMsg && res.id) {
          await updateDoc(doc(db, "payments", res.id), {
            qrisMessageId: sentMsg.message_id,
            chatId: ctx.chat.id
          });
        }
      } else {
        ctx.reply("❌ Gagal membuat pembayaran.");
      }
      
      botSessions.delete(ctx.from.id);
      return;
    }

    if (session.action === "pk_input_phone") {
      const phone = text.replace(/\D/g, '');
      if (!phone) return ctx.reply("❌ Nomor tidak valid. Silakan masukkan nomor yang benar.");
      
      const userId = `tele_${ctx.from.id}`;
      await ctx.reply(`⏳ Sedang meminta Pairing Code untuk ${phone}...`);
      await initWhatsApp(userId, phone);
      
      let retries = 0;
      const checkPairing = setInterval(async () => {
        const s = sessions.get(userId);
        if (s && s.pairingCode) {
          clearInterval(checkPairing);
          await ctx.reply(`🔢 *PAIRING CODE ANDA:*\n\n\`${s.pairingCode}\`\n\n_Silakan masukkan kode ini di WhatsApp Anda._`, { parse_mode: 'Markdown' });
        } else if (s && s.status === "connected") {
          clearInterval(checkPairing);
          await ctx.reply("✅ *BERHASIL TERKONEKSI KE WHATSAPP*", { parse_mode: 'Markdown' });
        }
        
        retries++;
        if (retries > 15) {
          clearInterval(checkPairing);
          await ctx.reply("❌ Gagal mendapatkan Pairing Code. Silakan coba lagi.");
        }
      }, 2000);
      botSessions.delete(ctx.from.id);
      return;
    }

    if (session.action === "pk_input_group_id") {
      session.pkGroupId = text.trim();
      session.action = "pk_input_count";
      await ctx.reply("🔢 Masukkan jumlah kontak yang ingin dikirim (contoh: 100):");
      return;
    }

    if (session.action === "pk_input_count") {
      const count = parseInt(text);
      if (isNaN(count) || count <= 0) return ctx.reply("❌ Jumlah tidak valid. Masukkan angka.");
      session.pkCount = count;
      session.action = "pk_input_delay";
      await ctx.reply("⏱️ Masukkan delay per pesan dalam detik (contoh: 5):");
      return;
    }

    if (session.action === "pk_input_delay") {
      const delay = parseInt(text);
      if (isNaN(delay) || delay <= 0) return ctx.reply("❌ Delay tidak valid. Masukkan angka.");
      session.pkDelay = delay;
      session.action = "pk_input_text";
      await ctx.reply("📝 Masukkan teks pesan yang ingin dikirim:");
      return;
    }

    if (session.action === "pk_input_text") {
      session.pkText = text;
      session.action = "pk_confirm"; // Change action to prevent overwriting if text is split
      
      const buttons = [
        [Markup.button.callback("▶️ START PUSHKONTAK", "pk_execute_start")],
        [Markup.button.callback("⛔ BATAL", "menu_pushkontak")]
      ];
      
      await ctx.reply(
        `📋 <b>KONFIRMASI PUSHKONTAK</b>\n\n` +
        `👥 <b>Grup:</b> <code>${session.pkGroupId}</code>\n` +
        `🔢 <b>Jumlah:</b> ${session.pkCount} kontak\n` +
        `⏱️ <b>Delay:</b> ${session.pkDelay} detik\n\n` +
        `📝 <b>Pesan Anda:</b>`,
        { parse_mode: 'HTML' }
      );

      // Send the text separately without markdown to avoid parsing errors with special characters
      // If text is somehow longer than 4000 chars, split it
      const chunks = session.pkText.match(/[\s\S]{1,4000}/g) || [];
      for (const chunk of chunks) {
        await ctx.reply(chunk);
      }

      await ctx.reply(
        `Apakah Anda yakin ingin memulai PushKontak?`,
        { ...Markup.inlineKeyboard(buttons) }
      );
      return;
    }

    if (session.action === "input_email_vip") {
      const email = text;
      const res = await createPayment(email, session.amount, "UPGRADE", session.role, session.days, 1, ctx.from.id, ctx.from.first_name);
      if (res.success) {
        const caption = `✅ *Pembayaran Berhasil Dibuat!*\n\n📧 *Email:* ${email}\n💰 *Total:* Rp ${session.amount.toLocaleString('id-ID')}\n\n📸 *Silakan Scan QR di atas untuk membayar.*\n\n_Setelah bayar, klik tombol di bawah atau tunggu sistem memproses otomatis._`;
        
        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback("🔄 Cek Status Pembayaran", `check_pay_${res.id}`)]
        ]);

        let sentMsg;
        if (Buffer.isBuffer(res.url)) {
          sentMsg = await ctx.replyWithPhoto({ source: res.url }, {
            caption,
            parse_mode: 'Markdown',
            ...keyboard
          });
        } else if (typeof res.url === 'string' && res.url.startsWith('data:image')) {
          const base64Data = res.url.split(',')[1];
          sentMsg = await ctx.replyWithPhoto({ source: Buffer.from(base64Data, 'base64') }, {
            caption,
            parse_mode: 'Markdown',
            ...keyboard
          });
        } else if (typeof res.url === 'string') {
          sentMsg = await ctx.replyWithPhoto(res.url, {
            caption,
            parse_mode: 'Markdown',
            ...keyboard
          });
        }

        // Store message ID to delete later
        if (sentMsg) {
          await updateDoc(doc(db, "payments", res.id), {
            qrisMessageId: sentMsg.message_id,
            chatId: ctx.chat.id
          });
        }
      } else {
        sendEnhancedResponse(ctx, "❌ Gagal membuat pembayaran. Silakan coba lagi.", 'ERROR');
      }
      botSessions.delete(ctx.from.id);
    } else if (session.action === "input_email_token_unlimited") {
      const email = text;
      const res = await createPayment(email, session.amount, "TOKEN_UNLIMITED", undefined, session.days, 1, ctx.from.id, ctx.from.first_name);
      if (res.success) {
        const caption = `✅ *Pembayaran Berhasil Dibuat!*\n\n📧 *Email:* ${email}\n🎫 *Tipe:* Token Unlimited (${session.days} Hari)\n💰 *Total:* Rp ${session.amount.toLocaleString('id-ID')}\n\n📸 *Silakan Scan QR di atas untuk membayar.*\n\n_Setelah bayar, klik tombol di bawah atau tunggu sistem memproses otomatis._`;
        
        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback("🔄 Cek Status Pembayaran", `check_pay_${res.id}`)]
        ]);

        let sentMsg;
        if (Buffer.isBuffer(res.url)) {
          sentMsg = await ctx.replyWithPhoto({ source: res.url }, {
            caption,
            parse_mode: 'Markdown',
            ...keyboard
          });
        } else if (typeof res.url === 'string' && res.url.startsWith('data:image')) {
          const base64Data = res.url.split(',')[1];
          sentMsg = await ctx.replyWithPhoto({ source: Buffer.from(base64Data, 'base64') }, {
            caption,
            parse_mode: 'Markdown',
            ...keyboard
          });
        } else if (typeof res.url === 'string') {
          sentMsg = await ctx.replyWithPhoto(res.url, {
            caption,
            parse_mode: 'Markdown',
            ...keyboard
          });
        }
        
        if (sentMsg) {
          await updateDoc(doc(db, "payments", res.id!), {
            qrisMessageId: sentMsg.message_id,
            chatId: ctx.chat.id
          });
        }
      } else {
        ctx.reply("❌ Gagal membuat pembayaran. Silakan coba lagi.");
      }
      botSessions.delete(ctx.from.id);
    } else if (session.action === "input_token_qty") {
      const qty = parseInt(text);
      if (isNaN(qty) || qty <= 0) return ctx.reply("❌ Jumlah tidak valid.");

      const totalAmount = qty * session.pricePerToken;
      const placeholderEmail = `tg_${ctx.from.id}@telegram.bot`;

      const res = await createPayment(placeholderEmail, totalAmount, "TOKEN", undefined, undefined, qty, ctx.from.id, ctx.from.first_name);
      if (res.success) {
        const caption = `✅ *Pembayaran Berhasil Dibuat!*\n\n🎫 *Jumlah Token:* ${qty}\n💰 *Total:* Rp ${totalAmount.toLocaleString('id-ID')}\n\n📸 *Silakan Scan QR di atas untuk membayar.*\n\n_Setelah bayar, klik tombol di bawah atau tunggu sistem memproses otomatis._`;
        
        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback("🔄 Cek Status Pembayaran", `check_pay_${res.id}`)]
        ]);

        let sentMsg;
        if (Buffer.isBuffer(res.url)) {
          sentMsg = await ctx.replyWithPhoto({ source: res.url }, {
            caption,
            parse_mode: 'Markdown',
            ...keyboard
          });
        } else if (typeof res.url === 'string' && res.url.startsWith('data:image')) {
          const base64Data = res.url.split(',')[1];
          sentMsg = await ctx.replyWithPhoto({ source: Buffer.from(base64Data, 'base64') }, {
            caption,
            parse_mode: 'Markdown',
            ...keyboard
          });
        } else if (typeof res.url === 'string') {
          sentMsg = await ctx.replyWithPhoto(res.url, {
            caption,
            parse_mode: 'Markdown',
            ...keyboard
          });
        }

        // Store message ID to delete later
        if (sentMsg) {
          await updateDoc(doc(db, "payments", res.id), {
            qrisMessageId: sentMsg.message_id,
            chatId: ctx.chat.id
          });
        }
      } else {
        sendEnhancedResponse(ctx, "❌ Gagal membuat pembayaran. Silakan coba lagi.", 'ERROR');
      }
      botSessions.delete(ctx.from.id);
    } else if (session.action === "input_email_limit") {
      const email = text;
      await ctx.reply(`🔢 Silakan masukkan *jumlah* limit yang ingin ditambah untuk email ${email}:`);
      botSessions.set(ctx.from.id, { ...session, action: "input_limit_qty", email });
    } else if (session.action === "input_limit_qty") {
      const qty = parseInt(text);
      if (isNaN(qty) || qty <= 0) return ctx.reply("❌ Jumlah tidak valid.");

      const totalAmount = qty * session.pricePerLimit;
      const email = session.email;

      const res = await createPayment(email, totalAmount, "LIMIT_UPGRADE", undefined, undefined, qty, ctx.from.id, ctx.from.first_name);
      if (res.success) {
        const caption = `✅ *Pembayaran Berhasil Dibuat!*\n\n📈 *Tambah Limit:* +${qty}\n📧 *Akun:* ${email}\n💰 *Total:* Rp ${totalAmount.toLocaleString('id-ID')}\n\n📸 *Silakan Scan QR di atas untuk membayar.*\n\n_Setelah bayar, klik tombol di bawah atau tunggu sistem memproses otomatis._`;
        
        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback("🔄 Cek Status Pembayaran", `check_pay_${res.id}`)]
        ]);

        let sentMsg;
        if (Buffer.isBuffer(res.url)) {
          sentMsg = await ctx.replyWithPhoto({ source: res.url }, {
            caption,
            parse_mode: 'Markdown',
            ...keyboard
          });
        } else if (typeof res.url === 'string' && res.url.startsWith('data:image')) {
          const base64Data = res.url.split(',')[1];
          sentMsg = await ctx.replyWithPhoto({ source: Buffer.from(base64Data, 'base64') }, {
            caption,
            parse_mode: 'Markdown',
            ...keyboard
          });
        } else if (typeof res.url === 'string') {
          sentMsg = await ctx.replyWithPhoto(res.url, {
            caption,
            parse_mode: 'Markdown',
            ...keyboard
          });
        }

        // Store message ID to delete later
        if (sentMsg) {
          await updateDoc(doc(db, "payments", res.id), {
            qrisMessageId: sentMsg.message_id,
            chatId: ctx.chat.id
          });
        }
      } else {
        sendEnhancedResponse(ctx, "❌ Gagal membuat pembayaran. Silakan coba lagi.", 'ERROR');
      }
      botSessions.delete(ctx.from.id);
    } else if (session.action === "check_status_email") {
      const email = text;
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const snap = await getDocs(q);
        if (snap.empty) {
          sendEnhancedResponse(ctx, "❌ User tidak ditemukan.", 'ERROR');
        } else {
          const user = snap.docs[0].data();
          sendEnhancedResponse(ctx, 
            `📊 *STATUS USER*\n\n📧 *Email:* ${email}\n💎 *Role:* ${user.role}\n📅 *Expiry:* ${user.expiryDate ? formatWIB(user.expiryDate) : 'N/A'}`,
            'STATUS'
          );
        }
      } catch (e) {
        sendEnhancedResponse(ctx, "❌ Error saat cek status.", 'ERROR');
      }
      botSessions.delete(ctx.from.id);
    } else if (session.action === "bot_dev_all_up_free_input") {
      const parts = text.split('|');
      if (parts.length !== 3) {
         ctx.reply("❌ Format salah! (email|role|hari)");
         botSessions.delete(ctx.from.id);
         return;
      }
      
      const email = parts[0].trim();
      const targetRole = parts[1].trim();
      const hari = parseInt(parts[2].trim());
      
      if (!['vip', 'reseller', 'dev'].includes(targetRole) || isNaN(hari)) {
         ctx.reply("❌ Role tidak valid atau format hari salah.");
         botSessions.delete(ctx.from.id);
         return;
      }
      
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const userDoc = snap.docs[0];
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + hari);
          
          await updateDoc(userDoc.ref, {
            role: targetRole,
            expiryDate: expiryDate.toISOString(),
            upgradedAt: new Date().toISOString(),
            upgradedBy: `dev_all_${ctx.from.id}`
          });
          
          ctx.reply(`✅ Berhasil upgrade ${email} menjadi ${targetRole.toUpperCase()} selama ${hari} hari (Gratis via Dev All).`);
        } else {
          ctx.reply("❌ Email tidak ditemukan di database.");
        }
      } catch (err: any) {
        ctx.reply("❌ Terjadi kesalahan: " + err.message);
      }
      botSessions.delete(ctx.from.id);
    } else if (session.action === "bot_dev_all_gen_token_input") {
       const limit = parseInt(text);
       if (isNaN(limit) || limit < 1) {
           ctx.reply("❌ Jumlah user harus angka positif.");
       } else {
           const token = Math.random().toString(36).substring(2, 10).toUpperCase();
           
           try {
             await setDoc(doc(db, "tokens", token), {
               maxUsers: limit,
               currentUsers: 0,
               durationDays: 30,
               createdAt: new Date().toISOString(),
               createdBy: `dev_all_${ctx.from.id}`
             });
             
             ctx.reply(`✅ Token Generated!\n\n🎫 Token: \`${token}\`\n👥 Max User: ${limit}\n⏱ Durasi: 30 Hari`, {parse_mode: 'Markdown'});
           } catch (err: any) {
             ctx.reply("❌ Error generating token: " + err.message);
           }
       }
       botSessions.delete(ctx.from.id);
    } else if (session.action === "bot_reseller_input_email") {
      const email = text.trim();
      const taxAmount = getPajakPrice('reseller', 'vip');
      
      const placeholderEmail = `tg_${ctx.from.id}@telegram.bot`;
      const res = await createPayment(placeholderEmail, taxAmount, "UPGRADE_TAX", `up_vip_${email}`, undefined, 1, ctx.from.id, ctx.from.first_name);
      
      if (res.success) {
        const caption = `⚠️ *Sistem Pajak Up Role (RESELLER)*\n\nUntuk melakukan Upgrade VIP ke ${email}, Anda dikenakan Pajak Rp ${taxAmount.toLocaleString('id-ID')}.\n\n📸 *Silakan Scan QR di atas untuk membayar.*\n_Setelah bayar, aksi akan otomatis diproses._`;
        const keyboard = Markup.inlineKeyboard([[Markup.button.callback("🔄 Cek Status", `check_pay_${res.id}`)]]);
        
        let sentMsg;
        if (Buffer.isBuffer(res.url)) {
          sentMsg = await ctx.replyWithPhoto({ source: res.url }, { caption, parse_mode: 'Markdown', ...keyboard });
        } else if (typeof res.url === 'string' && res.url.startsWith('data:image')) {
          const base64Data = res.url.split(',')[1];
          sentMsg = await ctx.replyWithPhoto({ source: Buffer.from(base64Data, 'base64') }, { caption, parse_mode: 'Markdown', ...keyboard });
        } else if (typeof res.url === 'string') {
          sentMsg = await ctx.replyWithPhoto(res.url, { caption, parse_mode: 'Markdown', ...keyboard });
        }
        if (sentMsg) {
          await updateDoc(doc(db, "payments", res.id), { qrisMessageId: sentMsg.message_id, chatId: ctx.chat.id });
        }
      } else {
        ctx.reply("❌ Gagal membuat pembayaran untuk pajak role.");
      }
      botSessions.delete(ctx.from.id);
    } else if (session.action === "bot_dev_input_email_vip" || session.action === "bot_dev_input_email_reseller") {
      const email = text.trim();
      const targetRole = session.action === "bot_dev_input_email_vip" ? "vip" : "reseller";
      const taxAmount = getPajakPrice('dev', targetRole);

      const placeholderEmail = `tg_${ctx.from.id}@telegram.bot`;
      const res = await createPayment(placeholderEmail, taxAmount, "UPGRADE_TAX", `up_${targetRole}_${email}`, undefined, 1, ctx.from.id, ctx.from.first_name);
      if (res.success) {
        const caption = `⚠️ *Sistem Pajak Up Role (DEV)*\n\nUntuk melakukan Upgrade ${targetRole.toUpperCase()} ke ${email}, Anda dikenakan Pajak Rp ${taxAmount.toLocaleString('id-ID')}.\n\n📸 *Silakan Scan QR di atas untuk membayar.*\n_Setelah bayar, aksi akan otomatis diproses._`;
        const keyboard = Markup.inlineKeyboard([[Markup.button.callback("🔄 Cek Status", `check_pay_${res.id}`)]]);
        
        let sentMsg;
        if (Buffer.isBuffer(res.url)) {
          sentMsg = await ctx.replyWithPhoto({ source: res.url }, { caption, parse_mode: 'Markdown', ...keyboard });
        } else if (typeof res.url === 'string' && res.url.startsWith('data:image')) {
          const base64Data = res.url.split(',')[1];
          sentMsg = await ctx.replyWithPhoto({ source: Buffer.from(base64Data, 'base64') }, { caption, parse_mode: 'Markdown', ...keyboard });
        } else if (typeof res.url === 'string') {
          sentMsg = await ctx.replyWithPhoto(res.url, { caption, parse_mode: 'Markdown', ...keyboard });
        }
        if (sentMsg) {
          await updateDoc(doc(db, "payments", res.id), { qrisMessageId: sentMsg.message_id, chatId: ctx.chat.id });
        }
      } else {
        ctx.reply("❌ Gagal membuat pembayaran untuk pajak role.");
      }
      botSessions.delete(ctx.from.id);
    } else if (session.action === "owner_set_role_email") {
      botSessions.set(ctx.from.id, { ...session, email: text, action: "owner_set_role_select" });
      ctx.reply(`Pilih role baru untuk ${text}:`, Markup.inlineKeyboard([
        [Markup.button.callback("Free", "set_role_free"), Markup.button.callback("VIP", "set_role_vip")],
        [Markup.button.callback("Reseller", "set_role_reseller"), Markup.button.callback("Dev", "set_role_dev")]
      ]));
    } else if (session.action === "owner_set_expiry_email") {
      botSessions.set(ctx.from.id, { ...session, email: text, action: "owner_set_expiry_duration" });
      ctx.reply(`Masukkan durasi expiry untuk ${text}.\nFormat: [angka][d/h/m]\nContoh: 1d (1 hari), 12h (12 jam), 30m (30 menit)`);
    } else if (session.action === "owner_set_expiry_duration") {
      const email = session.email;
      const newExpiry = parseExpiryDuration(text);
      
      if (!newExpiry) {
        return ctx.reply("❌ Format tidak valid. Gunakan format seperti 1d, 12h, atau 30m.");
      }

      const MASTER_DEV_EMAIL = process.env.MASTER_DEV_EMAIL;
      if (MASTER_DEV_EMAIL && email === MASTER_DEV_EMAIL) return ctx.reply("❌ Tidak bisa modifikasi super admin.");
      
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const snap = await getDocs(q);
        if (snap.empty) return ctx.reply("❌ User tidak ditemukan.");
        
        await updateDoc(doc(db, "users", snap.docs[0].id), { expiryDate: newExpiry.toISOString() });
        ctx.reply(`✅ Sukses! Expiry ${email} diatur menjadi ${formatWIB(newExpiry)}.`);
      } catch (e) {
        ctx.reply("❌ Gagal update expiry.");
      }
      botSessions.delete(ctx.from.id);
    } else if (session.action === "owner_input_expiry_role") {
      const targetRole = session.targetRole;
      const newExpiry = parseExpiryDuration(text);
      
      if (!newExpiry) {
        return ctx.reply("❌ Format tidak valid. Gunakan format seperti 1d, 12h, atau 30m.");
      }
      
      ctx.reply(`⏳ Sedang mengupdate expiry untuk semua user ${targetRole.toUpperCase()}...`);
      
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("role", "==", targetRole));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          botSessions.delete(ctx.from.id);
          return ctx.reply(`❌ Tidak ada user dengan role ${targetRole.toUpperCase()}.`);
        }
        
        const batch = writeBatch(db);
        let count = 0;
        snap.forEach(userDoc => {
          batch.update(userDoc.ref, { expiryDate: newExpiry.toISOString() });
          count++;
        });
        
        await batch.commit();
        ctx.reply(`✅ Sukses! Expiry ${count} user ${targetRole.toUpperCase()} diatur menjadi ${formatWIB(newExpiry)}.`);
      } catch (e) {
        ctx.reply("❌ Gagal update expiry massal.");
      }
      botSessions.delete(ctx.from.id);
    } else if (session.action === "owner_input_pk_target") {
      const targetId = text.trim();
      botSessions.set(ctx.from.id, { action: "owner_input_pk_duration", targetId });
      ctx.reply(`Masukkan durasi untuk ID ${targetId}:\nContoh:\n1h = 1 Jam\n3h = 3 Jam\n6h = 6 Jam\n12h = 12 Jam`);
    } else if (session.action === "owner_input_pk_duration") {
      const durationStr = text.trim();
      const targetId = session.targetId;
      const newExpiry = parseExpiryDuration(durationStr);
      
      if (!newExpiry) {
        return ctx.reply("❌ Format durasi tidak valid. Gunakan format seperti 1h, 3h, 6h, 12h.");
      }

      try {
        await setDoc(doc(db, "bot_users", targetId), {
          pushKontakExpiry: newExpiry.toISOString()
        }, { merge: true });

        ctx.reply(`✅ Berhasil menambahkan akses PushKontak!\n\n👤 ID: \`${targetId}\`\n⏱ Durasi: ${durationStr}\n📅 Expired: ${formatWIB(newExpiry)}`, { parse_mode: 'Markdown' });
      } catch (e: any) {
        ctx.reply(`❌ Gagal menambahkan akses: ${e.message}`);
      }
      botSessions.delete(ctx.from.id);
    } else if (session.action === "owner_input_aktifkan") {
      const targetId = text.trim();
      try {
        // Try to find by email first
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", targetId));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          await updateDoc(doc(db, "users", snap.docs[0].id), {
            status_active: true,
            last_payment: Date.now()
          });
          ctx.reply(`✅ User ${targetId} berhasil diaktifkan.`);
        } else {
          // Fallback to UID
          await updateDoc(doc(db, "users", targetId), {
            status_active: true,
            last_payment: Date.now()
          });
          ctx.reply(`✅ User ${targetId} berhasil diaktifkan.`);
        }
      } catch (e: any) {
        ctx.reply(`❌ Gagal mengaktifkan user: ${e.message}`);
      }
      botSessions.delete(ctx.from.id);
    } else if (session.action === "owner_input_price") {
      const price = parseInt(text);
      if (isNaN(price)) return ctx.reply("❌ Harga tidak valid.");
      
      try {
        if (session.item === "web_vip_monthly" || session.item === "web_vip_yearly") {
          const field = session.item === "web_vip_monthly" ? "vipMonthly" : "vipYearly";
          await setDoc(doc(db, "settings", "pricing"), {
            [field]: price
          }, { merge: true });
        } else {
          await setDoc(doc(db, "settings", "prices"), {
            [session.item]: price
          }, { merge: true });
        }
        ctx.reply(`✅ Sukses! Harga ${session.item} diubah ke Rp ${price.toLocaleString('id-ID')}.`);
      } catch (e) {
        ctx.reply("❌ Gagal update harga: " + e.message);
      }
      botSessions.delete(ctx.from.id);
    } else if (session.action === "owner_input_token_qty") {
      if (!isOwner(ctx.from.id)) return;
      const qty = parseInt(text);
      if (isNaN(qty) || qty <= 0 || qty > 100) {
        return ctx.reply("❌ Jumlah tidak valid. Masukkan angka 1-100.");
      }
      
      ctx.reply(`⏳ Sedang meng-generate ${qty} token...`);
      
      try {
        const tokens: string[] = [];
        for (let i = 0; i < qty; i++) {
          const code = crypto.randomBytes(4).toString('hex').toUpperCase();
          await setDoc(doc(db, "tokens", code), {
            code,
            createdBy: "owner",
            usageCount: 2,
            createdAt: new Date().toISOString()
          });
          tokens.push(code);
        }
        
        const tokenList = tokens.map(t => `\`${t}\``).join('\n');
        ctx.reply(`✅ *BERHASIL GENERATE ${qty} TOKEN*\n\n🔑 *Token Anda:* \n${tokenList}\n\n🚀 Silakan gunakan token di atas.`, { parse_mode: 'Markdown' });
      } catch (e) {
        ctx.reply("❌ Gagal generate token.");
      }
      botSessions.delete(ctx.from.id);
    } else if (session.action === "owner_set_up_tanpa_token_email") {
      const email = text;
      botSessions.set(ctx.from.id, { ...session, email, action: "owner_set_up_tanpa_token_toggle" });
      ctx.reply(`Pilih status Up Tanpa Token untuk ${email}:`, Markup.inlineKeyboard([
        [Markup.button.callback("✅ Aktifkan", "set_up_tanpa_token_true")],
        [Markup.button.callback("❌ Nonaktifkan", "set_up_tanpa_token_false")]
      ]));
    } else if (session.action === "owner_input_token_unli_duration") {
      if (!isOwner(ctx.from.id)) return;
      const duration = parseExpiryDuration(text);
      if (!duration) {
        return ctx.reply("❌ Format tidak valid. Gunakan format seperti 7d, 15d, atau 30d.");
      }
      
      ctx.reply(`⏳ Sedang meng-generate Token Unlimited...`);
      try {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        await setDoc(doc(db, "tokens", code), {
          code,
          createdBy: "owner",
          usageCount: 999999,
          isUnlimited: true,
          expiresAt: duration.toISOString(),
          createdAt: new Date().toISOString()
        });
        
        ctx.reply(`✅ *BERHASIL GENERATE TOKEN UNLIMITED*\n\n🔑 *Token Anda:* \`${code}\`\n📅 *Expired:* ${formatWIB(duration)}\n\n🚀 Silakan gunakan token di atas.`, { parse_mode: 'Markdown' });
      } catch (e) {
        ctx.reply("❌ Gagal generate token unlimited.");
      }
      botSessions.delete(ctx.from.id);
    } else if (session.action === "owner_input_up_limit_email") {
      if (!isOwner(ctx.from.id)) return;
      const email = text;
      botSessions.set(ctx.from.id, { ...session, email, action: "owner_input_up_limit_amount" });
      ctx.reply(`📈 Masukkan jumlah limit harian baru untuk ${email} (contoh: 10):`);
    } else if (session.action === "owner_input_up_limit_amount") {
      if (!isOwner(ctx.from.id)) return;
      const limit = parseInt(text);
      if (isNaN(limit) || limit < 0) return ctx.reply("❌ Jumlah limit tidak valid.");
      
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", session.email));
        const snap = await getDocs(q);
        if (snap.empty) return ctx.reply("❌ User tidak ditemukan.");
        
        await updateDoc(doc(db, "users", snap.docs[0].id), { maxDailyUpgrades: limit });
        ctx.reply(`✅ Sukses! Limit harian untuk ${session.email} diatur menjadi ${limit} user/hari.`);
      } catch (e) {
        ctx.reply("❌ Gagal update limit.");
      }
      botSessions.delete(ctx.from.id);
    } else if (session.action === "owner_add_bot_dev_all_input") {
      const targetId = text.trim();
      if (!/^\d+$/.test(targetId)) return ctx.reply("❌ Invalid format.");
      try {
        const botUserRef = doc(db, "bot_users", targetId);
        const snapshot = await getDoc(botUserRef);
        const oldRole = snapshot.exists() ? snapshot.data().role || 'free' : 'unknown';

        await setDoc(botUserRef, { role: "dev_all" }, { merge: true });

        await setDoc(doc(collection(db, "upgrade_logs")), {
            telegramId: targetId,
            role_before: oldRole,
            role_after: "dev_all",
            source: "OWNER_MANUAL_COMMAND_DEV_ALL",
            timestamp: serverTimestamp()
        });

        ctx.reply(`✅ Sukses update role dev_all untuk ID ${targetId}`);
        bot.telegram.sendMessage(targetId, "🌟 SELAMAT! Anda telah diangkat menjadi DEV ALL oleh Owner. Silahkan gunakan /menu.").catch(() => {});
      } catch (err: any) {
        ctx.reply("❌ Gagal: " + err.message);
      }
      botSessions.delete(ctx.from.id);
    } else if (session.action === "owner_setup_blast_msg_input") {
      try {
        await setDoc(doc(db, "settings", "blast_config"), { message: text }, { merge: true });
        ctx.reply("✅ Pesan blast berhasil disimpan!");
      } catch (err: any) {
        ctx.reply("❌ Gagal menyimpan: " + err.message);
      }
      botSessions.delete(ctx.from.id);
    } else if (session.action === "owner_set_blast_rate_input") {
      const rate = parseInt(text.replace(/\D/g, ''));
      if (isNaN(rate) || rate < 0) return ctx.reply("❌ Format angka tidak valid.");
      try {
        await setDoc(doc(db, "settings", "blast_config"), { reward_rate: rate }, { merge: true });
        ctx.reply(`✅ Rate blast berhasil diatur menjadi: Rp ${rate.toLocaleString('id-ID')}`);
      } catch (err: any) {
        ctx.reply("❌ Gagal menyimpan: " + err.message);
      }
      botSessions.delete(ctx.from.id);
    } else if (session.action === "owner_add_blast_db_input") {
      const numbers = text.split('\n').map(n => n.trim().replace(/\D/g, '')).filter(n => n.length > 0);
      if (numbers.length === 0) return ctx.reply("❌ Tidak ada nomor WA valid yang didapatkan.");
      try {
        const blastService = await import("./src/services/blastService.ts");
        let added = 0;
        for (const num of numbers) {
             const success = await blastService.addNumberToBlastDb(num);
             if (success) added++;
        }
        ctx.reply(`✅ Berhasil menambahkan ${added}/${numbers.length} kontak manual (anti-duplikat) ke database Blast.`);
      } catch (err: any) {
        ctx.reply(`❌ Gagal: ${err.message}`);
      }
      botSessions.delete(ctx.from.id);
    } else if (session.action === "owner_input_bot_reseller_id" || session.action === "owner_input_bot_dev_id") {
      if (!isOwner(ctx.from.id)) return;
      const targetId = text.trim();
      if (!/^\d+$/.test(targetId)) return ctx.reply("❌ Telegram ID harus berupa angka.");
      
      const role = session.action === "owner_input_bot_reseller_id" ? "reseller" : "dev";
      try {
        const botUserRef = doc(db, "bot_users", targetId);
        const snapshot = await getDoc(botUserRef);
        const oldRole = snapshot.exists() ? snapshot.data().role || 'free' : 'unknown';

        await setDoc(botUserRef, {
          role,
          dailyUpgrades: 0,
          lastUpgradeDate: new Date().toISOString().split('T')[0],
          addedAt: new Date().toISOString()
        }, { merge: true });
        
        await setDoc(doc(collection(db, "upgrade_logs")), {
            telegramId: targetId,
            role_before: oldRole,
            role_after: role,
            source: "OWNER_MANUAL_COMMAND",
            timestamp: serverTimestamp()
        });
        
        ctx.reply(`✅ Sukses! Telegram ID ${targetId} telah ditambahkan sebagai Bot ${role.toUpperCase()}.`);
      } catch (e) {
        ctx.reply("❌ Gagal menambahkan bot user.");
      }
      botSessions.delete(ctx.from.id);
    }
  });

  bot.action("bot_reseller_panel", async (ctx) => {
    const { role: botRole } = await getBotUserRole(ctx.from.id);
    if (botRole !== 'reseller') return ctx.reply("❌ Akses Ditolak.");

    sendEnhancedResponse(ctx,
      "🤝 *RESELLER PANEL*\n\nSilakan pilih menu:",
      'OWNER',
      Markup.inlineKeyboard([
        [Markup.button.callback("💎 Up User ke VIP", "bot_reseller_up_vip")],
        [Markup.button.callback("⬅️ Kembali", "start")]
      ])
    );
  });

  bot.action("bot_dev_all_panel", async (ctx) => {
    const { role: botRole } = await getBotUserRole(ctx.from.id);
    if (botRole !== 'dev_all') return ctx.reply("❌ Akses Ditolak. Khusus Dev All.");

    sendEnhancedResponse(ctx,
      "🌟 *DEV ALL PANEL*\n\nWelcome back, Master Dev. Semua batasan telah dilepas.\nSilakan pilih menu:",
      'OWNER',
      Markup.inlineKeyboard([
        [Markup.button.callback("🛡️ Up User Gratis", "bot_dev_all_up_free")],
        [Markup.button.callback("🎫 Generate Token Unli", "bot_dev_all_gen_token")],
        [Markup.button.callback("⬅️ Kembali", "start")]
      ])
    );
  });

  bot.action("bot_dev_all_up_free", async (ctx) => {
      const { role: botRole } = await getBotUserRole(ctx.from.id);
      if (botRole !== 'dev_all') return;
      ctx.reply("📧 Masukkan email user yang ingin di-upgrade GRATIS (Format: email|role|hari):\nContoh: test@test.com|vip|30");
      botSessions.set(ctx.from.id, { action: "bot_dev_all_up_free_input" });
  });

  bot.action("bot_dev_all_gen_token", async (ctx) => {
      const { role: botRole } = await getBotUserRole(ctx.from.id);
      if (botRole !== 'dev_all') return;
      ctx.reply("🎫 Generate token unlimited. Berapa maksimal user? (Contoh: 100)");
      botSessions.set(ctx.from.id, { action: "bot_dev_all_gen_token_input" });
  });

  bot.action("bot_dev_panel", async (ctx) => {
    const { role: botRole } = await getBotUserRole(ctx.from.id);
    if (botRole !== 'dev') return ctx.reply("❌ Akses Ditolak.");

    sendEnhancedResponse(ctx,
      "👨‍💻 *DEV PANEL*\n\nSilakan pilih menu:",
      'OWNER',
      Markup.inlineKeyboard([
        [Markup.button.callback("💎 Up User ke VIP", "bot_dev_up_vip")],
        [Markup.button.callback("🤝 Up User ke Reseller", "bot_dev_up_reseller")],
        [Markup.button.callback("🎫 Generate Token (2 User)", "bot_dev_gen_token")],
        [Markup.button.callback("⬅️ Kembali", "start")]
      ])
    );
  });

  bot.action("bot_reseller_up_vip", async (ctx) => {
    const { role: botRole } = await getBotUserRole(ctx.from.id);
    if (botRole !== 'reseller') return;
    ctx.reply("📧 Masukkan email user yang ingin di-upgrade ke VIP:");
    botSessions.set(ctx.from.id, { action: "bot_reseller_input_email" });
  });

  bot.action("bot_dev_up_vip", async (ctx) => {
    const { role: botRole } = await getBotUserRole(ctx.from.id);
    if (botRole !== 'dev') return;
    ctx.reply("📧 Masukkan email user yang ingin di-upgrade ke VIP:");
    botSessions.set(ctx.from.id, { action: "bot_dev_input_email_vip" });
  });

  bot.action("bot_dev_up_reseller", async (ctx) => {
    const { role: botRole } = await getBotUserRole(ctx.from.id);
    if (botRole !== 'dev') return;
    ctx.reply("📧 Masukkan email user yang ingin di-upgrade ke Reseller:");
    botSessions.set(ctx.from.id, { action: "bot_dev_input_email_reseller" });
  });

  bot.action("bot_dev_gen_token", async (ctx) => {
    const { role: botRole } = await getBotUserRole(ctx.from.id);
    if (botRole !== 'dev') return;
    
    // Check limit
    const devRef = doc(db, "bot_users", String(ctx.from.id));
    const devSnap = await getDoc(devRef);
    if (!devSnap.exists()) return;
    const devData = devSnap.data();
    
    const today = new Date().toISOString().split('T')[0];
    let currentCount = devData.dailyUpgrades || 0;
    if (devData.lastUpgradeDate !== today) {
      currentCount = 0;
    }

    if (currentCount >= 4) {
      // Limit reached, charge Rp 500
      const placeholderEmail = `tg_${ctx.from.id}@telegram.bot`;
      const res = await createPayment(placeholderEmail, 500, "DEV_ACTION", "gen_token", undefined, 1, ctx.from.id, ctx.from.first_name);
      if (res.success) {
        const caption = `⚠️ *Limit Harian Tercapai (4/4)*\n\nUntuk melanjutkan Generate Token, Anda dikenakan biaya Rp 500.\n\n📸 *Silakan Scan QR di atas untuk membayar.*\n_Setelah bayar, aksi akan otomatis diproses._`;
        const keyboard = Markup.inlineKeyboard([[Markup.button.callback("🔄 Cek Status Pembayaran", `check_pay_${res.id}`)]]);
        
        let sentMsg;
        if (Buffer.isBuffer(res.url)) {
          sentMsg = await ctx.replyWithPhoto({ source: res.url }, { caption, parse_mode: 'Markdown', ...keyboard });
        } else if (typeof res.url === 'string' && res.url.startsWith('data:image')) {
          const base64Data = res.url.split(',')[1];
          sentMsg = await ctx.replyWithPhoto({ source: Buffer.from(base64Data, 'base64') }, { caption, parse_mode: 'Markdown', ...keyboard });
        } else if (typeof res.url === 'string') {
          sentMsg = await ctx.replyWithPhoto(res.url, { caption, parse_mode: 'Markdown', ...keyboard });
        }
        
        if (sentMsg) {
          await updateDoc(doc(db, "payments", res.id!), { qrisMessageId: sentMsg.message_id, chatId: ctx.chat.id });
        }
      } else {
        ctx.reply("❌ Gagal membuat pembayaran untuk pajak limit.");
      }
      return;
    }

    // Generate token
    try {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      await setDoc(doc(db, "tokens", code), {
        code,
        createdBy: `bot_dev_${ctx.from.id}`,
        usageCount: 2,
        createdAt: new Date().toISOString()
      });
      
      await updateDoc(devRef, {
        dailyUpgrades: currentCount + 1,
        lastUpgradeDate: today
      });

      ctx.reply(`✅ *BERHASIL GENERATE TOKEN*\n\n🔑 *Token Anda:* \`${code}\`\n\n🚀 Silakan gunakan token di atas. (Limit: ${currentCount + 1}/4)`, { parse_mode: 'Markdown' });
    } catch (e) {
      ctx.reply("❌ Gagal generate token.");
    }
  });

  bot.action("owner_panel", async (ctx) => {
    if (!isOwner(ctx.from.id)) {
      return ctx.reply("❌ Akses Ditolak.");
    }
    const maintenanceStatus = config.maintenance ? "🔴 ON" : "🟢 OFF";

    sendEnhancedResponse(ctx,
      "🛠 *OWNER PANEL*\n\nSilakan pilih menu administrasi:",
      'OWNER',
      Markup.inlineKeyboard([
        [Markup.button.callback("👤 Ubah Role User", "owner_change_role")],
        [Markup.button.callback("📅 Menu Expiry", "owner_menu_expiry")],
        [Markup.button.callback("📋 Menu List User", "owner_menu_list")],
        [Markup.button.callback("🔗 Menu Link Auto Join", "owner_menu_links")],
        [Markup.button.callback("💣 Menu Blast", "owner_menu_blast")],
        [Markup.button.callback("📢 Add PushKontak", "owner_add_pushkontak")],
        [Markup.button.callback("🎫 Generate Token", "owner_generate_token")],
        [Markup.button.callback("🔓 Up Tanpa Token", "owner_up_tanpa_token")],
        [Markup.button.callback("📈 Up Limit Reseller", "owner_up_limit_email")],
        [Markup.button.callback("➕ Add Bot Reseller", "owner_add_bot_reseller"), Markup.button.callback("➕ Add Bot Dev", "owner_add_bot_dev")],
        [Markup.button.callback("➕ Add Bot Dev All", "owner_add_bot_dev_all")],
        [Markup.button.callback("💰 Atur Harga", "owner_set_prices")],
        [Markup.button.callback(`🛠 Maintenance bot: ${maintenanceStatus}`, "owner_toggle_maintenance")],
        [Markup.button.callback("⚠️ Reset Semua User", "owner_reset_all_confirm")],
        [Markup.button.callback("⬅️ Kembali", "start")]
      ])
    );
  });



  bot.action("owner_menu_blast", async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    
    sendEnhancedResponse(ctx,
      "💣 *MENU BLAST OWNER*\n\nPengaturan sistem WhatsApp Blast:",
      'OWNER',
      Markup.inlineKeyboard([
        [Markup.button.callback("💬 Setup Pesan Blast", "owner_setup_blast_msg")],
        [Markup.button.callback("⏱ Set Rate Blast", "owner_set_blast_rate")],
        [Markup.button.callback("➕ Tambah DB Manual", "owner_add_blast_db"), Markup.button.callback("🔍 Cek DB", "owner_cek_blast_db")],
        [Markup.button.callback("🚧 Toggle Maint Blast", "owner_toggle_blast_maint")],
        [Markup.button.callback("⬅️ Kembali", "owner_panel")]
      ])
    );
  });

  bot.action("owner_add_bot_dev_all", async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    ctx.reply("🔑 Masukkan Telegram ID untuk dijadikan Dev All:");
    botSessions.set(ctx.from.id, { action: "owner_add_bot_dev_all_input" });
  });

  bot.action("owner_set_blast_rate", async (ctx) => {
     if (!isOwner(ctx.from.id)) return;
     ctx.reply("💰 Masukkan pendapatan per blast sukses (angka):");
     botSessions.set(ctx.from.id, { action: "owner_set_blast_rate_input" });
  });

  bot.action("owner_setup_blast_msg", async (ctx) => {
     if (!isOwner(ctx.from.id)) return;
     ctx.reply("📝 Masukkan pesan untuk Blast:");
     botSessions.set(ctx.from.id, { action: "owner_setup_blast_msg_input" });
  });

  bot.action("owner_add_blast_db", async (ctx) => {
     if (!isOwner(ctx.from.id)) return;
     ctx.reply("➕ Masukkan nomor WhatsApp, pisahkan dengan baris (enter):");
     botSessions.set(ctx.from.id, { action: "owner_add_blast_db_input" });
  });

  bot.action("owner_cek_blast_db", async (ctx) => {
     if (!isOwner(ctx.from.id)) return;
     
     try {
       const blastService = await import("./src/services/blastService.ts");
       await blastService.replenishBlastDb();
       const readyCount = await blastService.getBlastReadyCount();
       const queueCount = await blastService.getBlastQueueCount();
       
       let text = `📂 *LIST DATABASE BLAST*\n\n`;
       text += `📊 *Total Kontak Siap Blast:* ${readyCount} nomor (Maks 100)\n`;
       text += `⏳ *Kontak di Antrian (Queue):* ${queueCount} nomor\n\n`;
       
       const sample = await blastService.getBlastNumbers(100);
       if (sample.length > 0) {
           text += `*List Kontak (Menampilkan max 100):*\n`;
           sample.forEach((num, index) => {
               text += `${index + 1}. \`${num}\`\n`;
           });
       } else {
           text += `_Database kosong._`;
       }
       
       const safeText = text.length > 4000 ? text.substring(0, 4000) + "..." : text;
       ctx.reply(safeText, { parse_mode: 'Markdown' });
     } catch (e: any) {
       console.error("Error owner_cek_blast_db:", e);
       ctx.reply(`❌ Gagal mengambil database: ${e.message}`);
     }
  });

  bot.action("owner_toggle_blast_maint", async (ctx) => {
     if (!isOwner(ctx.from.id)) return;
     const settingSnap = await getDoc(doc(db, "settings", "blast_config"));
     const isMaint = settingSnap.exists() && settingSnap.data()?.maintenance;
     await setDoc(doc(db, "settings", "blast_config"), { maintenance: !isMaint }, { merge: true });
     ctx.reply(`✅ Maintenance Blast diubah menjadi: ${!isMaint ? 'ON' : 'OFF'}`);
  });

  bot.action("owner_add_bot_reseller", (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    ctx.reply("🆔 Masukkan Telegram ID untuk dijadikan Bot Reseller:");
    botSessions.set(ctx.from.id, { action: "owner_input_bot_reseller_id" });
  });

  bot.action("owner_add_bot_dev", (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    ctx.reply("🆔 Masukkan Telegram ID untuk dijadikan Bot Dev:");
    botSessions.set(ctx.from.id, { action: "owner_input_bot_dev_id" });
  });

  bot.action("owner_toggle_maintenance", async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    try {
      const newStatus = !config.maintenance;
      await updateDoc(doc(db, "settings", "prices"), { maintenance: newStatus });
      ctx.answerCbQuery(`Maintenance Mode: ${newStatus ? "ON" : "OFF"}`);
      // Refresh panel
      const maintenanceStatus = newStatus ? "🔴 ON" : "🟢 OFF";
      ctx.editMessageCaption("🛠 *OWNER PANEL*\n\nSilakan pilih menu administrasi:", {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback("👤 Ubah Role User", "owner_change_role")],
          [Markup.button.callback("📅 Menu Expiry", "owner_menu_expiry")],
          [Markup.button.callback("📋 Menu List User", "owner_menu_list")],
          [Markup.button.callback("🔗 Menu Link Auto Join", "owner_menu_links")],
          [Markup.button.callback("🎫 Generate Token", "owner_generate_token")],
          [Markup.button.callback("💰 Atur Harga", "owner_set_prices")],
          [Markup.button.callback(`🛠 Maintenance: ${maintenanceStatus}`, "owner_toggle_maintenance")],
          [Markup.button.callback("⚠️ Reset Semua User", "owner_reset_all_confirm")],
          [Markup.button.callback("⬅️ Kembali", "start")]
        ])
      });
    } catch (e) {
      ctx.reply("❌ Gagal mengubah status maintenance.");
    }
  });

  bot.action("owner_generate_token", (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    ctx.editMessageCaption("Pilih jenis token yang ingin di-generate:", {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🎫 Token Biasa (2 User)", "owner_gen_token_normal")],
        [Markup.button.callback("♾️ Token Unlimited", "owner_gen_token_unli")],
        [Markup.button.callback("⬅️ Kembali", "owner_panel")]
      ])
    });
  });

  bot.action("owner_gen_token_normal", (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    ctx.reply("🔢 Masukkan jumlah token biasa yang ingin di-generate (1-100):");
    botSessions.set(ctx.from.id, { action: "owner_input_token_qty" });
  });

  bot.action("owner_gen_token_unli", (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    ctx.reply("⏳ Masukkan durasi expired untuk Token Unlimited.\nFormat: [angka][d/h/m]\nContoh: 7d (7 hari), 30d (30 hari)");
    botSessions.set(ctx.from.id, { action: "owner_input_token_unli_duration" });
  });

  bot.action("owner_up_limit_email", (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    ctx.reply("📧 Masukkan email Reseller untuk diatur limit hariannya:");
    botSessions.set(ctx.from.id, { action: "owner_input_up_limit_email" });
  });

  bot.action("owner_reset_all_confirm", (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    ctx.reply("⚠️ *PERINGATAN!*\n\nApakah Anda yakin ingin mereset SEMUA user menjadi *Free*?\n\nTindakan ini tidak dapat dibatalkan.", {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback("✅ Ya, Reset Semua", "owner_reset_all_execute")],
        [Markup.button.callback("❌ Batal", "owner_panel")]
      ])
    });
  });

  bot.action("owner_reset_all_execute", async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    await ctx.reply("⏳ Sedang mereset semua user... Mohon tunggu.");
    try {
      const usersRef = collection(db, "users");
      const snap = await getDocs(usersRef);
      let count = 0;
      
      // Batch update would be better but let's do it simply for now
      for (const userDoc of snap.docs) {
        const userData = userDoc.data();
        // Skip owner if they have an account
        if (userData.role !== 'owner') {
          await updateDoc(userDoc.ref, { 
            role: 'free',
            expiryDate: null 
          });
          count++;
        }
      }
      
      ctx.reply(`✅ Berhasil mereset ${count} user menjadi Free.`);
    } catch (e) {
      ctx.reply("❌ Gagal mereset user: " + e.message);
    }
  });

  bot.action("owner_set_prices", async (ctx) => {
    const prices = await getPrices();
    const webPricing = await getWebPricing();
    ctx.reply(`💰 *PENGATURAN HARGA*\n\n*HARGA BOT:*\n• Token 1: Rp ${prices.token_1.toLocaleString('id-ID')}\n• Token Unli 7D: Rp ${prices.token_unlimited_7d.toLocaleString('id-ID')}\n• Token Unli 15D: Rp ${prices.token_unlimited_15d.toLocaleString('id-ID')}\n• Token Unli 30D: Rp ${prices.token_unlimited_30d.toLocaleString('id-ID')}\n• Limit Upgrade: Rp ${prices.limit_upgrade.toLocaleString('id-ID')}\n\n*HARGA PUSHKONTAK:*\n• 1 Jam: Rp ${prices.pushkontak_1h.toLocaleString('id-ID')}\n• 3 Jam: Rp ${prices.pushkontak_3h.toLocaleString('id-ID')}\n• 6 Jam: Rp ${prices.pushkontak_6h.toLocaleString('id-ID')}\n• 12 Jam: Rp ${prices.pushkontak_12h.toLocaleString('id-ID')}\n\n*HARGA PROMOTE PAID (PP):*\n• PP Grup: Rp ${prices.harga_grup.toLocaleString('id-ID')}\n• PP Saluran: Rp ${prices.harga_saluran.toLocaleString('id-ID')}\n\n*HARGA WEB:*\n• Web VIP Monthly: Rp ${webPricing.vipMonthly.toLocaleString('id-ID')}\n• Web VIP Yearly: Rp ${webPricing.vipYearly.toLocaleString('id-ID')}\n\nSilakan pilih item untuk diatur harganya:`, 
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback("Limit Upgrade", "set_price_limit_upgrade")],
          [Markup.button.callback("Token Biasa", "set_price_token_1")],
          [Markup.button.callback("Token Unli 7D", "set_price_token_unlimited_7d"), Markup.button.callback("Token Unli 15D", "set_price_token_unlimited_15d")],
          [Markup.button.callback("Token Unli 30D", "set_price_token_unlimited_30d")],
          [Markup.button.callback("PK 1 Jam", "set_price_pushkontak_1h"), Markup.button.callback("PK 3 Jam", "set_price_pushkontak_3h")],
          [Markup.button.callback("PK 6 Jam", "set_price_pushkontak_6h"), Markup.button.callback("PK 12 Jam", "set_price_pushkontak_12h")],
          [Markup.button.callback("🚀 Harga PP Grup", "set_price_harga_grup"), Markup.button.callback("🚀 Harga PP Saluran", "set_price_harga_saluran")],
          [Markup.button.callback("🌐 Web VIP Monthly", "set_price_web_vip_monthly"), Markup.button.callback("🌐 Web VIP Yearly", "set_price_web_vip_yearly")],
          [Markup.button.callback("⬅️ Kembali", "owner_panel")]
        ])
      }
    );
  });

  bot.action(/^set_price_(.+)$/, (ctx) => {
    const item = ctx.match[1];
    ctx.reply(`💰 Masukkan harga baru untuk *${item}*:`);
    botSessions.set(ctx.from.id, { action: "owner_input_price", item });
  });

  bot.action("owner_add_pushkontak", (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    ctx.reply("📝 Masukkan ID Telegram target:");
    botSessions.set(ctx.from.id, { action: "owner_input_pk_target" });
  });

  bot.action("owner_change_role", (ctx) => {
    ctx.reply("📧 Masukkan email user untuk ubah role:");
    botSessions.set(ctx.from.id, { action: "owner_set_role_email" });
  });

  const renderLinksMenu = () => {
    return Markup.inlineKeyboard([
      [Markup.button.callback("TAMBAH PP GRUP", "set_link_grup"), Markup.button.callback("TAMBAH PP SALURAN", "set_link_saluran")],
      [Markup.button.callback("🔍 CEK LINK", "owner_cek_links"), Markup.button.callback("🗑️ RESET PP DB", "owner_reset_links_db")],
      [Markup.button.callback("⬅️ BACK", "owner_panel")]
    ]);
  };

  bot.action("owner_menu_links", async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    
    try {
      await cleanExpiredPPLinks(); // Clean real-time
      
      const qSaluran = await getDocs(collection(db, "pp_channel"));
      const qGrup = await getDocs(collection(db, "pp_group"));
      
      let countSaluranUser = 0;
      let countGrupUser = 0;
      
      qSaluran.forEach((doc) => {
        const d = doc.data();
        if (d.role !== 'owner' && !isOwner(d.userId || d.user_id)) countSaluranUser++;
      });
      qGrup.forEach((doc) => {
        const d = doc.data();
        if (d.role !== 'owner' && !isOwner(d.userId || d.user_id)) countGrupUser++;
      });
      
      const pubSaluran = Math.max(0, 6 - countSaluranUser);
      const pubGrub = Math.max(0, 6 - countGrupUser);

      ctx.editMessageCaption(`📌 *MANAJEMEN LINK PP AUTO JOIN*\n\nPilih opsi untuk mengatur link Saluran atau Grup. Owner dapat memasukkan link tanpa batas (Unlimited).\n\n*SLOT USER (DIBELI):*\n• Saluran: ${countSaluranUser}/6 (Sisa: ${pubSaluran})\n• Grup: ${countGrupUser}/6 (Sisa: ${pubGrub})\n\n*TOTAL LINK BERJALAN (Akan dijawab bot):*\n• Saluran: ${qSaluran.size} Link\n• Grup: ${qGrup.size} Link`, {
        parse_mode: 'Markdown',
        ...renderLinksMenu()
      });
    } catch (e) {
      console.error(e);
      ctx.reply("❌ Error memuat data PP.");
    }
  });

  bot.action(/^set_link_(grup|saluran)$/, (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const target = ctx.match[1];
    ctx.reply(`🔗 Silakan kirimkan link untuk *${target.toUpperCase()}*:`, { parse_mode: 'Markdown' });
    botSessions.set(ctx.from.id, { action: "owner_input_pp_db_link", target });
  });

  bot.action("owner_cek_links", async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    try {
      const qSaluran = await getDocs(collection(db, "pp_channel"));
      const qGrup = await getDocs(collection(db, "pp_group"));
      
      const escapeHtml = (unsafe: string) => {
        return (unsafe || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      };
      
      let text = `🔍 <b>DAFTAR LINK AKTIF PP DB</b>\n\n<b>SALURAN:</b>\n`;
      let i = 1;
      qSaluran.forEach((doc) => {
         const data = doc.data();
         text += `${i}. ${escapeHtml(data.link)}\n`;
         i++;
      });
      if (i === 1) text += "Kosong\n";

      text += `\n<b>GRUP:</b>\n`;
      i = 1;
      qGrup.forEach((doc) => {
         const data = doc.data();
         text += `${i}. ${escapeHtml(data.link)}\n`;
         i++;
      });
      if (i === 1) text += "Kosong\n";

      ctx.reply(text, { parse_mode: 'HTML' });
    } catch(e) {
       console.error(e);
    }
  });

  bot.action("owner_reset_links_db", async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    try {
      const qSaluran = await getDocs(collection(db, "pp_channel"));
      for (const d of qSaluran.docs) {
         await deleteDoc(d.ref);
      }
      const qGrup = await getDocs(collection(db, "pp_group"));
      for (const d of qGrup.docs) {
         await deleteDoc(d.ref);
      }
      ctx.reply("✅ Semua link auto-join DB berhasil direset!");
      
      const pubSaluran = 6;
      const pubGrub = 6;

      ctx.editMessageCaption(`📌 *MANAJEMEN LINK PP AUTO JOIN*\n\nPilih opsi untuk mengatur link Saluran atau Grup. Owner dapat memasukkan link tanpa batas (Unlimited).\n\n*SLOT USER (DIBELI):*\n• Saluran: 0/6 (Sisa: 6)\n• Grup: 0/6 (Sisa: 6)\n\n*TOTAL LINK BERJALAN (Akan dijawab bot):*\n• Saluran: 0 Link\n• Grup: 0 Link`, {
        parse_mode: 'Markdown',
        ...renderLinksMenu()
      });
    } catch(e) {
      console.log(e);
    }
  });

  bot.action("owner_up_tanpa_token", (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    ctx.reply("📧 Masukkan email Dev/Reseller untuk diatur akses Up Tanpa Token:");
    botSessions.set(ctx.from.id, { action: "owner_set_up_tanpa_token_email" });
  });

  bot.action(/^set_up_tanpa_token_(true|false)$/, async (ctx) => {
    const status = ctx.match[1] === 'true';
    const session = botSessions.get(ctx.from.id);
    if (session?.action !== "owner_set_up_tanpa_token_toggle") return;

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", session.email));
      const snap = await getDocs(q);
      if (snap.empty) return ctx.reply("❌ User tidak ditemukan.");

      await updateDoc(doc(db, "users", snap.docs[0].id), { canUpgradeWithoutToken: status });
      ctx.reply(`✅ Sukses! Akses Up Tanpa Token untuk ${session.email} telah ${status ? 'diaktifkan' : 'dinonaktifkan'}.`);
    } catch (e) {
      ctx.reply("❌ Gagal update status.");
    }
    botSessions.delete(ctx.from.id);
  });

  bot.action("owner_menu_expiry", async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    
    let autoLockStatus = "ON";
    try {
      const subDoc = await getDoc(doc(db, "settings", "subscription"));
      if (subDoc.exists() && subDoc.data().autoLock15 === false) {
        autoLockStatus = "OFF";
      }
    } catch (e) {}

    ctx.editMessageCaption("📅 *MENU EXPIRY (SUBSCRIPTION)*\n\nPilih target yang akan di-lock (expired):", {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(`⚙️ Auto Lock Tgl 15: ${autoLockStatus}`, "owner_toggle_autolock")],
        [Markup.button.callback("🔒 Lock Semua User Sekarang", "owner_auto_expired")],
        [Markup.button.callback("🔒 Lock Semua VIP", "owner_lock_vip")],
        [Markup.button.callback("🔒 Lock Semua Reseller", "owner_lock_reseller")],
        [Markup.button.callback("🔒 Lock Semua Dev", "owner_lock_dev")],
        [Markup.button.callback("📊 Cek Total User Expired", "owner_cek_expired")],
        [Markup.button.callback("✅ Aktifkan User Manual", "owner_aktifkan_manual")],
        [Markup.button.callback("⬅️ Kembali", "owner_panel")]
      ])
    });
  });

  bot.action("owner_toggle_autolock", async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    try {
      const subDoc = await getDoc(doc(db, "settings", "subscription"));
      let currentStatus = true;
      if (subDoc.exists() && subDoc.data().autoLock15 === false) {
        currentStatus = false;
      }
      
      await setDoc(doc(db, "settings", "subscription"), { autoLock15: !currentStatus }, { merge: true });
      
      ctx.answerCbQuery(`Auto Lock Tgl 15 berhasil diubah menjadi ${!currentStatus ? 'ON' : 'OFF'}`);
      
      // Refresh menu
      let autoLockStatus = !currentStatus ? "ON" : "OFF";
      ctx.editMessageCaption("📅 *MENU EXPIRY (SUBSCRIPTION)*\n\nPilih target yang akan di-lock (expired):", {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(`⚙️ Auto Lock Tgl 15: ${autoLockStatus}`, "owner_toggle_autolock")],
          [Markup.button.callback("🔒 Lock Semua User Sekarang", "owner_auto_expired")],
          [Markup.button.callback("🔒 Lock Semua VIP", "owner_lock_vip")],
          [Markup.button.callback("🔒 Lock Semua Reseller", "owner_lock_reseller")],
          [Markup.button.callback("🔒 Lock Semua Dev", "owner_lock_dev")],
          [Markup.button.callback("📊 Cek Total User Expired", "owner_cek_expired")],
          [Markup.button.callback("✅ Aktifkan User Manual", "owner_aktifkan_manual")],
          [Markup.button.callback("⬅️ Kembali", "owner_panel")]
        ])
      });
    } catch (e) {
      ctx.answerCbQuery("Gagal mengubah setting");
    }
  });

  ['vip', 'reseller', 'dev'].forEach(role => {
    bot.action(`owner_lock_${role}`, async (ctx) => {
      if (!isOwner(ctx.from?.id)) return;
      
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("role", "==", role));
        const querySnapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        querySnapshot.forEach((docSnap) => {
          batch.update(docSnap.ref, { status_active: false });
        });
        
        await batch.commit();
        ctx.reply(`✅ Semua user ${role.toUpperCase()} (${querySnapshot.size}) berhasil di-lock (expired).`);
      } catch (e: any) {
        ctx.reply(`❌ Gagal: ${e.message}`);
      }
    });
  });

  bot.action(/^set_role_(.+)$/, async (ctx) => {
    const role = ctx.match[1];
    const session = botSessions.get(ctx.from.id);
    if (session?.action !== "owner_set_role_select") return;

    const email = session.email;
    const MASTER_DEV_EMAIL = process.env.MASTER_DEV_EMAIL;
    if (MASTER_DEV_EMAIL && email === MASTER_DEV_EMAIL) return ctx.reply("❌ Tidak bisa modifikasi super admin.");

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const snap = await getDocs(q);
      if (snap.empty) return ctx.reply("❌ User tidak ditemukan.");

      await updateDoc(doc(db, "users", snap.docs[0].id), { role });
      ctx.reply(`✅ Sukses! Role ${email} diubah ke ${role}.`);
    } catch (e) {
      ctx.reply("❌ Gagal update role.");
    }
    botSessions.delete(ctx.from.id);
  });

  bot.action(/^check_pay_(.+)$/, async (ctx) => {
    const id = ctx.match[1];
    try {
      const paymentDoc = await getDoc(doc(db, "payments", id));
      if (!paymentDoc.exists()) {
        return ctx.answerCbQuery("❌ Data pembayaran tidak ditemukan.", { show_alert: true });
      }

      const paymentData = paymentDoc.data();
      if (paymentData.status === "PAID") {
        // Still try to delete QRIS if it exists
        if (paymentData.qrisMessageId && paymentData.chatId) {
          try {
            await bot.telegram.deleteMessage(paymentData.chatId, paymentData.qrisMessageId);
          } catch (e) {}
        }
        return ctx.answerCbQuery("✅ Pembayaran sudah berhasil diproses!", { show_alert: true });
      }

      // Check for expiration
      if (paymentData.expiresAt) {
        const expiresAt = new Date(paymentData.expiresAt);
        if (new Date() > expiresAt) {
          await updateDoc(doc(db, "payments", id), { status: "EXPIRED" });
          
          // Delete QRIS message if exists
          if (paymentData.qrisMessageId && paymentData.chatId) {
            try {
              await bot.telegram.deleteMessage(paymentData.chatId, paymentData.qrisMessageId);
            } catch (e) {}
          }

          return ctx.answerCbQuery("❌ Pembayaran sudah kadaluarsa (Expired). Silakan buat pesanan baru.", { show_alert: true });
        }
      }

      if (paymentData.status === "EXPIRED") {
        return ctx.answerCbQuery("❌ Pembayaran sudah kadaluarsa (Expired). Silakan buat pesanan baru.", { show_alert: true });
      }

      let isPaid = false;
      if (paymentData.method === "pakasir") {
        try {
          const url = `${PAKASIR_BASE}/transactiondetail?project=${PAKASIR_PROJECT_NAME}&amount=${paymentData.amount}&order_id=${id}&api_key=${PAKASIR_API_KEY}`;
          const { data } = await axios.get(url, { timeout: 10000 });
          const pakasirStatus = data?.transaction?.status?.toLowerCase() || data?.status?.toLowerCase();
          if (pakasirStatus === 'completed' || pakasirStatus === 'paid' || pakasirStatus === 'success') {
            isPaid = true;
          }
        } catch (e: any) {
          if (e.response?.status === 429) {
            console.log("Rate limited by Pakasir during manual check");
          }
        }
      } else if (paymentData.method === "atlantic") {
        const res = await axios.post(`${ATL_BASE}/deposit/status`, qs.stringify({
          api_key: ATLANTIC_API_KEY,
          id: String(paymentData.atlanticId),
        }), {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 10000
        });
        const status = res.data?.data?.status?.toLowerCase();
        if (status === "success") {
          isPaid = true;
        }
      }

      if (isPaid) {
        await ctx.answerCbQuery("✅ Pembayaran Berhasil! Memproses...", { show_alert: true });
        await processSuccessfulPayment(id, paymentData);
      } else {
        await ctx.answerCbQuery("⏳ Pembayaran belum diterima. Silakan selesaikan pembayaran Anda.", { show_alert: true });
      }
    } catch (e) {
      console.error("Error checking payment status:", e);
      ctx.answerCbQuery("❌ Terjadi kesalahan saat mengecek status.", { show_alert: true });
    }
  });

  bot.action("owner_menu_list", (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    ctx.editMessageCaption("📋 *MENU LIST USER*\n\nPilih kategori user:", {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback("Semua User", "owner_list_users_all")],
        [Markup.button.callback("User VIP", "owner_list_users_vip")],
        [Markup.button.callback("User Reseller", "owner_list_users_reseller")],
        [Markup.button.callback("User Dev", "owner_list_users_dev")],
        [Markup.button.callback("⬅️ Kembali", "owner_panel")]
      ])
    });
  });

  const listUsersByRole = async (ctx: any, roleFilter: string | null) => {
    if (!isOwner(ctx.from.id)) return;
    try {
      const usersRef = collection(db, "users");
      let q = query(usersRef);
      if (roleFilter) {
        q = query(usersRef, where("role", "==", roleFilter));
      }
      const snap = await getDocs(q);
      if (snap.empty) {
        return ctx.reply(`Belum ada user${roleFilter ? ` dengan role ${roleFilter}` : ''}.`);
      }
      
      let msg = `📋 *Daftar User ${roleFilter ? roleFilter.toUpperCase() : 'Semua'}*\nTotal: ${snap.size}\n\n`;
      const MASTER_DEV_EMAIL = process.env.MASTER_DEV_EMAIL;
      snap.forEach(doc => {
        const u = doc.data();
        const email = (MASTER_DEV_EMAIL && u.email === MASTER_DEV_EMAIL) ? "hidden_user" : u.email;
        const expiryStr = u.expiryDate ? ` - Exp: ${formatWIB(u.expiryDate)}` : '';
        msg += `• \`${email}\` (${u.role || 'free'})${expiryStr}\n`;
      });
      
      // Use safeSendMessage logic for long lists
      await safeSendMessage(ctx.telegram, ctx.chat!.id, msg);
    } catch (e) {
      ctx.reply("❌ Gagal mengambil daftar user.");
    }
  };

  bot.action("owner_list_users_all", (ctx) => listUsersByRole(ctx, null));
  bot.action("owner_list_users_vip", (ctx) => listUsersByRole(ctx, "vip"));
  bot.action("owner_list_users_reseller", (ctx) => listUsersByRole(ctx, "reseller"));
  bot.action("owner_list_users_dev", (ctx) => listUsersByRole(ctx, "dev"));

  // Start Bot
  if (process.env.TELEGRAM_BOT_TOKEN) {
    console.log("Attempting to start Telegram Bot...");
    bot.launch({ dropPendingUpdates: true }).then(() => {
      console.log("✅ Telegram Bot started successfully");
    }).catch((err) => {
      console.error("❌ Failed to start Telegram Bot:", err.message);
    });
  } else {
    console.error("⚠️ TELEGRAM_BOT_TOKEN is not set. Bot will not start.");
  }

  // API Routes
  app.get("/api/wa/status", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId required" });

    let session = await getSession(userId);
    if (!session) {
      // Try to auto-init if folder exists
      const sessionPath = path.join(SESSIONS_DIR, userId);
      if (fs.existsSync(sessionPath)) {
        await initWhatsApp(userId);
        session = await getSession(userId);
      } else {
        return res.json({ status: "disconnected", qr: null });
      }
    }

    res.json({ 
      status: session?.status || "disconnected", 
      qr: session?.qr,
      pairingCode: (session as any)?.pairingCode 
    });
  });

  app.post("/api/wa/connect", async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    
    await initWhatsApp(userId);
    res.json({ success: true });
  });

  app.post("/api/wa/pairing-code", async (req, res) => {
    const { userId, phoneNumber } = req.body;
    if (!userId || !phoneNumber) return res.status(400).json({ error: "userId and phoneNumber required" });

    // Sanitize phone number (remove +, spaces, dashes)
    const sanitizedPhone = phoneNumber.replace(/\D/g, '');

    // Clean up existing session if any
    const session = sessions.get(userId);
    if (session) {
      try {
        await session.sock.logout();
      } catch (e) {}
      sessions.delete(userId);
    }

    // CRITICAL: Delete session files to ensure fresh pairing
    // If we don't do this, it might reuse old keys and cause "invalid code" errors
    const sessionPath = path.join(SESSIONS_DIR, userId);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    await initWhatsApp(userId, sanitizedPhone);
    res.json({ success: true });
  });

  app.post("/api/wa/logout", async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const session = sessions.get(userId);
    if (session) {
      try {
        await session.sock.logout();
      } catch (e) {}
      sessions.delete(userId);
    }

    const sessionPath = path.join(SESSIONS_DIR, userId);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    res.json({ success: true });
  });

  app.post("/api/wa/send", async (req, res) => {
    const { userId, jid, message, media, mediaType, isPushContact } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const session = await getSession(userId);
    if (!session || session.status !== "connected") {
      return res.status(400).json({ error: "WhatsApp not connected" });
    }

    try {
      // Robust JID formatting: if it already has @, use as is. 
      // Otherwise, assume it's a number and add @s.whatsapp.net
      const id = jid.includes("@") ? jid : `${jid}@s.whatsapp.net`;

      let msgContent: any = { text: message };
      
      if (media && mediaType) {
        const buffer = Buffer.from(media, 'base64');
        if (mediaType === 'image') {
          msgContent = { image: buffer, caption: message || '' };
        } else if (mediaType === 'video') {
          msgContent = { video: buffer, caption: message || '' };
        } else if (mediaType === 'document') {
          msgContent = { document: buffer, caption: message || '', mimetype: 'application/pdf', fileName: 'document.pdf' };
        }
      }

      // Add a timeout to the sendMessage call to prevent hanging
      const sendPromise = session.sock.sendMessage(id, msgContent);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Send timeout")), 15000)
      );

      await Promise.race([sendPromise, timeoutPromise]);

      // Auto save contact if it's a direct message (not a group)
      if (!id.includes("@g.us")) {
        contactService.saveContact(userId, id);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error(`Send error for user ${userId}:`, error.message);
      
      // If connection is closed, update session status
      if (error.message.includes("Connection Closed") || error.message.includes("Socket closed")) {
        session.status = "disconnected";
      }
      
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/contacts/stats", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const contactsPath = path.join(DATA_DIR, userId, "contacts.json");
    if (!fs.existsSync(contactsPath)) {
      return res.json({ total: 0, preview: [] });
    }

    try {
      const contacts = JSON.parse(fs.readFileSync(contactsPath, "utf-8"));
      res.json({
        total: contacts.length,
        preview: contacts.slice(-20).reverse() // Show latest 20
      });
    } catch (e) {
      res.json({ total: 0, preview: [] });
    }
  });

  app.post("/api/contacts/reset", async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const contactsPath = path.join(DATA_DIR, userId, "contacts.json");
    if (fs.existsSync(contactsPath)) {
      fs.writeFileSync(contactsPath, JSON.stringify([], null, 2));
    }
    res.json({ success: true });
  });

  app.get("/api/export/json", (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const contactsPath = path.join(DATA_DIR, userId, "contacts.json");
    if (!fs.existsSync(contactsPath)) return res.json([]);

    res.download(contactsPath, "contacts.json");
  });

  app.get("/api/export/txt", (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const contactsPath = path.join(DATA_DIR, userId, "contacts.json");
    if (!fs.existsSync(contactsPath)) return res.send("");

    try {
      const contacts = JSON.parse(fs.readFileSync(contactsPath, "utf-8"));
      const txt = contacts.map((c: any) => `${c.name} - +${c.number}`).join("\n");
      
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Disposition", "attachment; filename=contacts.txt");
      res.send(txt);
    } catch (e) {
      res.send("");
    }
  });

  app.get("/api/export/vcf", (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const contactsPath = path.join(DATA_DIR, userId, "contacts.json");
    if (!fs.existsSync(contactsPath)) return res.send("");

    try {
      const contacts = JSON.parse(fs.readFileSync(contactsPath, "utf-8"));
      const vcf = contacts.map((c: any) => {
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${c.name}\nTEL;TYPE=CELL:+${c.number}\nEND:VCARD`;
      }).join("\n");

      res.setHeader("Content-Type", "text/vcard");
      res.setHeader("Content-Disposition", "attachment; filename=contacts.vcf");
      res.send(vcf);
    } catch (e) {
      res.send("");
    }
  });

  app.get("/api/wa/groups", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const session = await getSession(userId);
    if (!session || session.status !== "connected") {
      return res.status(400).json({ error: "WhatsApp not connected" });
    }

    try {
      const groupsPromise = session.sock.groupFetchAllParticipating();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Fetch groups timeout")), 15000)
      );

      const groups = await Promise.race([groupsPromise, timeoutPromise]) as any;
      const groupList = Object.values(groups).map((g: any) => ({
        id: g.id,
        name: g.subject,
        members: g.participants.length,
      }));
      res.json({ groups: groupList });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/wa/group-members", async (req, res) => {
    const userId = req.query.userId as string;
    const groupId = req.query.groupId as string;
    if (!userId || !groupId) return res.status(400).json({ error: "userId and groupId required" });

    const session = await getSession(userId);
    if (!session || session.status !== "connected") {
      return res.status(400).json({ error: "WhatsApp not connected" });
    }

    try {
      console.log(`[DEBUG] Fetching members for group: ${groupId} (User: ${userId})`);
      
      let metadata: any = null;
      try {
        metadata = await session.sock.groupMetadata(groupId);
        console.log(`[DEBUG] groupMetadata success. Participants: ${metadata?.participants?.length || 0}`);
      } catch (e: any) {
        console.log(`[DEBUG] groupMetadata failed: ${e.message}. Trying fallback...`);
        const allGroups = await session.sock.groupFetchAllParticipating();
        metadata = allGroups[groupId];
        console.log(`[DEBUG] Fallback success. Found group in list: ${!!metadata}`);
      }
      
      if (!metadata || !metadata.participants) {
        console.log(`[DEBUG] No participants found for ${groupId}`);
        return res.json({ members: [] });
      }

      // Log the structure of the first participant to debug
      if (metadata.participants.length > 0) {
        console.log(`[DEBUG] First participant sample:`, JSON.stringify(metadata.participants[0]));
      }

      const members = metadata.participants
        .map((p: any) => {
          // Prioritize phoneNumber if it exists and is a standard JID
          if (p.phoneNumber && typeof p.phoneNumber === 'string' && p.phoneNumber.includes('@s.whatsapp.net')) {
            return p.phoneNumber;
          }
          // Fallback to id or jid
          return p.id || p.jid;
        })
        .filter((id: any) => id && typeof id === 'string' && (id.includes('@s.whatsapp.net') || id.includes('@c.us') || id.includes('@lid')));
      
      console.log(`[DEBUG] Final members list sample:`, members.slice(0, 3));
      console.log(`[DEBUG] Filtered members: ${members.length} from ${metadata.participants.length} total participants`);
      res.json({ members });
    } catch (error: any) {
      console.error(`[DEBUG] Error in group-members:`, error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/system/metrics", (req, res) => {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = Math.round((usedMem / totalMem) * 100);
    
    // Simple load average calculation
    const load = os.loadavg()[0];
    const cpuUsage = Math.min(Math.round((load / cpus.length) * 100), 100);
  
    res.json({
      cpu: cpuUsage,
      memory: memUsage,
      storage: 45, // Static for now as getting disk usage requires exec
      uptime: os.uptime()
    });
  });
  
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/start-push", (req, res) => {
    setPushStatus(true);
    console.log("PUSH RUNNING 🔥");
    res.json({ status: "Push aktif" });
  });

  app.post("/stop-push", (req, res) => {
    setPushStatus(false);
    console.log("PUSH STOPPED ⛔");
    res.json({ status: "Push dihentikan" });
  });

  app.get("/control-panel", (req, res) => {
    const statusText = getPushStatus() ? "AKTIF 🔥" : "NONAKTIF ⛔";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Push Control Panel</title>
        <style>
          body { font-family: sans-serif; text-align: center; margin-top: 50px; background-color: #f4f4f9; }
          button { padding: 15px 30px; font-size: 18px; margin: 10px; cursor: pointer; border-radius: 8px; font-weight: bold; }
          .start { background-color: #4CAF50; color: white; border: none; }
          .stop { background-color: #f44336; color: white; border: none; }
          .status { font-size: 24px; font-weight: bold; margin-bottom: 30px; }
        </style>
      </head>
      <body>
        <h1>Web Control Panel</h1>
        <div class="status" id="status">PUSH STATUS: ${statusText}</div>
        <button class="start" onclick="setPush(true)">START PUSH</button>
        <button class="stop" onclick="setPush(false)">STOP PUSH</button>
        
        <script>
          async function setPush(isActive) {
            const endpoint = isActive ? '/start-push' : '/stop-push';
            try {
              const res = await fetch(endpoint, { method: 'POST' });
              const data = await res.json();
              document.getElementById('status').innerText = 'PUSH STATUS: ' + (isActive ? 'AKTIF 🔥' : 'NONAKTIF ⛔');
              alert(data.status);
            } catch (e) {
              alert('Error: ' + e.message);
            }
          }
        </script>
      </body>
      </html>
    `;
    res.send(html);
  });

  app.get("/api/proxy", async (req, res) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).json({ error: "URL required" });

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
      const text = await response.text();
      res.json({ contents: text });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    
    // Check if dist exists
    if (!fs.existsSync(distPath)) {
      console.error('Error: dist folder not found! Make sure to run "npm run build" before starting the server.');
    }

    app.use(express.static(distPath));
    
    // SPA fallback
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      if (fs.existsSync(path.join(distPath, 'index.html'))) {
        res.sendFile(path.join(distPath, 'index.html'));
      } else {
        res.status(404).send('App not built. Run npm run build.');
      }
    });
  }

  // Background Polling for Pending Payments
  setInterval(async () => {
    try {
      const paymentsRef = collection(db, "payments");
      const q = query(paymentsRef, where("status", "==", "PENDING"));
      const querySnapshot = await getDocs(q);

      for (const paymentDoc of querySnapshot.docs) {
        const paymentData = paymentDoc.data();
        const id = paymentDoc.id;
        let isPaid = false;

        if (paymentData.method === "pakasir") {
          try {
            const url = `${PAKASIR_BASE}/transactiondetail?project=${PAKASIR_PROJECT_NAME}&amount=${paymentData.amount}&order_id=${id}&api_key=${PAKASIR_API_KEY}`;
            const { data } = await axios.get(url, { timeout: 10000 });
            const pakasirStatus = data?.transaction?.status?.toLowerCase() || data?.status?.toLowerCase();
            if (pakasirStatus === 'completed' || pakasirStatus === 'paid' || pakasirStatus === 'success') {
              isPaid = true;
            }
          } catch (e: any) {
            if (e.response?.status === 429) {
              console.log("Rate limited by Pakasir during background polling");
            }
          }
        } else if (paymentData.method === "atlantic") {
          try {
            const res = await axios.post(`${ATL_BASE}/deposit/status`, qs.stringify({
              api_key: ATLANTIC_API_KEY,
              id: String(paymentData.atlanticId),
            }), {
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              timeout: 10000
            });
            const status = res.data?.data?.status?.toLowerCase();
            if (status === "success") {
              isPaid = true;
            }
          } catch (e) {}
        }

        if (isPaid) {
          await processSuccessfulPayment(id, paymentData);
        }
      }
    } catch (error) {
      console.error("Error in payment polling:", error);
    }
  }, 30000); // Poll every 30 seconds

  // Background job to auto-downgrade expired users
  setInterval(async () => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("expiryDate", "<", new Date().toISOString()));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const batch = writeBatch(db);
        let count = 0;
        snap.forEach(userDoc => {
          const data = userDoc.data();
          if (data.role !== 'free' && data.role !== 'owner' && data.role !== 'dev') {
            batch.update(userDoc.ref, { role: 'free' });
            count++;
          }
        });
        
        if (count > 0) {
          await batch.commit();
          console.log(`Auto-downgraded ${count} expired users to free.`);
        }
      }
    } catch (e) {
      console.error("Error in auto-downgrade cron:", e);
    }
  }, 60000); // Check every minute

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
