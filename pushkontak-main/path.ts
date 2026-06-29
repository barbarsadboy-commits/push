import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

const regex = /\/\/ Menu Saldo Blast Action[\s\S]*?(?=sendEnhancedResponse\(ctx,)/;
const match = code.match(regex);

if (match) {
  let actionsCode = match[0];
  code = code.replace(regex, ""); // remove from inside showMainMenu
  // Now add it right after showMainMenu
  code = code.replace(/};\n\n  bot\.catch/, "};\n\n" + actionsCode + "\n  bot.catch");
  fs.writeFileSync('server.ts', code);
  console.log("Patch applied successfully");
} else {
  console.log("Match not found");
}
