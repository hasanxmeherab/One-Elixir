const mongoose = require('mongoose');

// ✅ FEATURE #6: Cache for precomputed product recommendations
const recommendationCacheSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Perfume',
    required: true,
    index: true 
  },
  
  // Type of recommendation: content-based, collaborative, or hybrid
  type: {
    type: String,
    enum: ['content', 'collaborative', 'hybrid'],
    default: 'hybrid',
    index: true
  },

  // Array of recommended products ranked by score
  recommendations: [
    {
      productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Perfume',
        required: true 
      },
      score: { 
        type: Number, 
        min: 0, 
        max: 1,
        required: true 
      },
      reason: { // Why recommended: "Similar scent", "Frequently bought with", etc.
        type: String,
        enum: ['similar_scent', 'frequently_bought', 'user_preference', 'trending'],
        default: 'frequently_bought'
      },
      details: String // Extra info: "2 users bought together" or "shared 3 scent tags"
    }
  ],

  // Metadata
  computedAt: { type: Date, default: Date.now },
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  }
});

// ✅ TTL Index: Auto-delete after 24 hours
recommendationCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ✅ Compound index for efficient queries
recommendationCacheSchema.index({ productId: 1, type: 1 });

module.exports = mongoose.model('RecommendationCache', recommendationCacheSchema);
