const { Telegraf } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN);

// --- DROPMAIL API LOGIC ---
// இது பிளாக் ஆகாது மற்றும் மிக வேகமாக வேலை செய்யும்

bot.start((ctx) => {
  ctx.reply("🚀 *High-Speed Temp Mail Bot Ready!* \n\nUse /generate to get your private email address.", { parse_mode: 'Markdown' });
});

bot.command('generate', async (ctx) => {
  try {
    // Dropmail API-ல் ஒரு புது ஈமெயில் செஷனை உருவாக்குகிறது
    const res = await axios.get('https://dropmail.me/api/graphql/8379543830?query=mutation{introduceSession{id,address,expiresAt}}');
    const data = res.data.data.introduceSession;

    const email = data.address;
    const sessionId = data.id;

    ctx.reply(`📧 *Your Temp Mail:* \n\`${email}\` \n\n_Click the button below to check your inbox._`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: "📥 Check Inbox", callback_data: `check_${sessionId}` }]]
      }
    });
  } catch (err) {
    console.error(err);
    ctx.reply("⚠️ Error generating email. Please try again.");
  }
});

bot.on('callback_query', async (ctx) => {
  const sessionId = ctx.callbackQuery.data.split('_')[1];

  try {
    // மெசேஜ்களை செக் செய்கிறது
    const res = await axios.get(`https://dropmail.me/api/graphql/8379543830?query=query{session(id:"${sessionId}"){mails{rawSize,fromAddr,toAddr,downloadUrl,text,headerSubject}}}`);
    const mails = res.data.data.session.mails;

    if (mails.length === 0) {
      return ctx.answerCbQuery("❌ Inbox is empty! Wait a few seconds.", { show_alert: true });
    }

    const latestMail = mails[0];
    const subject = latestMail.headerSubject || "No Subject";
    const from = latestMail.fromAddr;
    const body = latestMail.text || "No text content.";

    const text = `📬 *New Mail Received!* \n\n👤 *From:* ${from}\n📝 *Subject:* ${subject}\n\n💬 *Message:* \n${body}`;

    ctx.reply(text.substring(0, 4000), { parse_mode: 'Markdown' });
    ctx.answerCbQuery();

  } catch (error) {
    console.error(error);
    ctx.answerCbQuery("⚠️ Connection error. Try again.", { show_alert: true });
  }
});

// Nhost Export
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } catch (err) {
      res.status(200).send('OK');
    }
  } else {
    res.status(200).send('Bot is Active! 🚀');
  }
};
