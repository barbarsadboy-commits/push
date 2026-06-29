import { Telegraf } from 'telegraf';
import crypto from 'crypto';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const SECRET_KEY = process.env.SECRET_KEY || '';
const OWNER_ID_HASH = process.env.OWNER_ID_HASH || '';
const RAW_OWNER_ID = process.env.TELEGRAM_OWNER_ID || '';

export const bot = new Telegraf(BOT_TOKEN);

export let config = {
  maintenance: false,
  vipPrice: 10000,
  firebase: {},
  limit: 100,
  feature: {
    deposit: true
  },
  ownerId: RAW_OWNER_ID ? parseInt(RAW_OWNER_ID) : null as number | null
};

export function isOwner(userId: number): boolean {
  // Check raw ID first (easiest for users)
  if (RAW_OWNER_ID && String(userId) === RAW_OWNER_ID) {
    if (config.ownerId !== userId) config.ownerId = userId;
    return true;
  }

  // Check hashed ID (more secure)
  if (SECRET_KEY && OWNER_ID_HASH) {
    const hash = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(String(userId))
      .digest("hex");

    const valid = hash === OWNER_ID_HASH;
    if (valid && config.ownerId !== userId) {
      config.ownerId = userId;
    }
    return valid;
  }

  return false;
}
