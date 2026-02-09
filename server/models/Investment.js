const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  investorName: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  totalAmount: { 
    type: Number, 
    default: 0,
    required: true
  },
  transactions: [
    {
      amount: { type: Number, required: true },
      date: { type: Date }, // Accepts the date sent from frontend
      note: { type: String, default: "Capital Injection" }
    }
  ],
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Investment', investmentSchema);