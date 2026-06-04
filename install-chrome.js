const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📦 Installing Chrome...');

// تنزيل Chrome عبر puppeteer
execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });

// البحث عن Chrome المنزل
const baseDir = '/opt/render/.cache/puppeteer/chrome';
if (fs.existsSync(baseDir)) {
    const dirs = fs.readdirSync(baseDir);
    for (const dir of dirs) {
        const chromePath = path.join(baseDir, dir, 'chrome-linux64', 'chrome');
        if (fs.existsSync(chromePath)) {
            console.log('✅ Chrome installed at:', chromePath);
            
            // نسخ إلى مكان puppeteer-core
            const targetDir = '/opt/render/project/src/node_modules/whatsapp-web.js/node_modules/puppeteer-core/.local-chromium';
            const targetPath = path.join(targetDir, 'linux-146.0.7680.31', 'chrome-linux64');
            
            if (!fs.existsSync(targetPath)) {
                fs.mkdirSync(targetPath, { recursive: true });
            }
            
            fs.copyFileSync(chromePath, path.join(targetPath, 'chrome'));
            console.log('✅ Chrome copied to puppeteer-core');
        }
    }
}