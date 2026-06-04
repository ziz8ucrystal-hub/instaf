const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const QRCode = require('qrcode');
const app = express();

app.use(express.json());

let botReady = false;
let qrImage = '';

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './session'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process',
            '--disable-accelerated-2d-canvas',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-site-isolation-trials'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    }
});

// ============ واتساب أحداث ============
client.on('qr', async (qr) => {
    qrImage = await QRCode.toDataURL(qr);
    console.log('📱 QR Code ready! Open /qr');
});

client.on('ready', () => {
    botReady = true;
    console.log('✅ MapleMail WhatsApp Bot Online!');
});

client.on('disconnected', (reason) => {
    botReady = false;
    console.log('❌ Disconnected:', reason);
    setTimeout(() => client.initialize(), 5000);
});

// ============ API ============
app.get('/', (req, res) => {
    res.json({
        name: 'MapleMail WhatsApp Bot',
        status: botReady ? 'online' : 'offline',
        endpoints: {
            qr: '/qr',
            send: 'POST /send',
            status: '/status'
        }
    });
});

app.get('/qr', (req, res) => {
    if (botReady) {
        return res.send('<h1 style="color:green">✅ Online</h1>');
    }
    if (!qrImage) {
        return res.send('<h1>⏳ Loading... <meta http-equiv="refresh" content="3"></h1>');
    }
    res.send(`
        <html><body style="background:#121214;color:white;text-align:center;padding:20px">
        <h1 style="color:#d4f93a">🍁 MapleMail</h1>
        <p>امسح QR Code من واتساب</p>
        <img src="${qrImage}" width="300" style="border:3px solid #d4f93a;border-radius:20px;padding:10px;background:white">
        <p style="color:#888">تحديث تلقائي كل 30 ثانية</p>
        <script>setTimeout(()=>location.reload(),30000)</script>
        </body></html>
    `);
});

app.get('/status', (req, res) => {
    res.json({ online: botReady });
});

app.post('/send', async (req, res) => {
    const { phone, code } = req.body;
    
    if (!botReady) {
        return res.json({ success: false, error: 'Bot offline' });
    }
    
    try {
        const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
        await client.sendMessage(
            `${cleaned}@c.us`,
            `🍁 *MapleMail*\n\n🔐 رمز التحقق: *${code}*\n⏰ صالح لمدة 10 دقائق`
        );
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Server on port ${PORT}`);
});

client.initialize();