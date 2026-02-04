const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();


app.use(cors({
  origin: [
    "http://localhost:5173",          // Local development
    "https://your-project.vercel.app" 
  ],
  credentials: true
}));

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