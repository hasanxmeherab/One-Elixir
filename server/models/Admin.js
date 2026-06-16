const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  name:               { type: String, required: true },
  email:              { type: String, required: true, unique: true },
  password:           { type: String, required: true },
  role:               { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
  mustChangePassword: { type: Boolean, default: true },
  refreshToken:       { type: String, default: null }, // hashed refresh token
  createdAt:          { type: Date, default: Date.now }
});

module.exports = mongoose.model('Admin', adminSchema);