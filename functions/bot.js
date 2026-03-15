const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);
const API_URL = 'https://www.1secmail.com/api/v1/';

// --- BOT LOGIC ---

bot.start((ctx) => {
  ctx.reply("🚀 *Quick Gmail Bot Ready!* \n\nUse /generate to get a temp email address.", { parse_mode: 'Markdown' });
});

bot.command('generate', async (ctx) => {
  try {
    const domains = ["1secmail.com", "1secmail.net", "1secmail.org"];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const login = Math.random().toString(36).substring(2, 12);
    const email = `${login}@${domain}`;

    await ctx.reply(`📧 *Your Temp Mail:* \n\`${email}\` \n\n_Send a mail and click the button below to check._`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: "📥 Check Inbox", callback_data: `chk_${email}` }]]
      }
    });
  } catch (err) {
    console.error("Generate Error:", err);
    ctx.reply("⚠️ Error generating mail. Please try again.");
  }
});

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (!data.startsWith('chk_')) return;

  const email = data.replace('chk_', '');
  const [login, domain] = email.split('@');

  try {
    // Using fetch instead of axios for better compatibility in Nhost
    const response = await fetch(`${API_URL}?action=getMessages&login=${login}&domain=${domain}`);
    const messages = await response.json();

    if (!messages || messages.length === 0) {
      return ctx.answerCbQuery("❌ Inbox is empty! Wait 5-10 seconds.", { show_alert: true });
    }

    const msgId = messages[0].id;
    const msgResponse = await fetch(`${API_URL}?action=readMessage&login=${login}&domain=${domain}&id=${msgId}`);
    const m = await msgResponse.json();

    const text = `📬 *New Mail!* \n\n👤 *From:* ${m.from}\n📝 *Subject:* ${m.subject}\n\n💬 *Message:* \n${m.textBody || 'No text content.'}`;
    
    await ctx.reply(text.substring(0, 4000), { parse_mode: 'Markdown' });
    ctx.answerCbQuery();

  } catch (error) {
    console.error("Fetch Error:", error);
    ctx.answerCbQuery("⚠️ Server busy or Connection error.", { show_alert: true });
  }
});

// Nhost Function Export
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } catch (err) {
      console.error("Webhook Error:", err);
      res.status(200).send('OK'); // Always 200 to avoid Telegram retry loops
    }
  } else {
    res.status(200).send('Bot is Active!');
  }
};
