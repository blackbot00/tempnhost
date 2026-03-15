const { Telegraf } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN);

// 1secmail direct API endpoints
const API_URL = 'https://www.1secmail.com/api/v1/';

const botConfig = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  },
  timeout: 10000 // 10 seconds timeout
};

bot.start((ctx) => {
  ctx.reply("🔥 *Quick Gmail Bot is Ready!* \n\nGet unlimited temp mails instantly.", { parse_mode: 'Markdown' });
});

bot.command('generate', async (ctx) => {
  try {
    // Domain list
    const domains = ["1secmail.com", "1secmail.net", "1secmail.org"];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const login = Math.random().toString(36).substring(2, 12); // longer login
    const email = `${login}@${domain}`;

    await ctx.reply(`📧 *Your Temp Mail:* \n\`${email}\` \n\n_Send your mail and click the button below._`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: "📥 Check Inbox", callback_data: `chk_${email}` }]]
      }
    });
  } catch (err) {
    ctx.reply("❌ Error generating email. Try again.");
  }
});

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (!data.startsWith('chk_')) return;

  const email = data.replace('chk_', '');
  const [login, domain] = email.split('@');

  try {
    // 1. Get Messages
    const res = await axios.get(`${API_URL}?action=getMessages&login=${login}&domain=${domain}`, botConfig);
    
    if (!res.data || res.data.length === 0) {
      return ctx.answerCbQuery("📭 Inbox is empty! Wait a bit.", { show_alert: true });
    }

    const msgId = res.data[0].id;
    
    // 2. Read Message
    const msgRes = await axios.get(`${API_URL}?action=readMessage&login=${login}&domain=${domain}&id=${msgId}`, botConfig);
    const m = msgRes.data;

    const text = `📬 *New Message!* \n\n👤 *From:* ${m.from}\n📝 *Subject:* ${m.subject}\n\n💬 *Message:* \n${m.textBody || 'No text content'}`;
    
    await ctx.reply(text.substring(0, 4000), { parse_mode: 'Markdown' });
    ctx.answerCbQuery("Success!");

  } catch (error) {
    ctx.answerCbQuery("⚠️ Server busy. Tap again.", { show_alert: false });
  }
});

// Nhost Function Export
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } catch (err) {
      res.status(200).send('Handled'); // Always send 200 to Telegram
    }
  } else {
    res.status(200).send('Bot Active!');
  }
};
