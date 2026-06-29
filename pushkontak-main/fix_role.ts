import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(/const role = userSnap\.exists\(\) \? userSnap\.data\(\)\.role \: \'free\';/g, "const role = userSnap.exists() ? (userSnap.data().role || 'free') : 'free';");
fs.writeFileSync('server.ts', content);
console.log("Replaced all instances of role logic");
