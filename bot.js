const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const QRCode = require('qrcode');
const app = express();

app.use(express.json());

let botReady = false;
let qrImage = '';

// ============ Chrome Path لـ Render ============
const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH || 
                   '/opt/render/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome';

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './session' }),
    puppeteer: {
        headless: true,
        executablePath: chromePath,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process',
            '--disable-accelerated-2d-canvas',
            '--disable-web-security'
        ]
    }
});

client.on('qr', async (qr) => {
    qrImage = await QRCode.toDataURL(qr);
    console.log('📱 Scan QR at /qr');
});

client.on('ready', () => {
    botReady = true;
    console.log('✅ MapleMail Online!');
});

client.on('disconnected', () => {
    botReady = false;
    client.initialize();
});

// ============ Routes ============
app.get('/', (req, res) => {
    res.json({ status: botReady ? 'online' : 'offline' });
});

app.get('/qr', (req, res) => {
    if (botReady) return res.send('✅ Online');
    if (!qrImage) return res.send('⏳ Loading...<meta http-equiv="refresh" content="3">');
    res.send(`<html><body style="background:#121214;text-align:center;padding:20px"><h1 style="color:#d4f93a">🍁 MapleMail</h1><p style="color:white">امسح QR من واتساب</p><img src="${qrImage}" width="300" style="background:white;padding:15px;border-radius:20px;border:3px solid #d4f93a"><script>setTimeout(()=>location.reload(),30000)</script></body></html>`);
});

app.get('/status', (req, res) => res.json({ online: botReady }));

app.post('/send', async (req, res) => {
    const { phone, code } = req.body;
    if (!botReady) return res.json({ success: false, error: 'Bot offline' });
    
    try {
        const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
        await client.sendMessage(
            `${cleaned}@c.us`,
            `🍁 *MapleMail*\n\n🔐 *رمز التحقق:* \`${code}\`\n⏰ صالح لمدة 10 دقائق\n🔒 لا تشارك هذا الرمز`
        );
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Port: ${PORT}`));
client.initialize();

// Keep alive
setInterval(() => {
    console.log('💚 Alive:', new Date().toISOString());
}, 300000);