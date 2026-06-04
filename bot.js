const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());

let botReady = false;
let qrImage = '';

// ============ البحث عن Chrome الصحيح ============
function findChrome() {
    // المسار الدقيق من اللوق: chrome@127.0.6533.88
    const exactPath = '/opt/render/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome';
    if (fs.existsSync(exactPath)) {
        console.log('✅ Found:', exactPath);
        return exactPath;
    }
    
    // البحث في كل المجلدات
    const baseDir = '/opt/render/.cache/puppeteer/chrome';
    if (fs.existsSync(baseDir)) {
        const dirs = fs.readdirSync(baseDir);
        for (const dir of dirs) {
            const fullPath = path.join(baseDir, dir, 'chrome-linux64', 'chrome');
            if (fs.existsSync(fullPath)) {
                console.log('✅ Found:', fullPath);
                return fullPath;
            }
        }
    }
    
    console.log('❌ Chrome not found');
    return undefined;
}

const CHROME_PATH = findChrome();

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './session' }),
    puppeteer: {
        headless: true,
        executablePath: CHROME_PATH,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process'
        ]
    }
});

client.on('qr', async (qr) => {
    qrImage = await QRCode.toDataURL(qr);
    console.log('📱 /qr');
});

client.on('ready', () => {
    botReady = true;
    console.log('✅ Online!');
});

client.on('disconnected', () => {
    botReady = false;
    client.initialize();
});

app.get('/', (req, res) => res.json({ online: botReady }));
app.get('/qr', (req, res) => {
    if (botReady) return res.send('✅ Online');
    if (!qrImage) return res.send('⏳<meta http-equiv="refresh" content="3">');
    res.send(`<img src="${qrImage}" width="300">`);
});
app.get('/status', (req, res) => res.json({ online: botReady }));

app.post('/send', async (req, res) => {
    if (!botReady) return res.json({ error: 'Offline' });
    const { phone, code } = req.body;
    try {
        await client.sendMessage(`${phone.replace(/\D/g,'')}@c.us`, `🍁 *MapleMail*\n\n🔐 *${code}*`);
        res.json({ success: true });
    } catch(e) {
        res.json({ success: false, error: e.message });
    }
});

app.listen(process.env.PORT || 10000, () => console.log('🚀 Ready'));
client.initialize();
setInterval(() => console.log('💚'), 300000);