const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());

let botReady = false;
let qrImage = '';

// البحث عن مجلد Chrome الكامل
function findChromeDir() {
    const base = '/opt/render/.cache/puppeteer/chrome';
    
    if (fs.existsSync(base)) {
        const dirs = fs.readdirSync(base);
        // استخدام أحدث إصدار
        for (const dir of dirs.reverse()) {
            const chromeBin = path.join(base, dir, 'chrome-linux64', 'chrome');
            if (fs.existsSync(chromeBin)) {
                console.log('✅ Chrome found:', chromeBin);
                return chromeBin;
            }
        }
    }
    
    // تجربة chromium
    const chromiumPaths = [
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome'
    ];
    
    for (const p of chromiumPaths) {
        if (fs.existsSync(p)) {
            console.log('✅ Found:', p);
            return p;
        }
    }
    
    return undefined;
}

const chromePath = findChromeDir();
console.log('🔍 Chrome path:', chromePath || 'NOT FOUND');

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
            '--no-zygote',
            '--disable-accelerated-2d-canvas',
            '--disable-web-security',
            '--disable-features=IsolateOrigins',
            '--disable-site-isolation-trials'
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

client.on('disconnected', (reason) => {
    botReady = false;
    console.log('❌ Disconnected:', reason);
    setTimeout(() => client.initialize(), 5000);
});

// ============ Routes ============
app.get('/', (req, res) => {
    res.json({ 
        online: botReady, 
        chrome: chromePath,
        version: '1.0.0'
    });
});

app.get('/qr', (req, res) => {
    if (botReady) {
        return res.send(`<html><body style="background:#121214;text-align:center;padding:50px;color:white;font-family:Arial"><h1 style="color:#22c55e">✅ MapleMail Online!</h1><h2 style="font-size:60px">🍁</h2><p>البوت جاهز للإرسال</p></body></html>`);
    }
    if (!qrImage) {
        return res.send(`<html><body style="background:#121214;text-align:center;padding:50px;color:white;font-family:Arial"><h1>⏳ جاري تحميل QR Code...</h1><meta http-equiv="refresh" content="3"></body></html>`);
    }
    res.send(`<html><body style="background:#121214;text-align:center;padding:20px;color:white;font-family:Arial"><div style="max-width:400px;margin:0 auto;background:#1c1c1e;padding:30px;border-radius:24px"><h1 style="color:#d4f93a">🍁 MapleMail</h1><p style="color:#aaa">افتح واتساب > الأجهزة المرتبطة > ربط جهاز</p><img src="${qrImage}" width="280" style="background:white;padding:15px;border-radius:16px"><p style="color:#888;margin-top:15px">⏳ تحديث تلقائي...</p></div><script>setTimeout(()=>location.reload(),30000)</script></body></html>`);
});

app.get('/status', (req, res) => {
    res.json({ online: botReady });
});

app.post('/send', async (req, res) => {
    if (!botReady) {
        return res.status(503).json({ success: false, error: 'Bot is offline' });
    }
    
    const { phone, code } = req.body;
    
    if (!phone || !code) {
        return res.status(400).json({ success: false, error: 'Phone and code required' });
    }
    
    try {
        const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
        await client.sendMessage(
            `${cleaned}@c.us`,
            `🍁 *MapleMail*\n\n` +
            `🔐 *رمز التحقق:* \`${code}\`\n\n` +
            `⏰ صالح لمدة 10 دقائق\n` +
            `🔒 لا تشارك هذا الرمز\n\n` +
            `_شكراً لاستخدامك MapleMail_`
        );
        console.log(`✅ WhatsApp sent to ${cleaned}`);
        res.json({ success: true, message: 'Message sent to WhatsApp' });
    } catch (error) {
        console.error(`❌ Failed: ${error.message}`);
        res.json({ success: false, error: error.message });
    }
});

// ============ Start ============
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

client.initialize();

// Keep alive
setInterval(() => {
    console.log('💚 Heartbeat - ' + new Date().toLocaleString());
}, 300000);