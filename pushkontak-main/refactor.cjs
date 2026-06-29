const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regexResellerInput = /\} else if \(session\.action === "bot_reseller_input_email"\) \{[\s\S]*?botSessions\.delete\(ctx\.from\.id\);\n    \} else if \(session\.action === "bot_dev_input_email_vip"/g;

const newResellerInput = `} else if (session.action === "bot_reseller_input_email") {
      const email = text.trim();
      const taxAmount = 1000;
      
      const placeholderEmail = \`tg_\${ctx.from.id}@telegram.bot\`;
      const res = await createPayment(placeholderEmail, taxAmount, "UPGRADE_TAX", \`up_vip_\${email}\`, undefined, 1, ctx.from.id, ctx.from.first_name);
      
      if (res.success) {
        const caption = \`⚠️ *Sistem Pajak Up Role (RESELLER)*\\n\\nUntuk melakukan Upgrade VIP ke \${email}, Anda dikenakan Pajak Rp \${taxAmount.toLocaleString('id-ID')}.\\n\\n📸 *Silakan Scan QR di atas untuk membayar.*\\n_Setelah bayar, aksi akan otomatis diproses._\`;
        const keyboard = Markup.inlineKeyboard([[Markup.button.callback("🔄 Cek Status", \`check_pay_\${res.id}\`)]]);
        
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
    } else if (session.action === "bot_dev_input_email_vip"`;

code = code.replace(regexResellerInput, newResellerInput);

const regexDevInput = /\} else if \(session\.action === "bot_dev_input_email_vip" \|\| session\.action === "bot_dev_input_email_reseller"\) \{[\s\S]*?botSessions\.delete\(ctx\.from\.id\);\n    \} else if \(session\.action === "owner_set_role_email"\) \{/g;

const newDevInput = `} else if (session.action === "bot_dev_input_email_vip" || session.action === "bot_dev_input_email_reseller") {
      const email = text.trim();
      const targetRole = session.action === "bot_dev_input_email_vip" ? "vip" : "reseller";
      const taxAmount = 2000;

      const placeholderEmail = \`tg_\${ctx.from.id}@telegram.bot\`;
      const res = await createPayment(placeholderEmail, taxAmount, "UPGRADE_TAX", \`up_\${targetRole}_\${email}\`, undefined, 1, ctx.from.id, ctx.from.first_name);
      if (res.success) {
        const caption = \`⚠️ *Sistem Pajak Up Role (DEV)*\\n\\nUntuk melakukan Upgrade \${targetRole.toUpperCase()} ke \${email}, Anda dikenakan Pajak Rp \${taxAmount.toLocaleString('id-ID')}.\\n\\n📸 *Silakan Scan QR di atas untuk membayar.*\\n_Setelah bayar, aksi akan otomatis diproses._\`;
        const keyboard = Markup.inlineKeyboard([[Markup.button.callback("🔄 Cek Status", \`check_pay_\${res.id}\`)]]);
        
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
    } else if (session.action === "owner_set_role_email") {`;

code = code.replace(regexDevInput, newDevInput);

fs.writeFileSync('server.ts', code);
console.log('Role input text handlers updated');
