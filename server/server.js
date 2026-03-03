const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
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

// Routes
app.use('/api/perfumes',   require('./routes/perfumeRoutes'));
app.use('/api/orders',     require('./routes/orderRoutes'));
app.use('/api/auth',       require('./routes/authRoutes'));
app.use('/api/expenses',   require('./routes/expenseRoutes'));
app.use('/api/investments',require('./routes/investmentRoutes'));
app.use('/api/banners',    require('./routes/bannerRoutes'));
app.use('/api/coupons',    require('./routes/couponRoutes'));
app.use('/api/admins',     require('./routes/adminRoutes'));
app.use('/api/wishlist',   require('./routes/wishlistRoutes'));
app.use('/api/reviews',    require('./routes/reviewRoutes'));
app.use('/api/logs',       require('./routes/logRoutes'));
app.use('/api/addresses',  require('./routes/addressRoutes'));

// Cost calculation routes
app.use('/api/costs', costRoutes);



// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("OneElixir Database Connected"))
  .catch(err => console.log(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));