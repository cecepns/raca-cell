require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'raca_cell_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
// Margin default hanya dipakai saat pertama kali seed database.
// Nilai aktif selalu diambil dari tabel settings (diatur via Admin > Pengaturan Margin).
const DEFAULT_MARGIN_PERCENT = parseFloat(process.env.MARKUP_PERCENT || '5');
let marginPercent = DEFAULT_MARGIN_PERCENT;
const DIGIFLAZZ_USERNAME = process.env.DIGIFLAZZ_USERNAME || 'pahuyog19VNg';
const DIGIFLAZZ_API_KEY = process.env.DIGIFLAZZ_API_KEY || 'aa2808be-9fab-5583-83f7-854422993780';
const DIGIFLAZZ_TESTING = process.env.DIGIFLAZZ_TESTING === 'true';
const DIGIFLAZZ_BASE_URL = 'https://api.digiflazz.com/v1';
const PRICE_LIST_CACHE_TTL = (parseInt(process.env.PRICE_LIST_CACHE_TTL, 10) || 600) * 1000;

let pool;
let priceListCache = { data: null, fetchedAt: 0 };

app.use(cors());
app.use(express.json());

// ─── Helpers ───────────────────────────────────────────────────────────────

const digiflazzSign = (ref) =>
  crypto.createHash('md5').update(DIGIFLAZZ_USERNAME + DIGIFLAZZ_API_KEY + ref).digest('hex');

const calcSellingPrice = (price) => {
  const base = parseFloat(price) || 0;
  return Math.ceil(base + (base * marginPercent) / 100);
};

const getSetting = async (key, defaultValue = '') => {
  const [rows] = await pool.execute('SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1', [key]);
  return rows.length ? rows[0].setting_value : defaultValue;
};

const setSetting = async (key, value, updatedBy = null) => {
  await pool.execute(
    `INSERT INTO settings (setting_key, setting_value, updated_by)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
    [key, String(value), updatedBy]
  );
};

const normalizeWhatsApp = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('62')) return digits;
  return digits;
};

const loadMarginPercent = async () => {
  try {
    const [rows] = await pool.execute(
      "SELECT setting_value FROM settings WHERE setting_key = 'margin_percent' LIMIT 1"
    );
    if (rows.length) {
      marginPercent = parseFloat(rows[0].setting_value) || DEFAULT_MARGIN_PERCENT;
    }
  } catch {
    marginPercent = DEFAULT_MARGIN_PERCENT;
  }
  return marginPercent;
};

const generateRefId = () => `RC${Date.now()}${Math.random().toString(36).slice(2, 8)}`;

const paginationMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit) || 1,
});

const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const logActivity = async (userId, action, description, metadata = null, ip = null) => {
  try {
    await pool.execute(
      'INSERT INTO activity_logs (user_id, action, description, metadata, ip_address) VALUES (?, ?, ?, ?, ?)',
      [userId, action, description, metadata ? JSON.stringify(metadata) : null, ip]
    );
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
};

const callDigiflazz = async (endpoint, body) => {
  const response = await fetch(`${DIGIFLAZZ_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json();
};

const fetchDigiflazzPriceListFromApi = async () => {
  const result = await callDigiflazz('/price-list', {
    cmd: 'prepaid',
    username: DIGIFLAZZ_USERNAME,
    sign: digiflazzSign('pricelist'),
  });

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  const errorMessage =
    result?.data?.message ||
    result?.message ||
    (typeof result?.data === 'string' ? result.data : null) ||
    'Gagal mengambil daftar harga dari Digiflazz. Periksa username dan API key.';

  const error = new Error(errorMessage);
  error.digiflazzResponse = result;
  error.rc = result?.data?.rc;
  throw error;
};

const getDigiflazzPriceList = async (forceRefresh = false) => {
  const now = Date.now();
  const cacheValid =
    priceListCache.data && now - priceListCache.fetchedAt < PRICE_LIST_CACHE_TTL;

  if (cacheValid && !forceRefresh) {
    return priceListCache.data;
  }

  try {
    const data = await fetchDigiflazzPriceListFromApi();
    priceListCache = { data, fetchedAt: now };
    return data;
  } catch (err) {
    if (priceListCache.data) {
      console.warn(`Menggunakan cache pricelist lama: ${err.message}`);
      return priceListCache.data;
    }
    throw err;
  }
};

const SERVICE_IDS = ['pulsa', 'data', 'voucher', 'game', 'pln'];

const matchProductService = (product, service) => {
  if (!service || !SERVICE_IDS.includes(service)) return true;

  const category = (product.category || '').toLowerCase();
  const brand = (product.brand || '').toLowerCase();
  const name = (product.product_name || '').toLowerCase();
  const type = (product.type || '').toLowerCase();

  switch (service) {
    case 'pulsa':
      return category === 'pulsa' || (category.includes('pulsa') && !category.includes('data'));
    case 'data':
      return category.includes('data') || type.includes('data') || name.includes('kuota') || name.includes('paket');
    case 'voucher':
      return category.includes('voucher') || name.includes('voucher');
    case 'game':
      return category.includes('game') || brand.includes('game') || name.includes('diamond') || name.includes('uc ');
    case 'pln':
      return (
        category.includes('pln') ||
        brand.includes('pln') ||
        category.includes('listrik') ||
        name.includes('pln') ||
        name.includes('token listrik')
      );
    default:
      return true;
  }
};

const mapPrepaidProducts = (products) =>
  products
    .filter((p) => p.buyer_product_status && p.seller_product_status)
    .map((p) => ({
      buyer_sku_code: p.buyer_sku_code,
      product_name: p.product_name,
      category: p.category,
      brand: p.brand,
      type: p.type,
      price: parseFloat(p.price),
      selling_price: calcSellingPrice(p.price),
      desc: p.desc,
    }));

const processDigiflazzTopup = async (refId, buyerSkuCode, customerNo) => {
  const body = {
    username: DIGIFLAZZ_USERNAME,
    buyer_sku_code: buyerSkuCode,
    customer_no: customerNo,
    ref_id: refId,
    sign: digiflazzSign(refId),
  };
  if (DIGIFLAZZ_TESTING) body.testing = true;
  return callDigiflazz('/transaction', body);
};

const mapDigiflazzStatus = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'sukses' || s === 'success') return 'success';
  if (s === 'pending' || s === 'processing') return 'pending';
  return 'failed';
};

