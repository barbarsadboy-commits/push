import fs from "fs";
import path from "path";

const PUSH_STATUS_FILE = path.join(process.cwd(), "pushStatus.json");

let isPushActive = true;

export function initPushControl() {
  if (fs.existsSync(PUSH_STATUS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(PUSH_STATUS_FILE, "utf-8"));
      if (typeof data.isPushActive === "boolean") {
        isPushActive = data.isPushActive;
      }
    } catch (e) {
      console.error("Failed to load pushStatus.json", e);
    }
  } else {
    savePushStatus();
  }
}

export function getPushStatus() {
  return isPushActive;
}

export function setPushStatus(status: boolean) {
  isPushActive = status;
  savePushStatus();
}

function savePushStatus() {
  try {
    fs.writeFileSync(PUSH_STATUS_FILE, JSON.stringify({ isPushActive }));
  } catch (e) {
    console.error("Failed to save pushStatus.json", e);
  }
}
