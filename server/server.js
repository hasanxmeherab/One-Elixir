const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const path       = require('path');
const rateLimit  = require('express-rate-limit');
const helmet     = require('helmet');
const costRoutes = require('./routes/costRoutes');

require('dotenv').config();

// ── Environment Validation ────────────────────────────────
const requiredEnv = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'RESEND_API_KEY'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length) {
  const message = `Missing env vars: ${missingEnv.join(', ')}`;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(message);
  }
  console.error(`⚠️ ${message} — some features may not work`);
}

const app = express();

// ── Helmet Security Headers ───────────────────────────────
app.use(helmet()); // default security headers

// ── CORS Configuration ───────────────────────────────────
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://oneelixir.vercel.app",
    "https://oneelixir.live",
    "https://www.oneelixir.live",
    "https://one-elixir-backend.vercel.app"
  ],
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// ── Rate Limiting ─────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,                  // 200 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,                   // 15 auth attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later.' }
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                  // refresh attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many refresh attempts, please try again later.' }
});

app.use('/api/', generalLimiter);
app.use('/api/auth/signin', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/admins/login', authLimiter);
app.use('/api/auth/refresh', refreshLimiter);
app.use('/api/admins/refresh', refreshLimiter);

// ── Serve static files (sitemap.xml, etc.) from 'public/' only ──
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ───────────────────────────────────────────────
app.use('/api/perfumes',    require('./routes/perfumeRoutes'));
app.use('/api/orders',      require('./routes/orderRoutes'));
app.use('/api/auth',        require('./routes/authRoutes'));
app.use('/api/expenses',    require('./routes/expenseRoutes'));
app.use('/api/investments', require('./routes/investmentRoutes'));
app.use('/api/banners',     require('./routes/bannerRoutes'));
app.use('/api/coupons',     require('./routes/couponRoutes'));
app.use('/api/admins',      require('./routes/adminRoutes'));
app.use('/api/wishlist',    require('./routes/wishlistRoutes'));
app.use('/api/reviews',     require('./routes/reviewRoutes'));
app.use('/api/logs',        require('./routes/logRoutes'));
app.use('/api/addresses',   require('./routes/addressRoutes'));
app.use('/api/costs',       costRoutes);
app.use('/api/bundles',     require('./routes/bundleRoutes'));

// ── Simple In-Memory Cache ───────────────────────────────
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds

app.cacheGet = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
};
app.cacheSet = (key, data) => cache.set(key, { data, ts: Date.now() });
app.cacheDel = (prefix) => {
  for (const key of cache.keys()) { if (key.startsWith(prefix)) cache.delete(key); }
};

// ── 404 Handler ──────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global Error Handler ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack || err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  });
});

// ── Connect to MongoDB & Generate Sitemap ─────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("OneElixir Database Connected");
    const generateSitemap = require('./utils/generateSitemap');
    const Perfume = require('./models/Perfume');
    await generateSitemap(Perfume);
  })
  .catch(err => console.log(err));

// ── Export for Vercel Serverless ──────────────────────────
module.exports = app;

// ── Local Development Server ─────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}