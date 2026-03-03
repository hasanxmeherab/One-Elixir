const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  qty:      { type: Number, required: true },
  unit:     { type: String, default: '' },
  cost:     { type: Number, required: true },
});

const costRecordSchema = new mongoose.Schema({
  perfumeId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Perfume', required: true },
  perfumeName:     { type: String, required: true },
  ingredients:     [ingredientSchema],
  bottlesProduced: { type: Number, required: true },
  totalCost:       { type: Number, required: true },
  costPerBottle:   { type: Number, required: true },
  sellingPrice:    { type: Number, required: true },
  profitPerBottle: { type: Number, required: true },
  profitMargin:    { type: Number, required: true },
  notes:           { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('CostRecord', costRecordSchema);