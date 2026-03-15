const { Telegraf } = require('telegraf');
const axios = require('axios');

// Nhost-ல் நீங்கள் செட் செய்த BOT_TOKEN-ஐ எடுத்துக்கொள்ளும்
const bot = new Telegraf(process.env.BOT_TOKEN);
const API_URL = 'https://www.1secmail.com/api/v1/';

// 1secmail 403 Forbidden எரர் வராமல் இருக்க இந்த Headers அவசியம்
const axiosConfig = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'application/json'
  }
};

// --- BOT LOGIC ---

// Start Command
bot.start((ctx) => {
  const message = `🚀 *Welcome to Quick Gmail Bot!*\n\nI can generate temporary email addresses for you.\n\nUse /generate command to get a new email.`;
  ctx.replyWithMarkdown(message);
});

// Generate Email Command
bot.command('generate', async (ctx) => {
  const domains = ["1secmail.com", "1secmail.net", "1secmail.org"];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const login = Math.random().toString(36).substring(2, 10);
  const email = `${login}@${domain}`;

  ctx.reply(`📧 *Your Temporary Email:* \n\`${email}\` \n\n_Send your email and then click the button below to check your inbox._`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: "📥 Refresh / Check Inbox", callback_data: `check_${email}` }]
      ]
    }
  });
});

// Check Inbox Logic (Callback Query)
bot.on('callback_query', async (ctx) => {
  const emailData = ctx.callbackQuery.data.split('_')[1];
  const [login, domain] = emailData.split('@');

  try {
    // 1. மெசேஜ் லிஸ்ட்டை எடுக்கிறோம்
    const res = await axios.get(`${API_URL}?action=getMessages&login=${login}&domain=${domain}`, axiosConfig);
    
    if (!res.data || res.data.length === 0) {
      return ctx.answerCbQuery("❌ Inbox is empty! Send a mail and wait 5 seconds.", { show_alert: true });
    }

    // 2. லேட்டஸ்ட் மெசேஜின் ID-ஐ எடுக்கிறோம்
    const latestMsg = res.data[0];
    const msgId = latestMsg.id;
    
    // 3. அந்த குறிப்பிட்ட மெசேஜை படிக்கிறோம்
    const contentRes = await axios.get(`${API_URL}?action=readMessage&login=${login}&domain=${domain}&id=${msgId}`, axiosConfig);
    const fullMsg = contentRes.data;

    const responseText = `📬 *New Message Found!* \n\n` +
                         `👤 *From:* ${fullMsg.from} \n` +
                         `📝 *Subject:* ${fullMsg.subject || '(No Subject)'} \n` +
                         `📅 *Date:* ${fullMsg.date} \n\n` +
                         `💬 *Message:* \n\n${fullMsg.textBody || 'No text content.'}`;

    // மெசேஜ் நீளமாக இருந்தால் டெலிகிராம் லிமிட்க்காக சுருக்குகிறோம்
    ctx.reply(responseText.substring(0, 4000), { parse_mode: 'Markdown' });
    ctx.answerCbQuery();

  } catch (error) {
    console.error("API Error:", error.message);
    ctx.answerCbQuery("⚠️ 1secmail server busy. Please try clicking again.", { show_alert: true });
  }
});

// Nhost Function Export (Webhook handler)
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } catch (err) {
      console.error("Webhook Update Error:", err);
      res.status(500).send('Error');
    }
  } else {
    res.status(200).send('Quick Gmail Bot is Active and Running! 🚀');
  }
};
