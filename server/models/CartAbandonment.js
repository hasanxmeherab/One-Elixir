const mongoose = require('mongoose');

// ✅ FEATURE #5: Track abandoned carts and recovery emails
const cartAbandonmentSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  userName: { type: String },
  cartItems: [
    {
      perfumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Perfume' },
      name: String,
      price: Number,
      quantity: Number,
      image: String,
      variantLabel: String
    }
  ],
  cartTotal: { type: Number, required: true },
  lastActivityAt: { type: Date, default: Date.now },
  emailSentAt: { type: Date, default: null },
  recoveredAt: { type: Date, default: null },  // When user completes purchase
  recoveredOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  recoveryToken: { type: String, unique: true, sparse: true },  // For email link
  couponCode: String,  // Discount code sent in email (e.g., "COMEBACK10")
  couponDiscount: { type: Number, default: 10 },  // 10% discount
  status: {
    type: String,
    enum: ['active', 'recovery_email_sent', 'recovered', 'expired'],
    default: 'active'
  },
  reminderCount: { type: Number, default: 0 },  // How many reminders sent
  maxReminders: { type: Number, default: 2 },  // Max 2 reminder emails
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } // 7 days
});

// ✅ Index for efficient queries
cartAbandonmentSchema.index({ userEmail: 1 });
cartAbandonmentSchema.index({ status: 1 });
cartAbandonmentSchema.index({ createdAt: -1 });

// ✅ TTL index: Auto-delete after expiry
cartAbandonmentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('CartAbandonment', cartAbandonmentSchema);
