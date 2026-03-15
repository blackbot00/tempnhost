const { Telegraf } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN);
const API_URL = 'https://www.1secmail.com/api/v1/';

// --- BOT LOGIC ---
bot.start((ctx) => ctx.reply("Welcome! Use /generate to get a Temp Mail."));

bot.command('generate', async (ctx) => {
  const domains = ["1secmail.com", "1secmail.net", "1secmail.org"];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const login = Math.random().toString(36).substring(2, 10);
  const email = `${login}@${domain}`;

  ctx.reply(`Your Temp Mail: \`${email}\`\n\nClick below to check inbox.`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: "📥 Check Inbox", callback_data: `check_${email}` }]]
    }
  });
});

bot.on('callback_query', async (ctx) => {
  const email = ctx.callbackQuery.data.split('_')[1];
  const [login, domain] = email.split('@');
  try {
    const res = await axios.get(`${API_URL}?action=getMessages&login=${login}&domain=${domain}`);
    if (res.data.length === 0) return ctx.answerCbQuery("Inbox is empty!", { show_alert: true });
    
    const msg = res.data[0];
    ctx.reply(`📩 From: ${msg.from}\nSubject: ${msg.subject}`);
    ctx.answerCbQuery();
  } catch (e) {
    ctx.answerCbQuery("Error fetching mail.");
  }
});

// Nhost Function Export
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error');
    }
  } else {
    res.status(200).send('Bot is running on Nhost!');
  }
};
