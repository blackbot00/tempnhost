const { Telegraf } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN);
const API_URL = 'https://www.1secmail.com/api/v1/';

// --- BOT LOGIC ---
bot.start((ctx) => {
  ctx.reply("✨ *Welcome to Quick Gmail Bot!* \n\nI can provide high-speed disposable email addresses. \n\nUse /generate to get started.", { parse_mode: 'Markdown' });
});

bot.command('generate', async (ctx) => {
  const domains = ["1secmail.com", "1secmail.net", "1secmail.org"];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const login = Math.random().toString(36).substring(2, 10);
  const email = `${login}@${domain}`;

  ctx.reply(`📧 *Your Temporary Email:* \n\`${email}\` \n\n_Send a mail to this address and click the button below to see the content._`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: "📥 Refresh Inbox", callback_data: `check_${email}` }]]
    }
  });
});

bot.on('callback_query', async (ctx) => {
  const email = ctx.callbackQuery.data.split('_')[1];
  const [login, domain] = email.split('@');

  try {
    // 1. Get the list of messages
    const res = await axios.get(`${API_URL}?action=getMessages&login=${login}&domain=${domain}`);
    
    if (!res.data || res.data.length === 0) {
      return ctx.answerCbQuery("❌ Inbox is still empty. Please wait a few seconds and try again.", { show_alert: true });
    }

    // 2. Fetch the latest message content using its ID
    const latestMsg = res.data[0];
    const msgId = latestMsg.id;
    
    const contentRes = await axios.get(`${API_URL}?action=readMessage&login=${login}&domain=${domain}&id=${msgId}`);
    const fullMsg = contentRes.data;

    // 3. Format and send the message
    const responseText = `📬 *New Message Received!* \n\n` +
                         `👤 *From:* ${fullMsg.from} \n` +
                         `📝 *Subject:* ${fullMsg.subject || '(No Subject)'} \n` +
                         `📅 *Date:* ${fullMsg.date} \n\n` +
                         `💬 *Message:* \n\n${fullMsg.textBody.substring(0, 3500) || 'No text content found.'}`;

    ctx.reply(responseText, { parse_mode: 'Markdown' });
    ctx.answerCbQuery();

  } catch (error) {
    console.error("API Error:", error);
    ctx.answerCbQuery("⚠️ Error fetching the mail. Please try again later.", { show_alert: true });
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
      res.status(500).send('Error');
    }
  } else {
    res.status(200).send('Quick Gmail Bot is Active! 🚀');
  }
};
