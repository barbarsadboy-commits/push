import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

const regex = /\/\/ Menu Saldo Blast Action[\s\S]*?(?=      sendEnhancedResponse\(ctx, \n        "Selamat datang di)/;
const match = code.match(regex);
if (match) {
  let actionsCode = match[0];
  code = code.replace(regex, ""); // Remove the block!
  code = code.replace("};\n\n  bot.catch", "};\n\n" + actionsCode + "\n  bot.catch");
  fs.writeFileSync('server.ts', code);
  console.log("Moved successfully.");
} else {
    // try slightly different
    const fallbackRegex = /\/\/ Menu Saldo Blast Action[\s\S]*?(?=sendEnhancedResponse\(ctx,\s*"Selamat datang di)/;
    const match2 = code.match(fallbackRegex);
    if(match2) {
        let actionsCode = match2[0];
        code = code.replace(fallbackRegex, ""); // Remove the block!
        code = code.replace("};\n\n  bot.catch", "};\n\n" + actionsCode + "\n  bot.catch");
        fs.writeFileSync('server.ts', code);
        console.log("Moved successfully with fallback.");
    } else {
        console.log("Not found at all.");
    }
}
