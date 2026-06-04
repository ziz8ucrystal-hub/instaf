const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const app = express();

app.use(express.json());

let botReady = false;
let qrImage = '';

function findChrome() {
    const paths = [
        '/opt/render/project/src/node_modules/whatsapp-web.js/node_modules/puppeteer-core/.local-chromium/linux-146.0.7680.31/chrome-linux64/chrome',
        '/opt/render/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome',
        '/opt/render/.cache/puppeteer/chrome/linux-146.0.7680.31/chrome-linux64/chrome'
    ];
    
    for (const p of paths) {
        if (fs.existsSync(p)) {
            console.log('✅ Chrome:', p);
            return p;
        }
    }
    return undefined;
}

const CHROME_PATH = findChrome();

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './session' }),
    puppeteer: {
        headless: 'new',
        executablePath: CHROME_PATH,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process',
            '--disable-accelerated-2d-canvas',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-site-isolation-trials',
            '--disable-icu',
            '--no-icu',
            '--disable-breakpad',
            '--disable-crashpad',
            '--disable-crash-reporter'
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
    console.log('🔄 Restarting...');
    setTimeout(() => client.initialize(), 5000);
});

app.get('/', (req, res) => {
    res.json({ online: botReady, chrome: CHROME_PATH });
});

app.get('/qr', (req, res) => {
    if (botReady) return res.send('<h1 style="color:green;text-align:center;padding:50px">✅ MapleMail Online! 🍁</h1>');
    if (!qrImage) return res.send('<h1 style="color:white;text-align:center;padding:50px">⏳ Loading QR...<meta http-equiv="refresh" content="3"></h1>');
    res.send(`
        <html>
        <head>
            <style>
                body { background: #121214; text-align: center; padding: 20px; font-family: Arial; }
                h1 { color: #d4f93a; }
                img { background: white; padding: 15px; border-radius: 20px; border: 3px solid #d4f93a; margin: 20px; }
                p { color: #888; }
                .container { max-width: 400px; margin: 0 auto; background: #1c1c1e; padding: 30px; border-radius: 24px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🍁 MapleMail</h1>
                <p>افتح واتساب > الأجهزة المرتبطة > ربط جهاز</p>
                <img src="${qrImage}" width="250" alt="QR">
                <p style="color:#d4f93a">⏳ تحديث كل 30 ثانية</p>
            </div>
            <script>setTimeout(()=>location.reload(),30000)</script>
        </body>
        </html>
    `);
});

app.get('/status', (req, res) => res.json({ online: botReady }));

app.post('/send', async (req, res) => {
    if (!botReady) return res.json({ success: false, error: 'Bot offline' });
    
    const { phone, code } = req.body;
    if (!phone || !code) return res.json({ success: false, error: 'Phone and code required' });
    
    try {
        const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
        await client.sendMessage(
            `${cleaned}@c.us`,
            `🍁 *MapleMail*\n\n🔐 *رمز التحقق:* \`${code}\`\n\n⏰ صالح لمدة 10 دقائق\n🔒 لا تشارك هذا الرمز`
        );
        console.log(`✅ Sent to ${cleaned}`);
        res.json({ success: true, message: 'Message sent' });
    } catch (e) {
        console.error(`❌ Failed:`, e.message);
        res.json({ success: false, error: e.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Port: ${PORT}`));

client.initialize();

// Keep alive
setInterval(() => console.log('💚 ' + new Date().toISOString()), 300000);