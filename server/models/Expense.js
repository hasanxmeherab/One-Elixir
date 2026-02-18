const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, enum: ['Packaging', 'Ingredients', 'Marketing', 'Tools', 'Other'], default: 'Other' },
    date: { type: Date, default: Date.now },
    quantity: { type: Number },
    unitPrice: { type: Number },
    unit: { type: String, default: 'pcs' }
});

module.exports = mongoose.model('Expense', expenseSchema);