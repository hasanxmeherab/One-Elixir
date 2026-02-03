const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
app.use('/api/perfumes', require('./routes/perfumeRoutes'));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("OneElixir Database Connected"))
  .catch(err => console.log(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));