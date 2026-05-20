const express = require('express');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const crypto = require('crypto');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.join(__dirname);
const DATA_DIR = path.join(ROOT_DIR, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');
const SELLER_PROFILES_FILE = path.join(DATA_DIR, 'seller_profiles.json');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}-${Math.round(Math.random() * 1e9)}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(ROOT_DIR));

async function ensureFile(filePath, defaultValue) {
  try {
    await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
    if (!fs.existsSync(filePath)) {
      await fsPromises.writeFile(filePath, defaultValue, 'utf8');
    }
  } catch (error) {
    console.error('Could not create file:', filePath, error);
  }
}

async function readJson(filePath, fallback) {
  try {
    const content = await fsPromises.readFile(filePath, 'utf8');
    return JSON.parse(content || 'null') || fallback;
  } catch (_error) {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
  await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password), 'utf8').digest('hex');
}

function sendError(res, statusCode, message) {
  return res.status(statusCode).json({ success: false, error: message });
}

function sendSuccess(res, payload) {
  return res.json({ success: true, ...payload });
}

app.post('/api/signup', upload.single('idDocument'), async (req, res) => {
  const { name, email, phone, password, newsletter, twoFactor, referralCode } = req.body;
  if (!name || !email || !phone || !password) {
    return sendError(res, 400, 'Missing required signup fields.');
  }

  const users = await readJson(USERS_FILE, []);
  const normalizedEmail = String(email).trim().toLowerCase();
  if (users.some((account) => String(account.email).toLowerCase() === normalizedEmail)) {
    return sendError(res, 409, 'An account with this email already exists.');
  }

  const idDocument = req.file ? `/uploads/${req.file.filename}` : null;
  const user = {
    id: crypto.randomUUID(),
    name: String(name).trim(),
    email: normalizedEmail,
    phone: String(phone).trim(),
    password: hashPassword(password),
    newsletter: newsletter === 'true' || newsletter === true,
    twoFactor: twoFactor === 'true' || twoFactor === true,
    referralCode: String(referralCode || '').trim(),
    idDocument,
    provider: 'email',
    createdAt: new Date().toISOString()
  };

  users.push(user);
  await writeJson(USERS_FILE, users);
  return sendSuccess(res, { user: { id: user.id, name: user.name, email: user.email, phone: user.phone, idDocument: user.idDocument } });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return sendError(res, 400, 'Email and password are required.');
  }

  const users = await readJson(USERS_FILE, []);
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = users.find((account) => String(account.email).toLowerCase() === normalizedEmail);
  if (!user || user.password !== hashPassword(password)) {
    return sendError(res, 401, 'Invalid email or password.');
  }

  return sendSuccess(res, { user: { id: user.id, name: user.name, email: user.email, phone: user.phone, idDocument: user.idDocument } });
});

app.post('/api/seller/profile', upload.single('idDocument'), async (req, res) => {
  const { sellerName, shopName, email, phone } = req.body;
  if (!sellerName || !shopName || !email || !phone) {
    return sendError(res, 400, 'Seller name, shop name, email and phone are required.');
  }

  const profiles = await readJson(SELLER_PROFILES_FILE, []);
  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = profiles.find((entry) => String(entry.email).toLowerCase() === normalizedEmail);
  const idDocument = req.file ? `/uploads/${req.file.filename}` : existing?.idDocument || null;

  const profile = existing
    ? { ...existing, sellerName: String(sellerName).trim(), shopName: String(shopName).trim(), phone: String(phone).trim(), idDocument, updatedAt: new Date().toISOString() }
    : { id: crypto.randomUUID(), sellerName: String(sellerName).trim(), shopName: String(shopName).trim(), email: normalizedEmail, phone: String(phone).trim(), idDocument, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };

  const nextProfiles = existing
    ? profiles.map((entry) => (String(entry.email).toLowerCase() === normalizedEmail ? profile : entry))
    : [...profiles, profile];

  await writeJson(SELLER_PROFILES_FILE, nextProfiles);
  return sendSuccess(res, { profile });
});

app.post('/api/checkout', async (req, res) => {
  const { userEmail, items, total, method, account } = req.body;
  if (!items || !Array.isArray(items) || !method || !account) {
    return sendError(res, 400, 'Checkout information is incomplete.');
  }

  const transactions = await readJson(TRANSACTIONS_FILE, []);
  const transaction = {
    id: `UNION-${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
    userEmail: String(userEmail || '').trim().toLowerCase(),
    items,
    total: Number(total) || 0,
    method: String(method).trim(),
    account: String(account).trim(),
    status: 'Completed',
    createdAt: new Date().toISOString()
  };

  transactions.unshift(transaction);
  await writeJson(TRANSACTIONS_FILE, transactions);
  return sendSuccess(res, { transaction });
});

app.get('/api/transactions', async (req, res) => {
  const { email } = req.query;
  const transactions = await readJson(TRANSACTIONS_FILE, []);
  if (email) {
    const normalizedEmail = String(email).trim().toLowerCase();
    return sendSuccess(res, { transactions: transactions.filter((tx) => String(tx.userEmail).toLowerCase() === normalizedEmail) });
  }
  return sendSuccess(res, { transactions });
});

app.get('/api/seller/profile', async (req, res) => {
  const { email } = req.query;
  const profiles = await readJson(SELLER_PROFILES_FILE, []);
  if (!email) {
    return sendSuccess(res, { profiles });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const profile = profiles.find((entry) => String(entry.email).toLowerCase() === normalizedEmail);
  if (!profile) {
    return sendError(res, 404, 'Seller profile not found.');
  }
  return sendSuccess(res, { profile });
});

async function init() {
  await ensureFile(USERS_FILE, '[]');
  await ensureFile(TRANSACTIONS_FILE, '[]');
  await ensureFile(SELLER_PROFILES_FILE, '[]');
}

init().then(() => {
  app.listen(PORT, () => {
    console.log(`Union Market backend running at http://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to initialize backend:', error);
  process.exit(1);
});
