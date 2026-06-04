const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

// ============ MIDDLEWARE ============
app.use(cors());
app.use(express.json());

let botReady = false;
let qrImage = '';

// ============ CHROME ============
function findChrome() {
    const paths = ['/opt/render/project/.puppeteer-cache'];
    for (const base of paths) {
        const chromeDir = path.join(base, 'chrome');
        if (fs.existsSync(chromeDir)) {
            const versions = fs.readdirSync(chromeDir);
            for (const version of versions) {
                const chromeBin = path.join(chromeDir, version, 'chrome-linux64', 'chrome');
                if (fs.existsSync(chromeBin)) return chromeBin;
            }
        }
    }
    return undefined;
}

// ============ WHATSAPP CLIENT ============
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './session' }),
    puppeteer: {
        executablePath: findChrome(),
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process', '--no-zygote']
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

// ============ ROUTES ============
app.get('/', (req, res) => {
    res.json({ online: botReady, name: 'MapleMail Bot', time: new Date().toISOString() });
});

app.get('/status', (req, res) => {
    res.json({ online: botReady });
});

app.get('/qr', (req, res) => {
    if (botReady) return res.send('<h1 style="color:green;text-align:center;padding:50px">✅ MapleMail Online!</h1>');
    if (!qrImage) return res.send('<h1 style="color:white;text-align:center;padding:50px">⏳ Loading QR...</h1>');
    res.send(`<html><body style="background:#121214;text-align:center;padding:20px"><h1 style="color:#d4f93a">🍁 Scan QR</h1><img src="${qrImage}" width="300" style="background:white;padding:15px;border-radius:20px"></body></html>`);
});

app.post('/send', async (req, res) => {
    console.log('📨 Incoming request:', req.body);
    
    if (!botReady) {
        console.log('❌ Bot offline');
        return res.status(503).json({ success: false, error: 'Bot offline. Scan QR first.' });
    }
    
    const { phone, code } = req.body;
    
    if (!phone || !code) {
        console.log('❌ Missing fields');
        return res.status(400).json({ success: false, error: 'Phone and code required' });
    }
    
    try {
        const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
        const chatId = `${cleaned}@c.us`;
        
        console.log(`📱 Sending to: ${chatId}`);
        
        const result = await client.sendMessage(
            chatId,
            `🍁 *MapleMail*\n\n🔐 *رمز التحقق:* \`${code}\`\n\n⏰ صالح لمدة 10 دقائق\n🔒 لا تشارك هذا الرمز\n\n_شكراً لاستخدامك MapleMail_`
        );
        
        console.log('✅ Message sent! ID:', result.id?.id || 'ok');
        res.json({ success: true, message: 'Message sent to WhatsApp', id: result.id?.id });
        
    } catch (error) {
        console.error('❌ Send error:', error.message);
        
        let errorMsg = error.message;
        if (error.message.includes('not registered')) {
            errorMsg = 'Phone number not registered on WhatsApp';
        }
        
        res.status(500).json({ success: false, error: errorMsg });
    }
});

// ============ START ============
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Listening on 0.0.0.0:${PORT}`);
});

client.initialize();

// Keep alive
setInterval(() => {
    console.log('💚 Heartbeat -', new Date().toLocaleString());
}, 300000);