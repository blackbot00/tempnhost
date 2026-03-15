const { Telegraf } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN);
const API_URL = 'https://api.mail.tm';

// --- BOT LOGIC ---

bot.start((ctx) => {
  ctx.reply("✨ *Quick Gmail Bot (Mail.tm Edition)* \n\nUse /generate to get a high-speed temp mail.", { parse_mode: 'Markdown' });
});

bot.command('generate', async (ctx) => {
  try {
    // 1. Get Domain
    const domainRes = await axios.get(`${API_URL}/domains`);
    const domain = domainRes.data['hydra:member'][0].domain;

    // 2. Create Random Email and Password
    const login = Math.random().toString(36).substring(2, 10);
    const password = Math.random().toString(36).substring(2, 12);
    const email = `${login}@${domain}`;

    // 3. Register the Account on Mail.tm
    await axios.post(`${API_URL}/accounts`, { address: email, password: password });

    // 4. Get Token (Login)
    const tokenRes = await axios.post(`${API_URL}/token`, { address: email, password: password });
    const token = tokenRes.data.token;

    ctx.reply(`📧 *Your Temp Mail:* \n\`${email}\` \n\n_Click the button below to check your inbox._`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: "📥 Check Inbox", callback_data: `check_${token}` }]]
      }
    });
  } catch (error) {
    console.error(error);
    ctx.reply("⚠️ Error generating mail. Please try again.");
  }
});

bot.on('callback_query', async (ctx) => {
  const token = ctx.callbackQuery.data.split('_')[1];

  try {
    // 1. Fetch Messages using the Token
    const res = await axios.get(`${API_URL}/messages`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const messages = res.data['hydra:member'];

    if (messages.length === 0) {
      return ctx.answerCbQuery("❌ Inbox is empty!", { show_alert: true });
    }

    // 2. Get the latest message content
    const msgId = messages[0].id;
    const msgRes = await axios.get(`${API_URL}/messages/${msgId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const fullMsg = msgRes.data;
    const responseText = `📬 *New Mail!* \n\n👤 *From:* ${fullMsg.from.address}\n📝 *Subject:* ${fullMsg.subject}\n\n💬 *Message:* \n${fullMsg.intro || fullMsg.text}`;

    ctx.reply(responseText.substring(0, 4000), { parse_mode: 'Markdown' });
    ctx.answerCbQuery();

  } catch (error) {
    console.error(error);
    ctx.answerCbQuery("⚠️ Error fetching mail.", { show_alert: true });
  }
});

// Nhost Export
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } catch (err) {
      res.status(500).send('Error');
    }
  } else {
    res.status(200).send('Mail.tm Bot is Active! 🚀');
  }
};