const parseDigiflazzPayload = (body) => {
  if (!body || typeof body !== 'object') return null;
  if (body.data && typeof body.data === 'object') return body.data;
  if (body.ref_id) return body;
  return null;
};

const hasRefundForTransaction = async (connection, transaction) => {
  const [rows] = await connection.execute(
    `SELECT id FROM balance_transactions WHERE user_id = ? AND type = 'refund' AND note LIKE ? LIMIT 1`,
    [transaction.user_id, `%${transaction.ref_id}%`]
  );
  return rows.length > 0;
};

const applyTransactionStatusUpdate = async (connection, transaction, digiflazzData, fullResponse = null) => {
  const newStatus = mapDigiflazzStatus(digiflazzData.status);
  const oldStatus = transaction.status;
  const sn = digiflazzData.sn || transaction.sn || null;
  const message = digiflazzData.message || transaction.message || null;
  const responseJson = JSON.stringify(fullResponse || digiflazzData);

  await connection.execute(
    `UPDATE transactions SET status = ?, sn = ?, message = ?, digiflazz_response = ?, updated_at = NOW() WHERE id = ?`,
    [newStatus, sn, message, responseJson, transaction.id]
  );

  let refunded = false;
  let balanceAfter = null;

  if (oldStatus === 'pending' && newStatus === 'failed') {
    const alreadyRefunded = await hasRefundForTransaction(connection, transaction);
    if (!alreadyRefunded) {
      const [users] = await connection.execute('SELECT * FROM users WHERE id = ? FOR UPDATE', [transaction.user_id]);
      if (users.length) {
        const balanceBefore = parseFloat(users[0].balance);
        const refundAmount = parseFloat(transaction.selling_price);
        balanceAfter = balanceBefore + refundAmount;

        await connection.execute('UPDATE users SET balance = ? WHERE id = ?', [balanceAfter, transaction.user_id]);
        await connection.execute(
          'INSERT INTO balance_transactions (user_id, type, amount, balance_before, balance_after, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            transaction.user_id,
            'refund',
            refundAmount,
            balanceBefore,
            balanceAfter,
            `Refund transaksi gagal ${transaction.ref_id}`,
            null,
          ]
        );
        refunded = true;
      }
    }
  }

  return { oldStatus, newStatus, sn, message, refunded, balanceAfter };
};

// ─── Auth Middleware ───────────────────────────────────────────────────────

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.execute(
      'SELECT id, name, email, phone, role, balance, status FROM users WHERE id = ?',
      [decoded.id]
    );
    if (!rows.length || rows[0].status !== 'active') {
      return res.status(401).json({ success: false, message: 'User tidak aktif atau tidak ditemukan' });
    }
    req.user = rows[0];
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token tidak valid' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Akses ditolak' });
  }
  next();
};

// ─── Database Init ─────────────────────────────────────────────────────────

