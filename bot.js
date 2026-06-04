const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());

let botReady = false;
let qrImage = '';

// البحث عن Chrome مباشرة من المجلد
function findChromePath() {
    const cacheDir = '/opt/render/.cache/puppeteer/chrome';
    
    if (fs.existsSync(cacheDir)) {
        const versions = fs.readdirSync(cacheDir);
        for (const version of versions) {
            const chromeBin = path.join(cacheDir, version, 'chrome-linux64', 'chrome');
            if (fs.existsSync(chromeBin)) {
                console.log('✅ Found Chrome:', chromeBin);
                return chromeBin;
            }
        }
    }
    
    console.log('❌ Chrome not found in cache');
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

// ============ Events ============
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
    console.log('🔄 Restarting...');
    setTimeout(() => client.initialize(), 5000);
});

// ============ Routes ============
app.get('/', (req, res) => {
    res.json({ 
        online: botReady, 
        chrome: CHROME_PATH || 'Not found',
        time: new Date().toISOString()
    });
});

app.get('/qr', (req, res) => {
    if (botReady) {
        return res.send(`<html><body style="background:#121214;text-align:center;padding:50px"><h1 style="color:#22c55e">✅ Online</h1></body></html>`);
    }
    if (!qrImage) {
        return res.send(`<html><body style="background:#121214;text-align:center;padding:50px"><h1 style="color:white">⏳ Loading...</h1><meta http-equiv="refresh" content="3"></body></html>`);
    }
    res.send(`<html><body style="background:#121214;text-align:center;padding:20px"><img src="${qrImage}" width="300"></body></html>`);
});

app.get('/status', (req, res) => res.json({ online: botReady }));

app.post('/send', async (req, res) => {
    if (!botReady) return res.status(503).json({ success: false, error: 'Offline' });
    
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ success: false, error: 'Phone and code required' });
    
    try {
        const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
        await client.sendMessage(
            `${cleaned}@c.us`,
            `🍁 *MapleMail*\n\n🔐 *رمز التحقق:* \`${code}\`\n\n⏰ صالح لمدة 10 دقائق`
        );
        console.log(`✅ Sent to ${cleaned}`);
        res.json({ success: true });
    } catch (error) {
        console.error('❌', error.message);
        res.json({ success: false, error: error.message });
    }
});

// ============ Start ============
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Port: ${PORT}`));

client.initialize();

// Keep alive
setInterval(() => console.log('💚 ' + new Date().toLocaleString()), 300000);