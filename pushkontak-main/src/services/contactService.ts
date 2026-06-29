import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function getUserDir(userId: string) {
  const userDir = path.join(DATA_DIR, userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}

export function getConfig(userId: string) {
  const userDir = getUserDir(userId);
  const configPath = path.join(userDir, "config.json");
  if (!fs.existsSync(configPath)) {
    const defaultConfig = { contact_name: "Buyer", last_index: 0 };
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

export function getContacts(userId: string) {
  const userDir = getUserDir(userId);
  const contactsPath = path.join(userDir, "contacts.json");
  if (!fs.existsSync(contactsPath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(contactsPath, "utf-8"));
}

export function saveContact(userId: string, jidOrNumber: string) {
  const userDir = getUserDir(userId);
  const config = getConfig(userId);
  const contacts = getContacts(userId);

  let number = jidOrNumber.includes('@') ? jidOrNumber.split('@')[0] : jidOrNumber;
  if (number.includes(':')) {
    number = number.split(':')[0];
  }

  // Anti-duplicate
  if (contacts.some((c: any) => c.number === number)) return;

  const newIndex = config.last_index + 1;
  const newContact = {
    number,
    name: `${config.contact_name} ${newIndex}`,
    index: newIndex,
    timestamp: Date.now(),
  };

  contacts.push(newContact);
  config.last_index = newIndex;

  fs.writeFileSync(path.join(userDir, "contacts.json"), JSON.stringify(contacts, null, 2));
  saveConfig(userId, config);
}

export function resetIndex(userId: string) {
  const userDir = getUserDir(userId);
  const contactsPath = path.join(userDir, "contacts.json");
  const configPath = path.join(userDir, "config.json");
  
  if (fs.existsSync(contactsPath)) fs.unlinkSync(contactsPath);
  
  const config = getConfig(userId);
  config.last_index = 0;
  saveConfig(userId, config);
}
