const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name: String, qty: Number, unit: String, cost: Number
}, { _id: false });

const costRecordSchema = new mongoose.Schema({
  perfumeId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Perfume', required: true },
  perfumeName:     String,
  ingredients:     [ingredientSchema],
  packaging:       [ingredientSchema], // ← packaging materials
  bottlesProduced: { type: Number, required: true },
  totalCost:       Number,
  costPerBottle:   Number,
  sellingPrice:    Number,
  profitPerBottle: Number,
  profitMargin:    Number,
  notes:           String,
}, { timestamps: true });

module.exports = mongoose.model('CostRecord', costRecordSchema);