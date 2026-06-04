const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());

let botReady = false;
let qrImage = '';

// ============ البحث عن Chrome تلقائياً ============
function findChromePath() {
    const cacheDir = '/opt/render/.cache/puppeteer/chrome';
    
    // إذا فيه مسار محدد في البيئة
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        const customPath = process.env.PUPPETEER_EXECUTABLE_PATH;
        if (fs.existsSync(customPath)) return customPath;
    }
    
    // البحث في مجلد الكاش
    if (fs.existsSync(cacheDir)) {
        const dirs = fs.readdirSync(cacheDir);
        for (const dir of dirs) {
            const chromePath = path.join(cacheDir, dir, 'chrome-linux64', 'chrome');
            if (fs.existsSync(chromePath)) {
                console.log('✅ Found Chrome at:', chromePath);
                return chromePath;
            }
        }
    }
    
    // تجربة المسارات الشائعة
    const commonPaths = [
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable'
    ];
    
    for (const p of commonPaths) {
        if (fs.existsSync(p)) return p;
    }
    
    return undefined;
}

const chromePath = findChromePath();
console.log('🔍 Chrome path:', chromePath || 'Not found, using default');

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
    console.log('📱 QR Ready at /qr');
});

client.on('ready', () => {
    botReady = true;
    console.log('✅ MapleMail Online!');
});

client.on('disconnected', () => {
    botReady = false;
    setTimeout(() => client.initialize(), 5000);
});

app.get('/', (req, res) => {
    res.json({ status: botReady ? 'online' : 'offline', chrome: chromePath });
});

app.get('/qr', (req, res) => {
    if (botReady) return res.send('<h1>✅ Online</h1>');
    if (!qrImage) return res.send('<h1>⏳ Loading...</h1>');
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
            `🍁 *MapleMail*\n\n🔐 *رمز التحقق:* \`${code}\`\n⏰ صالح لمدة 10 دقائق`
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
setInterval(() => console.log('💚 Alive'), 300000);