const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  label:     { type: String, default: 'Home' },
  fullName:  { type: String, required: true },
  phone:     { type: String, required: true },
  address:   { type: String, required: true },
  city:      { type: String, required: true },
  isDefault: { type: Boolean, default: false }
});

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role:     { type: String, default: 'customer' },
  avatar:   { type: String, default: '' },      // profile picture URL
  googleId: { type: String, default: null },    // for Google sign in
  resetPasswordToken:   String,
  resetPasswordExpires: Date,
  refreshToken: { type: String, default: null },
  wishlist:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Perfume' }],
  addresses: [addressSchema]
}, { timestamps: true });

userSchema.index({ googleId: 1 });
userSchema.index({ resetPasswordToken: 1 });

module.exports = mongoose.model('User', userSchema);