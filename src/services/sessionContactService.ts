import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "users");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Memory storage for session contacts per user
const sessionContacts = new Map<string, string[]>();

export function getUserDir(userId: string) {
  const userDir = path.join(DATA_DIR, userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}

export function getCounter(userId: string) {
  const userDir = getUserDir(userId);
  const counterPath = path.join(userDir, "counter.json");
  if (!fs.existsSync(counterPath)) {
    const defaultCounter = { last_index: 0 };
    fs.writeFileSync(counterPath, JSON.stringify(defaultCounter, null, 2));
    return defaultCounter;
  }
  return JSON.parse(fs.readFileSync(counterPath, "utf-8"));
}

export function saveCounter(userId: string, counter: any) {
  const userDir = getUserDir(userId);
  const counterPath = path.join(userDir, "counter.json");
  fs.writeFileSync(counterPath, JSON.stringify(counter, null, 2));
}

export function getConfig(userId: string) {
  const userDir = getUserDir(userId);
  const configPath = path.join(userDir, "config.json");
  if (!fs.existsSync(configPath)) {
    const defaultConfig = { contact_name: "Buyer" };
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

export function saveConfig(userId: string, config: any) {
  const userDir = getUserDir(userId);
  const configPath = path.join(userDir, "config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function addSessionContact(userId: string, number: string) {
  if (!sessionContacts.has(userId)) {
    sessionContacts.set(userId, []);
  }
  const contacts = sessionContacts.get(userId)!;
  contacts.push(number);

  // Increment counter
  const counter = getCounter(userId);
  counter.last_index += 1;
  saveCounter(userId, counter);
  
  return counter.last_index;
}

export function getSessionContacts(userId: string) {
  return sessionContacts.get(userId) || [];
}

export function resetSession(userId: string) {
  sessionContacts.set(userId, []);
}

export function resetCounter(userId: string) {
  const counter = { last_index: 0 };
  saveCounter(userId, counter);
}
