const { Client, LocalAuth } = require('whatsapp-web.js');
const puppeteer = require('puppeteer');
const express = require('express');
const QRCode = require('qrcode');
const app = express();

app.use(express.json());

let botReady = false;
let qrImage = '';

// استخدام puppeteer.executablePath() مباشرة
const chromePath = puppeteer.executablePath();
console.log('✅ Chrome Path:', chromePath);

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './session' }),
    puppeteer: {
        executablePath: chromePath,
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process',
            '--no-zygote'
        ]
    }
});

client.on('qr', async (qr) => {
    qrImage = await QRCode.toDataURL(qr);
    console.log('📱 QR Ready at /qr');
});

client.on('ready', () => {
    botReady = true;
    console.log('✅ MapleMail Online! 🍁');
});

client.on('disconnected', () => {
    botReady = false;
    setTimeout(() => client.initialize(), 5000);
});

app.get('/', (req, res) => {
    res.json({ online: botReady, chrome: chromePath });
});

app.get('/qr', (req, res) => {
    if (botReady) return res.send('<h1>✅ Online</h1>');
    if (!qrImage) return res.send('<h1>⏳ Loading...</h1>');
    res.send(`<img src="${qrImage}" width="300">`);
});

app.post('/send', async (req, res) => {
    if (!botReady) return res.json({ success: false, error: 'Offline' });
    const { phone, code } = req.body;
    try {
        await client.sendMessage(
            `${phone.replace(/\D/g,'')}@c.us`,
            `🍁 *MapleMail*\n\n🔐 *${code}*`
        );
        res.json({ success: true });
    } catch(e) {
        res.json({ success: false, error: e.message });
    }
});

app.listen(process.env.PORT || 10000, () => console.log('🚀 Ready'));
client.initialize();