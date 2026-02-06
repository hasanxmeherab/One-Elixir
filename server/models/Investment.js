const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
    investorName: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Investment', investmentSchema);