import fs from 'fs';
import path from 'path';

export interface PPLink {
  id: string;
  type: "saluran" | "grub";
  link: string;
  created_at: number;
  expired_at: number;
  is_owner: boolean;
  user_id?: string;
}

const DATA_PATH = path.join(process.cwd(), "data", "pp_links.json");

function ensureFile() {
  if (!fs.existsSync(path.dirname(DATA_PATH))) {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  }
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify([]));
  }
}

export function getAllLinks(): PPLink[] {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return [];
  }
}

export function saveAllLinks(links: PPLink[]) {
  ensureFile();
  fs.writeFileSync(DATA_PATH, JSON.stringify(links, null, 2));
}

export function getActiveLinks(type?: "saluran" | "grub"): PPLink[] {
  const now = Math.floor(Date.now() / 1000);
  let links = getAllLinks().filter(l => l.is_owner || l.expired_at > now);
  if (type) {
    links = links.filter(l => l.type === type);
  }
  return links;
}

export function cleanExpiredLinks() {
  const now = Math.floor(Date.now() / 1000);
  const links = getAllLinks();
  const valid = links.filter(l => l.is_owner || l.expired_at > now);
  if (valid.length !== links.length) {
    saveAllLinks(valid);
  }
}

export function getPublicSlots(type: "saluran" | "grub") {
  const max = 2; // Public quota
  const now = Math.floor(Date.now() / 1000);
  const activePublic = getAllLinks().filter(l => l.type === type && !l.is_owner && l.expired_at > now).length;
  return Math.max(0, max - activePublic);
}

export function getOwnerSlots(type: "saluran" | "grub") {
  const max = 4; // Owner quota
  const activeOwner = getAllLinks().filter(l => l.type === type && l.is_owner).length;
  return Math.max(0, max - activeOwner);
}

export function addLink(link: string, type: "saluran" | "grub", isOwner: boolean, userId?: string, days = 1) {
  const links = getAllLinks();
  const now = Math.floor(Date.now() / 1000);
  const expired_at = now + (days * 24 * 60 * 60);

  links.push({
    id: Math.random().toString(36).substring(2, 11),
    type,
    link,
    created_at: now,
    expired_at,
    is_owner: isOwner,
    user_id: userId
  });
  saveAllLinks(links);
}

export function removeLinkById(id: string) {
  let links = getAllLinks();
  links = links.filter(l => l.id !== id);
  saveAllLinks(links);
}
