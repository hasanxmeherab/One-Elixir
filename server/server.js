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
  console.warn(`⚠️ Missing env vars: ${missingEnv.join(', ')}`);
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
const isDev = process.env.NODE_ENV !== 'production';
const skipLocal = (req) => isDev || req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000,                 // 2000 requests per window per IP in production
  skip: skipLocal,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                   // 30 auth attempts per window
  skip: skipLocal,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later.' }
});

app.use('/api/', generalLimiter);
app.use('/api/auth/signin', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/admins/login', authLimiter);

// ── Serve static files (sitemap.xml, etc.) from 'public/' only ──
app.use(express.static(path.join(__dirname, 'public')));

// ── MongoDB Connection Status ────────────────────────────
let mongoConnected = false;

// ── Cached MongoDB Connection (Vercel Serverless Pattern) ─
// Cache the connection promise so it survives across warm invocations
// and is awaited before any request touches the database.
let cachedConnection = null;

async function connectToDatabase() {
  // If already connected, return immediately
  if (mongoose.connection.readyState === 1) {
    mongoConnected = true;
    return;
  }

  // If we have a cached promise, await it (don't create a duplicate)
  if (cachedConnection) {
    await cachedConnection;
    return;
  }

  // Create and cache the connection promise
  cachedConnection = mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 1,
    maxIdleTimeMS: 30000,
    retryWrites: true,
    retryReads: true,
  }).then(async () => {
    mongoConnected = true;
    console.log("✅ OneElixir Database Connected");

    try {
      const generateSitemap = require('./utils/generateSitemap');
      const Perfume = require('./models/Perfume');
      await generateSitemap(Perfume);
      console.log("✅ Sitemap generated successfully");
    } catch (sitemapErr) {
      console.error("❌ Sitemap generation failed:", sitemapErr.message);
    }
  }).catch(err => {
    mongoConnected = false;
    cachedConnection = null; // Reset so next request retries
    console.error("❌ MongoDB Connection Error:", {
      message: err.message,
      code: err.code,
      uri: process.env.MONGO_URI ? '***configured***' : '***NOT SET***'
    });
    throw err; // Re-throw so the middleware can handle it
  });

  await cachedConnection;
}

// ── Listen for connection events ────────────────────────
mongoose.connection.on('disconnected', () => {
  mongoConnected = false;
  cachedConnection = null; // Reset cache so next request reconnects
  console.warn("⚠️  MongoDB disconnected");
});

mongoose.connection.on('reconnected', () => {
  mongoConnected = true;
  console.log("✅ MongoDB reconnected");
});

mongoose.connection.on('error', (err) => {
  mongoConnected = false;
  cachedConnection = null; // Reset cache so next request reconnects
  console.error("❌ MongoDB connection error event:", err.message);
});

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

// ── Request Logging Middleware ──────────────────────────
app.use((req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${req.id}] ${req.method} ${req.path}`);
  next();
});

// ── Database Connection Middleware (CRITICAL FIX) ───────
// This middleware AWAITS the MongoDB connection before allowing
// any API request to proceed. This prevents the cold-start race
// condition where requests arrive before MongoDB finishes connecting.
app.use('/api/', async (req, res, next) => {
  if (req.method === 'OPTIONS') return next();

  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error(`[${req.id}] Failed to connect to MongoDB:`, err.message);
    res.status(503).json({
      success: false,
      message: 'Database temporarily unavailable. Please try again in a moment.',
      retryAfter: 5
    });
  }
});

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
app.use('/api/settlements', require('./routes/settlementRoutes'));

// ── Health Check Endpoint ────────────────────────────────
app.get('/health', async (req, res) => {
  // Health check also tries to connect so it's a reliable indicator
  try {
    await connectToDatabase();
  } catch (_) { /* report status even on failure */ }
  
  res.json({ 
    status: 'ok', 
    mongoConnected,
    mongoState: {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }[mongoose.connection.readyState],
    environment: {
      nodeEnv: process.env.NODE_ENV,
      mongoUri: process.env.MONGO_URI ? '***configured***' : '***NOT SET***',
      jwtSecret: process.env.JWT_SECRET ? '***configured***' : '***NOT SET***'
    }
  });
});

// ── Diagnostic Endpoint ────────────────────────────────
app.get('/api/diagnostic', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongoConnected,
    mongoState: {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }[mongoose.connection.readyState],
    environment: {
      nodeEnv: process.env.NODE_ENV,
      mongoUri: process.env.MONGO_URI ? '***configured***' : '***NOT SET***',
      jwtSecret: process.env.JWT_SECRET ? '***configured***' : '***NOT SET***',
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ? '***configured***' : '***NOT SET***',
      resendKey: process.env.RESEND_API_KEY ? '***configured***' : '***NOT SET***'
    }
  });
});

// ── 404 Handler ──────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global Error Handler ─────────────────────────────────
app.use((err, req, res, next) => {
  const requestId = req.id || 'unknown';
  console.error(`[${requestId}] Error:`, {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  
  const status = err.status || 500;
  const isDev = process.env.NODE_ENV !== 'production';
  
  res.status(status).json({
    success: false,
    message: isDev ? err.message : 'Internal server error',
    ...(isDev && { requestId, error: err.message })
  });
});

// ── Eagerly start connecting (don't await — middleware will await) ──
connectToDatabase().catch(() => {});

// ── Export for Vercel Serverless ──────────────────────────
module.exports = app;

// ── Local Development Server ─────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}