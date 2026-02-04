const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. ADVANCED CORS CONFIGURATION
const allowedOrigins = [
  //"http://localhost:5173",          // Local development
  "https://oneelixer.vercel.app"    // YOUR LIVE VERCEL URL
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Explicitly allow methods
  allowedHeaders: ['Content-Type', 'Authorization'],    // Explicitly allow headers
  credentials: true,                                   // Allow cookies if needed
  optionsSuccessStatus: 200                             // Fix for older browsers/preflight
}));

// 2. EXPLICIT PREFLIGHT HANDLING
// This ensures that 'OPTIONS' requests are always handled correctly before the main request.
app.options('*', cors());

app.use(express.json());

// Routes
app.use('/api/perfumes', require('./routes/perfumeRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

// Connect to MongoDB using env variable
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("OneElixir Database Connected"))
  .catch(err => console.log(err));

// Use process.env.PORT for deployment
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));