const initDatabase = async () => {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'raca_cell',
    waitForConnections: true,
    connectionLimit: 10,
  });

  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('owner', 'admin', 'user') NOT NULL DEFAULT 'user',
        balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
        status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS balance_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('topup', 'add', 'reduce', 'purchase', 'refund') NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        balance_before DECIMAL(15, 2) NOT NULL,
        balance_after DECIMAL(15, 2) NOT NULL,
        note TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        ref_id VARCHAR(100) NOT NULL UNIQUE,
        customer_no VARCHAR(30) NOT NULL,
        buyer_sku_code VARCHAR(50) NOT NULL,
        product_name VARCHAR(200) NOT NULL,
        category VARCHAR(100),
        brand VARCHAR(100),
        price DECIMAL(15, 2) NOT NULL,
        selling_price DECIMAL(15, 2) NOT NULL,
        status ENUM('success', 'pending', 'failed') NOT NULL DEFAULT 'pending',
        sn VARCHAR(255),
        message TEXT,
        digiflazz_response JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        metadata JSON,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value VARCHAR(255) NOT NULL,
        updated_by INT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    const [marginSetting] = await connection.query(
      "SELECT id FROM settings WHERE setting_key = 'margin_percent' LIMIT 1"
    );
    if (!marginSetting.length) {
      await connection.query(
        "INSERT INTO settings (setting_key, setting_value) VALUES ('margin_percent', ?)",
        [String(DEFAULT_MARGIN_PERCENT)]
      );
    }

    const [waSetting] = await connection.query(
      "SELECT id FROM settings WHERE setting_key = 'admin_whatsapp' LIMIT 1"
    );
    if (!waSetting.length) {
      await connection.query(
        "INSERT INTO settings (setting_key, setting_value) VALUES ('admin_whatsapp', '')"
      );
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS topup_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        note TEXT,
        status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        admin_note TEXT,
        processed_by INT,
        processed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_topup_user (user_id),
        INDEX idx_topup_status (status)
      )
    `);

    const [owners] = await connection.query("SELECT id FROM users WHERE role = 'owner' LIMIT 1");
    if (!owners.length) {
      const hashed = await bcrypt.hash('password123', 10);
      await connection.query(
        "INSERT INTO users (name, email, phone, password, role, balance, status) VALUES (?, ?, ?, ?, 'owner', 0, 'active')",
        ['Owner Raca Cell', 'owner@racacell.com', '081234567890', hashed]
      );
      console.log('Default owner created: owner@racacell.com / password123');
    }
  } finally {
    connection.release();
  }

  await loadMarginPercent();
};

// ─── Auth Routes ───────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name?.trim() || !email?.trim() || !phone?.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });
    }

    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length) {
      return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), phone.trim(), hashed, 'user']
    );

    await logActivity(result.insertId, 'register', `User ${name} mendaftar`, { email }, req.ip);

    const token = jwt.sign({ id: result.insertId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil',
      data: { id: result.insertId, name, email, phone, role: 'user', balance: 0 },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
    }

    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' });
    }

    const user = rows[0];
    if (user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Akun tidak aktif' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' });
    }

    await logActivity(user.id, 'login', `User ${user.name} login`, null, req.ip);

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const { password: _, ...userData } = user;
    res.json({ success: true, message: 'Login berhasil', data: userData, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

app.get('/api/auth/profile', authenticate, async (req, res) => {
  res.json({ success: true, data: req.user });
});

// ─── Users Routes ────────────────────────────────────────────────────────────

app.get('/api/users', authenticate, authorize('owner', 'admin'), async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const search = req.query.search?.trim() || '';
    const role = req.query.role?.trim() || '';
    const sort = ['name', 'email', 'balance', 'created_at'].includes(req.query.sort) ? req.query.sort : 'created_at';
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';

    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (role) {
      where += ' AND role = ?';
      params.push(role);
    }

    const [countRows] = await pool.execute(`SELECT COUNT(*) as total FROM users ${where}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT id, name, email, phone, role, balance, status, created_at FROM users ${where} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ success: true, data: rows, pagination: paginationMeta(page, limit, total) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

