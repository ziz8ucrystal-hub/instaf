const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const QRCode = require('qrcode');
const app = express();

app.use(express.json());

let botReady = false;
let qrImage = '';
let qrText = '';

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
            '--disable-web-security'
        ]
    }
});

// ============ واتساب أحداث ============
client.on('qr', async (qr) => {
    qrText = qr;
    qrImage = await QRCode.toDataURL(qr);
    console.log('📱 QR Code ready! Open /qr to scan');
    console.log('----------------------------------------');
    // طباعة في الكونسول
    require('qrcode-terminal').generate(qr, { small: true });
    console.log('----------------------------------------');
});

client.on('ready', () => {
    botReady = true;
    console.log('✅ MapleMail WhatsApp Bot Online! 🍁');
    console.log('🚀 Ready to send messages');
});

client.on('authenticated', () => {
    console.log('✅ Authenticated! Session saved');
});

client.on('auth_failure', () => {
    console.log('❌ Auth failed! Restarting...');
});

client.on('disconnected', (reason) => {
    botReady = false;
    console.log('❌ Disconnected:', reason);
    console.log('🔄 Restarting in 5 seconds...');
    setTimeout(() => client.initialize(), 5000);
});

// ============ API Routes ============

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>MapleMail WhatsApp Bot</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    background: #121214;
                    color: white;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    padding: 20px;
                    text-align: center;
                }
                .container {
                    background: #1c1c1e;
                    border-radius: 24px;
                    padding: 40px;
                    max-width: 500px;
                    width: 100%;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                }
                .logo {
                    font-size: 60px;
                    margin-bottom: 20px;
                }
                h1 {
                    color: #d4f93a;
                    font-size: 28px;
                    margin-bottom: 10px;
                }
                .status {
                    display: inline-block;
                    padding: 8px 20px;
                    border-radius: 20px;
                    font-weight: bold;
                    margin: 20px 0;
                }
                .online { background: #22c55e; color: white; }
                .offline { background: #ef4444; color: white; }
                .qr-link {
                    display: inline-block;
                    background: #d4f93a;
                    color: #121214;
                    padding: 12px 30px;
                    border-radius: 12px;
                    text-decoration: none;
                    font-weight: bold;
                    margin-top: 20px;
                    transition: transform 0.2s;
                }
                .qr-link:hover { transform: scale(1.05); }
                .info {
                    margin-top: 20px;
                    color: #888;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">🍁</div>
                <h1>MapleMail WhatsApp</h1>
                <div class="status ${botReady ? 'online' : 'offline'}">
                    ${botReady ? '✅ Online' : '❌ Offline'}
                </div>
                <p style="margin:20px 0;color:#aaa;">
                    ${botReady ? 'البوت جاهز لإرسال الرسائل!' : 'تحتاج لمسح QR Code للربط'}
                </p>
                ${!botReady ? `<a href="/qr" class="qr-link">📱 عرض QR Code</a>` : ''}
                <p class="info">
                    API: POST /send<br>
                    Body: { "phone": "9665xxxxxxx", "code": "123456" }
                </p>
            </div>
        </body>
        </html>
    `);
});

// صفحة QR Code
app.get('/qr', (req, res) => {
    if (botReady) {
        return res.send(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>MapleMail - Connected</title>
                <style>
                    body {
                        background: #121214;
                        color: white;
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        padding: 20px;
                        text-align: center;
                    }
                    h1 { color: #22c55e; }
                    a { color: #d4f93a; }
                </style>
            </head>
            <body>
                <h1>✅ MapleMail Connected!</h1>
                <p>البوت جاهز ويعمل</p>
                <a href="/">العودة للرئيسية</a>
            </body>
            </html>
        `);
    }
    
    if (!qrImage) {
        return res.send('<h1 style="color:white">⏳ جاري تحميل QR Code...</h1><meta http-equiv="refresh" content="3">');
    }
    
    res.send(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>MapleMail - Scan QR</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    background: #121214;
                    color: white;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    padding: 20px;
                    text-align: center;
                }
                .container {
                    background: #1c1c1e;
                    border-radius: 24px;
                    padding: 30px;
                    max-width: 450px;
                    width: 100%;
                }
                h1 { color: #d4f93a; margin-bottom: 10px; font-size: 24px; }
                .qr-box {
                    background: white;
                    padding: 20px;
                    border-radius: 20px;
                    margin: 20px 0;
                    display: inline-block;
                }
                .qr-box img {
                    width: 250px;
                    height: 250px;
                }
                .steps {
                    text-align: right;
                    margin: 20px 0;
                    color: #aaa;
                    font-size: 14px;
                }
                .steps p { margin: 8px 0; }
                .step-num {
                    display: inline-block;
                    width: 24px;
                    height: 24px;
                    background: #d4f93a;
                    color: #121214;
                    border-radius: 50%;
                    text-align: center;
                    line-height: 24px;
                    font-weight: bold;
                    font-size: 12px;
                    margin-left: 8px;
                }
                .refresh {
                    color: #d4f93a;
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🍁 امسح QR Code</h1>
                <div class="steps">
                    <p><span class="step-num">1</span> افتح واتساب على هاتفك</p>
                    <p><span class="step-num">2</span> الإعدادات > الأجهزة المرتبطة</p>
                    <p><span class="step-num">3</span> اضغط "ربط جهاز"</p>
                    <p><span class="step-num">4</span> امسح الكود أدناه</p>
                </div>
                <div class="qr-box">
                    <img src="${qrImage}" alt="QR Code">
                </div>
                <p class="refresh">⏳ الصفحة تتحد تلقائياً كل 30 ثانية</p>
            </div>
            <script>setTimeout(() => location.reload(), 30000);</script>
        </body>
        </html>
    `);
});

// حالة البوت
app.get('/status', (req, res) => {
    res.json({ 
        online: botReady,
        message: botReady ? 'MapleMail Bot Ready' : 'Bot Offline'
    });
});

// إرسال رسالة واتساب
app.post('/send', async (req, res) => {
    const { phone, code } = req.body;
    
    if (!phone || !code) {
        return res.status(400).json({ 
            success: false, 
            error: 'Phone and code required' 
        });
    }
    
    if (!botReady) {
        return res.status(503).json({ 
            success: false, 
            error: 'Bot not ready. Scan QR first.' 
        });
    }
    
    try {
        const cleanedPhone = phone.replace(/[\s\-\(\)\+]/g, '');
        const chatId = `${cleanedPhone}@c.us`;
        
        await client.sendMessage(chatId,
            `🍁 *MapleMail*\n\n` +
            `🔐 *رمز التحقق:* \`${code}\`\n\n` +
            `⏰ صالح لمدة *10 دقائق*\n` +
            `🔒 لا تشارك هذا الرمز مع أي شخص\n\n` +
            `_شكراً لاستخدامك MapleMail_`
        );
        
        console.log(`✅ WhatsApp sent to ${cleanedPhone}`);
        
        res.json({ 
            success: true, 
            message: 'Message sent to WhatsApp' 
        });
        
    } catch (error) {
        console.error(`❌ Failed to send to ${phone}:`, error.message);
        
        // إذا الرقم غير مسجل في واتساب
        if (error.message.includes('not registered')) {
            return res.json({ 
                success: false, 
                error: 'Phone number not registered on WhatsApp' 
            });
        }
        
        res.json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============ تشغيل ============
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('═══════════════════════════════════');
    console.log('🍁 MapleMail WhatsApp Bot');
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`📱 QR Code: http://localhost:${PORT}/qr`);
    console.log('═══════════════════════════════════');
});

// تشغيل واتساب
client.initialize();

// منع النوم - Keep alive
setInterval(() => {
    console.log('💚 Heartbeat - ' + new Date().toISOString());
}, 300000); // كل 5 دقائق