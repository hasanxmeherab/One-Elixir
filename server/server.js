const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const path       = require('path');
const costRoutes = require('./routes/costRoutes');

require('dotenv').config();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://oneelixir.vercel.app"
  ],
  credentials: true
}));

app.use(express.json());

// ── Serve sitemap.xml statically ─────────────────────────────
app.use(express.static(path.join(__dirname)));

// Routes
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

// Connect to MongoDB — then generate sitemap on startup
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("OneElixir Database Connected");
    // Generate sitemap on startup so it's always fresh
    const generateSitemap = require('./utils/generateSitemap');
    const Perfume = require('./models/Perfume');
    await generateSitemap(Perfume);
  })
  .catch(err => console.log(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));