app.post('/api/users', authenticate, authorize('owner', 'admin'), async (req, res) => {
  try {
    const { name, email, phone, password, role = 'user' } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
    }
    if (!['user', 'admin'].includes(role) && req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Hanya owner yang bisa membuat admin' });
    }
    if (role === 'owner') {
      return res.status(400).json({ success: false, message: 'Tidak bisa membuat user owner' });
    }

    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length) {
      return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), phone.trim(), hashed, role]
    );

    await logActivity(req.user.id, 'create_user', `Membuat user ${name} (${role})`, { userId: result.insertId }, req.ip);

    res.status(201).json({
      success: true,
      message: 'User berhasil dibuat',
      data: { id: result.insertId, name, email, phone, role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

app.put('/api/users/:id', authenticate, authorize('owner', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, role, status } = req.body;

    const [existing] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }
    if (existing[0].role === 'owner' && req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Tidak bisa mengubah owner' });
    }

    const updates = [];
    const params = [];
    if (name) { updates.push('name = ?'); params.push(name.trim()); }
    if (phone) { updates.push('phone = ?'); params.push(phone.trim()); }
    if (status) { updates.push('status = ?'); params.push(status); }
    if (role && req.user.role === 'owner' && role !== 'owner') {
      updates.push('role = ?');
      params.push(role);
    }

    if (!updates.length) {
      return res.status(400).json({ success: false, message: 'Tidak ada data yang diubah' });
    }

    params.push(id);
    await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    await logActivity(req.user.id, 'update_user', `Mengubah user ID ${id}`, req.body, req.ip);

    res.json({ success: true, message: 'User berhasil diperbarui' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

app.delete('/api/users/:id', authenticate, authorize('owner'), async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }
    if (existing[0].role === 'owner') {
      return res.status(400).json({ success: false, message: 'Tidak bisa menghapus owner' });
    }

    await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    await logActivity(req.user.id, 'delete_user', `Menghapus user ${existing[0].name}`, { userId: id }, req.ip);

    res.json({ success: true, message: 'User berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

// ─── Balance Routes ────────────────────────────────────────────────────────

app.post('/api/users/:id/balance', authenticate, authorize('owner', 'admin'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { type, amount, note } = req.body;

    if (!['topup', 'add', 'reduce'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Tipe tidak valid' });
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ success: false, message: 'Jumlah harus lebih dari 0' });
    }

    await connection.beginTransaction();

    const [users] = await connection.execute('SELECT * FROM users WHERE id = ? FOR UPDATE', [id]);
    if (!users.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    const user = users[0];
    const balanceBefore = parseFloat(user.balance);
    let balanceAfter;

    if (type === 'reduce') {
      if (balanceBefore < amt) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Saldo tidak mencukupi' });
      }
      balanceAfter = balanceBefore - amt;
    } else {
      balanceAfter = balanceBefore + amt;
    }

    await connection.execute('UPDATE users SET balance = ? WHERE id = ?', [balanceAfter, id]);
    await connection.execute(
      'INSERT INTO balance_transactions (user_id, type, amount, balance_before, balance_after, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, type, amt, balanceBefore, balanceAfter, note || null, req.user.id]
    );

    await connection.commit();

    const actionLabel = { topup: 'Topup saldo', add: 'Tambah saldo', reduce: 'Kurangi saldo' };
    await logActivity(
      req.user.id,
      `balance_${type}`,
      `${actionLabel[type]} Rp ${amt.toLocaleString('id-ID')} untuk ${user.name}`,
      { userId: id, amount: amt, type },
      req.ip
    );

    res.json({
      success: true,
      message: 'Saldo berhasil diperbarui',
      data: { balance_before: balanceBefore, balance_after: balanceAfter },
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  } finally {
    connection.release();
  }
});

app.get('/api/balance/history', authenticate, async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const search = req.query.search?.trim() || '';
    const type = req.query.type?.trim() || '';
    const userId = req.user.role === 'user' ? req.user.id : req.query.user_id || null;

    let where = 'WHERE 1=1';
    const params = [];

    if (userId) {
      where += ' AND bt.user_id = ?';
      params.push(userId);
    }
    if (type) {
      where += ' AND bt.type = ?';
      params.push(type);
    }
    if (search) {
      where += ' AND (u.name LIKE ? OR bt.note LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s);
    }

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM balance_transactions bt JOIN users u ON bt.user_id = u.id ${where}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT bt.*, u.name as user_name, u.email as user_email,
              cb.name as created_by_name
       FROM balance_transactions bt
       JOIN users u ON bt.user_id = u.id
       LEFT JOIN users cb ON bt.created_by = cb.id
       ${where}
       ORDER BY bt.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ success: true, data: rows, pagination: paginationMeta(page, limit, total) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

// ─── Products Routes ───────────────────────────────────────────────────────

app.get('/api/products/prepaid', authenticate, async (req, res) => {
  try {
    if (!DIGIFLAZZ_USERNAME || !DIGIFLAZZ_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'Digiflazz API belum dikonfigurasi. Atur DIGIFLAZZ_USERNAME dan DIGIFLAZZ_API_KEY di .env',
      });
    }

    const products = await getDigiflazzPriceList();
    const search = req.query.search?.trim().toLowerCase() || '';
    const brand = req.query.brand?.trim() || '';
    const category = req.query.category?.trim() || '';
    const type = req.query.type?.trim() || '';
    const service = req.query.service?.trim().toLowerCase() || '';

    if (service && !SERVICE_IDS.includes(service)) {
      return res.status(400).json({ success: false, message: 'Jenis layanan tidak valid' });
    }

    let raw = products;
    if (service) raw = raw.filter((p) => matchProductService(p, service));
    if (brand) raw = raw.filter((p) => p.brand === brand);
    if (category) raw = raw.filter((p) => p.category === category);
    if (type) raw = raw.filter((p) => p.type === type);

    let data = mapPrepaidProducts(raw);

    if (search) {
      data = data.filter(
        (p) =>
          p.product_name.toLowerCase().includes(search) ||
          p.brand.toLowerCase().includes(search) ||
          p.buyer_sku_code.toLowerCase().includes(search)
      );
    }

    const { page, limit, offset } = getPagination(req.query);
    const total = data.length;
    const paginated = data.slice(offset, offset + limit);

    res.json({
      success: true,
      data: paginated,
      pagination: paginationMeta(page, limit, total),
      margin_percent: marginPercent,
    });
  } catch (err) {
    console.error('Digiflazz price-list error:', err.message, err.digiflazzResponse || '');
    res.status(502).json({ success: false, message: err.message || 'Gagal mengambil daftar produk' });
  }
});

app.get('/api/products/services', authenticate, async (req, res) => {
  try {
    const products = mapPrepaidProducts(await getDigiflazzPriceList());
    const allRaw = await getDigiflazzPriceList();
    const data = SERVICE_IDS.map((id) => ({
      id,
      total: allRaw.filter((p) => p.buyer_product_status && p.seller_product_status && matchProductService(p, id)).length,
    }));
    res.json({ success: true, data, total_products: products.length });
  } catch (err) {
    res.status(502).json({ success: false, message: err.message || 'Gagal mengambil daftar layanan' });
  }
});

app.get('/api/products/brands', authenticate, async (req, res) => {
  try {
    const service = req.query.service?.trim().toLowerCase() || '';
    let products = await getDigiflazzPriceList();
    if (service) products = products.filter((p) => matchProductService(p, service));
    const brands = [...new Set(mapPrepaidProducts(products).map((p) => p.brand).filter(Boolean))].sort();
    res.json({ success: true, data: brands });
  } catch (err) {
    console.error('Digiflazz brands error:', err.message);
    res.status(502).json({ success: false, message: err.message || 'Gagal mengambil daftar brand' });
  }
});

app.get('/api/products/categories', authenticate, async (req, res) => {
  try {
    const products = await getDigiflazzPriceList();
    const categories = [...new Set(mapPrepaidProducts(products).map((p) => p.category).filter(Boolean))].sort();
    res.json({ success: true, data: categories });
  } catch (err) {
    console.error('Digiflazz categories error:', err.message);
    res.status(502).json({ success: false, message: err.message || 'Gagal mengambil daftar kategori' });
  }
});

app.post('/api/products/refresh-cache', authenticate, authorize('owner', 'admin'), async (req, res) => {
  try {
    if (!DIGIFLAZZ_USERNAME || !DIGIFLAZZ_API_KEY) {
      return res.status(503).json({ success: false, message: 'Digiflazz API belum dikonfigurasi' });
    }
    const data = await getDigiflazzPriceList(true);
    await logActivity(req.user.id, 'refresh_pricelist', `Refresh cache pricelist (${data.length} produk)`, null, req.ip);
    res.json({ success: true, message: 'Cache pricelist berhasil diperbarui', data: { total: data.length } });
  } catch (err) {
    res.status(502).json({ success: false, message: err.message || 'Gagal refresh cache' });
  }
});

// ─── Transaction Routes ────────────────────────────────────────────────────

app.post('/api/transactions/topup', authenticate, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { buyer_sku_code, customer_no, product_name, category, brand, price } = req.body;

    if (!buyer_sku_code || !customer_no || !price) {
      return res.status(400).json({ success: false, message: 'Data transaksi tidak lengkap' });
    }

    const basePrice = parseFloat(price);
    const sellPrice = calcSellingPrice(basePrice);

    await connection.beginTransaction();

    const [users] = await connection.execute('SELECT * FROM users WHERE id = ? FOR UPDATE', [req.user.id]);
    const user = users[0];
    const balanceBefore = parseFloat(user.balance);

    if (balanceBefore < sellPrice) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Saldo tidak mencukupi' });
    }

    const refId = generateRefId();
    let digiflazzResult;
    let status = 'failed';
    let sn = null;
    let message = 'Transaksi gagal';

    if (DIGIFLAZZ_USERNAME && DIGIFLAZZ_API_KEY) {
      digiflazzResult = await processDigiflazzTopup(refId, buyer_sku_code, customer_no);
      const data = digiflazzResult?.data;
      if (data) {
        status = mapDigiflazzStatus(data.status);
        sn = data.sn || null;
        message = data.message || message;
      }
    } else {
      status = 'success';
      message = 'Transaksi simulasi (Digiflazz belum dikonfigurasi)';
      sn = `SIM${Date.now()}`;
      digiflazzResult = { simulated: true };
    }

    if (status === 'failed') {
      await connection.execute(
        `INSERT INTO transactions (user_id, ref_id, customer_no, buyer_sku_code, product_name, category, brand, price, selling_price, status, sn, message, digiflazz_response)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, refId, customer_no, buyer_sku_code, product_name || buyer_sku_code, category, brand, basePrice, sellPrice, status, sn, message, JSON.stringify(digiflazzResult)]
      );
      await connection.commit();

      await logActivity(req.user.id, 'transaction_failed', `Transaksi gagal ke ${customer_no}`, { refId }, req.ip);

      return res.status(400).json({ success: false, message, data: { ref_id: refId, status } });
    }

    const balanceAfter = balanceBefore - sellPrice;
    await connection.execute('UPDATE users SET balance = ? WHERE id = ?', [balanceAfter, req.user.id]);
    await connection.execute(
      'INSERT INTO balance_transactions (user_id, type, amount, balance_before, balance_after, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, 'purchase', sellPrice, balanceBefore, balanceAfter, `Pembelian ${product_name} - ${customer_no}`, req.user.id]
    );
    await connection.execute(
      `INSERT INTO transactions (user_id, ref_id, customer_no, buyer_sku_code, product_name, category, brand, price, selling_price, status, sn, message, digiflazz_response)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, refId, customer_no, buyer_sku_code, product_name || buyer_sku_code, category, brand, basePrice, sellPrice, status, sn, message, JSON.stringify(digiflazzResult)]
    );

    await connection.commit();

    await logActivity(
      req.user.id,
      'transaction',
      `Transaksi ${product_name} ke ${customer_no} - Rp ${sellPrice.toLocaleString('id-ID')}`,
      { refId, status },
      req.ip
    );

    res.json({
      success: true,
      message: status === 'pending' ? 'Transaksi pending, mohon tunggu' : 'Transaksi berhasil',
      data: {
        ref_id: refId,
        status,
        sn,
        message,
        balance_after: balanceAfter,
        selling_price: sellPrice,
      },
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat transaksi' });
  } finally {
    connection.release();
  }
});

app.get('/api/transactions', authenticate, async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const search = req.query.search?.trim() || '';
    const status = req.query.status?.trim() || '';
    const userId = ['owner', 'admin'].includes(req.user.role) ? req.query.user_id || null : req.user.id;

    let where = 'WHERE 1=1';
    const params = [];

    if (userId) {
      where += ' AND t.user_id = ?';
      params.push(userId);
    } else if (req.user.role === 'user') {
      where += ' AND t.user_id = ?';
      params.push(req.user.id);
    }
    if (status) {
      where += ' AND t.status = ?';
      params.push(status);
    }
    if (search) {
      where += ' AND (t.customer_no LIKE ? OR t.product_name LIKE ? OR t.ref_id LIKE ? OR u.name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM transactions t JOIN users u ON t.user_id = u.id ${where}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT t.*, u.name as user_name FROM transactions t JOIN users u ON t.user_id = u.id ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ success: true, data: rows, pagination: paginationMeta(page, limit, total) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

app.get('/api/transactions/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT t.*, u.name as user_name FROM transactions t JOIN users u ON t.user_id = u.id WHERE t.id = ?`,
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    }
    if (req.user.role === 'user' && rows[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

app.post('/api/transactions/:id/check-status', authenticate, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    }

    const transaction = rows[0];
    if (req.user.role === 'user' && transaction.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }
    if (transaction.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Hanya transaksi pending yang bisa dicek ulang' });
    }
    if (!DIGIFLAZZ_USERNAME || !DIGIFLAZZ_API_KEY) {
      return res.status(503).json({ success: false, message: 'Digiflazz API belum dikonfigurasi' });
    }

    const digiflazzResult = await processDigiflazzTopup(
      transaction.ref_id,
      transaction.buyer_sku_code,
      transaction.customer_no
    );
    const data = digiflazzResult?.data;
    if (!data) {
      return res.status(502).json({
        success: false,
        message: digiflazzResult?.message || 'Gagal memeriksa status ke Digiflazz',
      });
    }

    await connection.beginTransaction();
    const [locked] = await connection.execute('SELECT * FROM transactions WHERE id = ? FOR UPDATE', [transaction.id]);
    const current = locked[0];

    if (current.status !== 'pending') {
      await connection.commit();
      return res.json({
        success: true,
        message: 'Status transaksi sudah diperbarui',
        data: { status: current.status, sn: current.sn, message: current.message },
      });
    }

    const result = await applyTransactionStatusUpdate(connection, current, data, digiflazzResult);
    await connection.commit();

    if (result.refunded) {
      await logActivity(
        current.user_id,
        'transaction_refund',
        `Refund otomatis transaksi gagal ${current.ref_id}`,
        { refId: current.ref_id, amount: current.selling_price },
        req.ip
      );
    }
    if (result.oldStatus !== result.newStatus) {
      await logActivity(
        current.user_id,
        'transaction_status_update',
        `Status transaksi ${current.ref_id}: ${result.oldStatus} → ${result.newStatus}`,
        { refId: current.ref_id, source: 'check_status' },
        req.ip
      );
    }

    const statusMessages = {
      success: 'Transaksi berhasil',
      pending: 'Transaksi masih diproses',
      failed: result.refunded ? 'Transaksi gagal, saldo telah dikembalikan' : 'Transaksi gagal',
    };

    res.json({
      success: true,
      message: statusMessages[result.newStatus] || 'Status diperbarui',
      data: {
        status: result.newStatus,
        sn: result.sn,
        message: result.message,
        refunded: result.refunded,
        balance_after: result.balanceAfter,
      },
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat cek status' });
  } finally {
    connection.release();
  }
});

// ─── Digiflazz Webhook ─────────────────────────────────────────────────────
// Daftarkan URL di panel Digiflazz: Pengaturan Koneksi API → Webhook
// Contoh: https://api.kingcreativestudio.my.id/raca-cell/api/webhooks/digiflazz

app.post('/api/webhooks/digiflazz', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const event = req.headers['x-digiflazz-event'] || 'unknown';
    const payload = parseDigiflazzPayload(req.body);
    const refId = payload?.ref_id;

    if (!refId) {
      return res.status(400).json({ ok: false, message: 'ref_id tidak ditemukan' });
    }

    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT * FROM transactions WHERE ref_id = ? FOR UPDATE', [refId]);

    if (!rows.length) {
      await connection.commit();
      console.log(`[webhook] ${event} ref_id=${refId} — transaksi tidak ditemukan`);
      return res.status(200).json({ ok: true, message: 'Transaksi tidak ditemukan' });
    }

    const transaction = rows[0];
    const result = await applyTransactionStatusUpdate(connection, transaction, payload, req.body);
    await connection.commit();

    if (result.refunded) {
      await logActivity(
        transaction.user_id,
        'transaction_refund',
        `Refund otomatis transaksi gagal ${refId} (webhook)`,
        { refId, amount: transaction.selling_price, event },
        req.ip
      );
    }
    if (result.oldStatus !== result.newStatus) {
      await logActivity(
        transaction.user_id,
        'transaction_status_update',
        `Status transaksi ${refId}: ${result.oldStatus} → ${result.newStatus} (webhook)`,
        { refId, event, source: 'webhook' },
        req.ip
      );
    }

    console.log(`[webhook] ${event} ref_id=${refId} ${result.oldStatus} → ${result.newStatus}`);
    res.status(200).json({ ok: true, ref_id: refId, status: result.newStatus, refunded: result.refunded });
  } catch (err) {
    await connection.rollback();
    console.error('[webhook] error:', err);
    res.status(500).json({ ok: false, message: 'Internal error' });
  } finally {
    connection.release();
  }
});

// ─── Activity Logs ─────────────────────────────────────────────────────────

app.get('/api/activity-logs', authenticate, authorize('owner', 'admin'), async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const search = req.query.search?.trim() || '';
    const action = req.query.action?.trim() || '';

    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (al.description LIKE ? OR u.name LIKE ? OR al.action LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (action) {
      where += ' AND al.action = ?';
      params.push(action);
    }

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id ${where}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT al.*, u.name as user_name, u.email as user_email
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ success: true, data: rows, pagination: paginationMeta(page, limit, total) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

// ─── Dashboard Stats ───────────────────────────────────────────────────────

app.get('/api/dashboard/stats', authenticate, async (req, res) => {
  try {
    const isAdmin = ['owner', 'admin'].includes(req.user.role);

    if (isAdmin) {
      const [userCount] = await pool.execute('SELECT COUNT(*) as total FROM users WHERE role = ?', ['user']);
      const [txToday] = await pool.execute(
        "SELECT COUNT(*) as total, COALESCE(SUM(selling_price), 0) as revenue FROM transactions WHERE DATE(created_at) = CURDATE() AND status != 'failed'"
      );
      const [txSuccess] = await pool.execute("SELECT COUNT(*) as total FROM transactions WHERE status = 'success'");
      const [txPending] = await pool.execute("SELECT COUNT(*) as total FROM transactions WHERE status = 'pending'");
      const [topupPending] = await pool.execute(
        "SELECT COUNT(*) as total FROM topup_requests WHERE status = 'pending'"
      );

      return res.json({
        success: true,
        data: {
          total_users: userCount[0].total,
          transactions_today: txToday[0].total,
          revenue_today: parseFloat(txToday[0].revenue),
          transactions_success: txSuccess[0].total,
          transactions_pending: txPending[0].total,
          topup_requests_pending: topupPending[0].total,
        },
      });
    }

    const [txCount] = await pool.execute('SELECT COUNT(*) as total FROM transactions WHERE user_id = ?', [req.user.id]);
    const [txSuccess] = await pool.execute(
      "SELECT COUNT(*) as total FROM transactions WHERE user_id = ? AND status = 'success'",
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        balance: parseFloat(req.user.balance),
        total_transactions: txCount[0].total,
        success_transactions: txSuccess[0].total,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

// ─── Topup Request Routes ──────────────────────────────────────────────────

app.post('/api/topup-requests', authenticate, async (req, res) => {
  try {
    const { amount, note } = req.body;
    const amt = parseFloat(amount);

    if (!amt || amt <= 0) {
      return res.status(400).json({ success: false, message: 'Jumlah topup harus lebih dari 0' });
    }
    if (amt < 10000) {
      return res.status(400).json({ success: false, message: 'Minimum request topup Rp 10.000' });
    }

    const [pending] = await pool.execute(
      "SELECT id FROM topup_requests WHERE user_id = ? AND status = 'pending' LIMIT 1",
      [req.user.id]
    );
    if (pending.length) {
      return res.status(400).json({
        success: false,
        message: 'Anda masih memiliki request topup yang menunggu persetujuan admin',
      });
    }

    const [result] = await pool.execute(
      'INSERT INTO topup_requests (user_id, amount, note) VALUES (?, ?, ?)',
      [req.user.id, amt, note?.trim() || null]
    );

    await logActivity(
      req.user.id,
      'topup_request',
      `Request topup saldo Rp ${amt.toLocaleString('id-ID')}`,
      { requestId: result.insertId, amount: amt },
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Request topup berhasil dikirim. Tunggu konfirmasi admin.',
      data: { id: result.insertId, amount: amt, status: 'pending' },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

app.get('/api/topup-requests', authenticate, async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const search = req.query.search?.trim() || '';
    const status = req.query.status?.trim() || '';
    const isAdmin = ['owner', 'admin'].includes(req.user.role);

    let where = 'WHERE 1=1';
    const params = [];

    if (!isAdmin) {
      where += ' AND tr.user_id = ?';
      params.push(req.user.id);
    }
    if (status) {
      where += ' AND tr.status = ?';
      params.push(status);
    }
    if (search && isAdmin) {
      where += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM topup_requests tr JOIN users u ON tr.user_id = u.id ${where}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT tr.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
              pb.name as processed_by_name
       FROM topup_requests tr
       JOIN users u ON tr.user_id = u.id
       LEFT JOIN users pb ON tr.processed_by = pb.id
       ${where}
       ORDER BY tr.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ success: true, data: rows, pagination: paginationMeta(page, limit, total) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

app.put('/api/topup-requests/:id/approve', authenticate, authorize('owner', 'admin'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { admin_note } = req.body;

    await connection.beginTransaction();

    const [requests] = await connection.execute(
      "SELECT * FROM topup_requests WHERE id = ? AND status = 'pending' FOR UPDATE",
      [id]
    );
    if (!requests.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Request tidak ditemukan atau sudah diproses' });
    }

    const request = requests[0];
    const amt = parseFloat(request.amount);

    const [users] = await connection.execute('SELECT * FROM users WHERE id = ? FOR UPDATE', [request.user_id]);
    const user = users[0];
    const balanceBefore = parseFloat(user.balance);
    const balanceAfter = balanceBefore + amt;

    await connection.execute('UPDATE users SET balance = ? WHERE id = ?', [balanceAfter, request.user_id]);
    await connection.execute(
      'INSERT INTO balance_transactions (user_id, type, amount, balance_before, balance_after, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        request.user_id,
        'topup',
        amt,
        balanceBefore,
        balanceAfter,
        `Topup dari request #${id}${admin_note ? ` - ${admin_note}` : ''}`,
        req.user.id,
      ]
    );
    await connection.execute(
      `UPDATE topup_requests SET status = 'approved', admin_note = ?, processed_by = ?, processed_at = NOW() WHERE id = ?`,
      [admin_note?.trim() || null, req.user.id, id]
    );

    await connection.commit();

    await logActivity(
      req.user.id,
      'topup_request_approve',
      `Menyetujui request topup Rp ${amt.toLocaleString('id-ID')} untuk ${user.name}`,
      { requestId: id, userId: request.user_id, amount: amt },
      req.ip
    );

    res.json({
      success: true,
      message: 'Request topup disetujui dan saldo ditambahkan',
      data: { balance_after: balanceAfter },
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  } finally {
    connection.release();
  }
});

app.put('/api/topup-requests/:id/reject', authenticate, authorize('owner', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_note } = req.body;

    const [requests] = await pool.execute(
      "SELECT tr.*, u.name as user_name FROM topup_requests tr JOIN users u ON tr.user_id = u.id WHERE tr.id = ? AND tr.status = 'pending'",
      [id]
    );
    if (!requests.length) {
      return res.status(404).json({ success: false, message: 'Request tidak ditemukan atau sudah diproses' });
    }

    await pool.execute(
      `UPDATE topup_requests SET status = 'rejected', admin_note = ?, processed_by = ?, processed_at = NOW() WHERE id = ?`,
      [admin_note?.trim() || 'Ditolak oleh admin', req.user.id, id]
    );

    await logActivity(
      req.user.id,
      'topup_request_reject',
      `Menolak request topup #${id} dari ${requests[0].user_name}`,
      { requestId: id },
      req.ip
    );

    res.json({ success: true, message: 'Request topup ditolak' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

// ─── Settings Routes ───────────────────────────────────────────────────────

app.get('/api/settings/contact', authenticate, async (req, res) => {
  try {
    const adminWhatsapp = await getSetting('admin_whatsapp', '');
    const normalized = normalizeWhatsApp(adminWhatsapp);
    res.json({
      success: true,
      data: {
        admin_whatsapp: adminWhatsapp,
        whatsapp_url: normalized
          ? `https://wa.me/${normalized}?text=${encodeURIComponent('Halo Admin Raca Cell, saya butuh bantuan.')}`
          : null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

app.get('/api/settings/whatsapp', authenticate, authorize('owner', 'admin'), async (req, res) => {
  const adminWhatsapp = await getSetting('admin_whatsapp', '');
  res.json({ success: true, data: { admin_whatsapp: adminWhatsapp } });
});

app.put('/api/settings/whatsapp', authenticate, authorize('owner', 'admin'), async (req, res) => {
  try {
    const { admin_whatsapp } = req.body;
    const phone = String(admin_whatsapp || '').trim();

    if (phone && normalizeWhatsApp(phone).length < 10) {
      return res.status(400).json({ success: false, message: 'Nomor WhatsApp tidak valid' });
    }

    await setSetting('admin_whatsapp', phone, req.user.id);

    await logActivity(
      req.user.id,
      'update_whatsapp',
      `Mengubah nomor WhatsApp admin menjadi ${phone || '(kosong)'}`,
      { admin_whatsapp: phone },
      req.ip
    );

    res.json({ success: true, message: 'Nomor WhatsApp admin berhasil disimpan', data: { admin_whatsapp: phone } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

app.get('/api/settings/margin', authenticate, async (req, res) => {
  res.json({
    success: true,
    data: { margin_percent: marginPercent },
  });
});

app.put('/api/settings/margin', authenticate, authorize('owner', 'admin'), async (req, res) => {
  try {
    const value = parseFloat(req.body.margin_percent);

    if (Number.isNaN(value) || value < 0 || value > 100) {
      return res.status(400).json({ success: false, message: 'Margin harus antara 0% - 100%' });
    }

    await pool.execute(
      `INSERT INTO settings (setting_key, setting_value, updated_by)
       VALUES ('margin_percent', ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
      [String(value), req.user.id]
    );

    const oldMargin = marginPercent;
    marginPercent = value;

    await logActivity(
      req.user.id,
      'update_margin',
      `Mengubah margin dari ${oldMargin}% menjadi ${value}%`,
      { old_margin: oldMargin, new_margin: value },
      req.ip
    );

    res.json({
      success: true,
      message: 'Margin berhasil diperbarui',
      data: { margin_percent: marginPercent },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

// ─── Health Check ──────────────────────────────────────────────────────────

app.get('/api/health', (_, res) => {
  res.json({ success: true, message: 'Raca Cell API is running' });
});

// ─── Start Server ──────────────────────────────────────────────────────────

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Raca Cell API running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database initialization failed:', err.message);
    process.exit(1);
  });
