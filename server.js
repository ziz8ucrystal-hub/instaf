const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ==================== ملف البيانات ====================
const DATA_FILE = 'store-data.json';

// تهيئة البيانات فارغة تماماً
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
        products: [],           // فارغة
        orders: [],            // فارغة
        adminCode: "AMINE2026" // كود الأدمن
    }, null, 2));
}

function getData() { return JSON.parse(fs.readFileSync(DATA_FILE)); }
function saveData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
function verifyAdmin(code) { return code === getData().adminCode; }

// ==================== APIs للجميع ====================
app.get('/api/products', (req, res) => {
    const data = getData();
    res.json({ success: true, products: data.products });
});

app.get('/api/filters', (req, res) => {
    const data = getData();
    const products = data.products;
    const brands = [...new Set(products.map(p => p.brand).filter(b => b))];
    const types = [...new Set(products.map(p => p.type).filter(t => t))];
    const styles = [...new Set(products.map(p => p.style).filter(s => s))];
    res.json({ success: true, brands, types, styles, hasProducts: products.length > 0 });
});

// إضافة طلب جديد (من الزبون)
app.post('/api/orders', (req, res) => {
    const { customerName, customerAddress, customerPhone, items, total } = req.body;
    if (!customerName || !customerAddress || !customerPhone || !items || items.length === 0) {
        return res.status(400).json({ success: false, message: "جميع الحقول مطلوبة" });
    }
    const data = getData();
    const newOrder = {
        id: Date.now(),
        customerName, customerAddress, customerPhone, items, total,
        status: "🟡 قيد المعالجة",
        date: new Date().toLocaleString('ar-EG')
    };
    data.orders.push(newOrder);
    saveData(data);
    res.json({ success: true, order: newOrder });
});

// ==================== APIs للأدمن فقط ====================
app.post('/api/admin/verify', (req, res) => {
    const { adminCode } = req.body;
    res.json({ success: verifyAdmin(adminCode) });
});

app.post('/api/admin/products', (req, res) => {
    const { adminCode, name, price, type, style, brand, imageUrl } = req.body;
    if (!verifyAdmin(adminCode)) {
        return res.status(401).json({ success: false, message: "كود الأدمن غير صحيح!" });
    }
    if (!name || !price || !type || !style || !brand) {
        return res.status(400).json({ success: false, message: "جميع الحقول مطلوبة" });
    }
    const data = getData();
    const newProduct = {
        id: Date.now(), name, price: parseFloat(price), type, style, brand,
        imageUrl: imageUrl || "https://placehold.co/400x400/f3f4f6/9ca3af?text=📸",
        createdAt: new Date().toISOString()
    };
    data.products.push(newProduct);
    saveData(data);
    res.json({ success: true, product: newProduct });
});

app.delete('/api/admin/products/:id', (req, res) => {
    const { adminCode } = req.body;
    if (!verifyAdmin(adminCode)) {
        return res.status(401).json({ success: false, message: "كود الأدمن غير صحيح!" });
    }
    const data = getData();
    data.products = data.products.filter(p => p.id !== parseInt(req.params.id));
    saveData(data);
    res.json({ success: true });
});

app.get('/api/admin/orders', (req, res) => {
    const adminCode = req.headers['admin-code'];
    if (!verifyAdmin(adminCode)) {
        return res.status(401).json({ success: false, message: "كود الأدمن غير صحيح!" });
    }
    const data = getData();
    res.json({ success: true, orders: data.orders });
});

app.put('/api/admin/orders/:id', (req, res) => {
    const { adminCode, status } = req.body;
    if (!verifyAdmin(adminCode)) {
        return res.status(401).json({ success: false, message: "كود الأدمن غير صحيح!" });
    }
    const data = getData();
    const order = data.orders.find(o => o.id === parseInt(req.params.id));
    if (order) { order.status = status; saveData(data); res.json({ success: true }); }
    else res.status(404).json({ success: false });
});

app.post('/api/admin/change-code', (req, res) => {
    const { oldCode, newCode } = req.body;
    const data = getData();
    if (oldCode !== data.adminCode) return res.status(401).json({ success: false });
    data.adminCode = newCode;
    saveData(data);
    res.json({ success: true });
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ السيرفر يعمل على المنفذ ${PORT}`);
});