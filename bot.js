const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const app = express();

app.use(express.json());

let botReady = false;
let qrImage = '';

// ============ البحث عن Chrome ============
function findChromePath() {
    const searchPaths = [
        '/opt/render/project/.puppeteer-cache',
        '/opt/render/.cache/puppeteer',
        process.env.HOME + '/.cache/puppeteer'
    ];
    
    for (const base of searchPaths) {
        const chromeDir = path.join(base, 'chrome');
        if (fs.existsSync(chromeDir)) {
            const versions = fs.readdirSync(chromeDir);
            for (const version of versions) {
                const chromeBin = path.join(chromeDir, version, 'chrome-linux64', 'chrome');
                if (fs.existsSync(chromeBin)) {
                    console.log('✅ Found:', chromeBin);
                    return chromeBin;
                }
            }
        }
    }
    
    // محاولة أخيرة: استخدام find
    try {
        const result = execSync('find /opt/render -name chrome -type f 2>/dev/null | head -1').toString().trim();
        if (result && fs.existsSync(result)) {
            console.log('✅ Found via find:', result);
            return result;
        }
    } catch (e) {}
    
    console.log('❌ Chrome not found');
    return undefined;
}

const CHROME_PATH = findChromePath();

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './session' }),
    puppeteer: {
        executablePath: CHROME_PATH,
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
    if (botReady) return res.send('<h1>✅ Online</h1>');
    if (!qrImage) return res.send('<h1>⏳<meta http-equiv="refresh" content="3"></h1>');
    res.send(`<img src="${qrImage}" width="300">`);
});

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