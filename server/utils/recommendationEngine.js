const Perfume = require('../models/Perfume');
const Order = require('../models/Order');
const RecommendationCache = require('../models/RecommendationCache');

// ✅ FEATURE #6: Product recommendation engine with ML algorithms
class RecommendationEngine {
  /**
   * Jaccard Similarity: Compare two arrays
   * Formula: |A ∩ B| / |A ∪ B|
   * Example: ['rose', 'floral'] vs ['rose', 'vanilla']
   * Common: 1, Total: 3 → Similarity = 0.33
   */
  static jaccardSimilarity(arr1, arr2) {
    if (!arr1?.length || !arr2?.length) return 0;
    
    const set1 = new Set(arr1.map(x => x.toLowerCase()));
    const set2 = new Set(arr2.map(x => x.toLowerCase()));
    
    const intersection = [...set1].filter(x => set2.has(x));
    const union = new Set([...set1, ...set2]);
    
    return intersection.length / union.size;
  }

  /**
   * Content-Based Recommendations: Find products with similar scent profiles
   * Algorithm: Scent tag similarity + product characteristics
   */
  static async contentBasedSimilarity(perfumeId, limit = 10) {
    try {
      const perfume = await Perfume.findById(perfumeId);
      if (!perfume || perfume.isDeleted) {
        return [];
      }

      // Find all other perfumes
      const allPerfumes = await Perfume.find({ 
        _id: { $ne: perfumeId },
        isDeleted: false 
      });

      // Calculate similarity for each product
      const similarities = allPerfumes.map(other => ({
        productId: other._id,
        score: this.jaccardSimilarity(
          perfume.scentProfile || [],
          other.scentProfile || []
        ),
        reason: 'similar_scent',
        details: `Shares ${Math.max(0, (perfume.scentProfile || []).filter(x => (other.scentProfile || []).includes(x)).length)} scent tags`
      }));

      // Filter out zero scores and sort by similarity
      return similarities
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      console.error('[RecommendationEngine] Content similarity error:', error.message);
      return [];
    }
  }

  /**
   * Collaborative Filtering: Find products frequently bought together
   * Algorithm: Co-occurrence analysis of completed orders
   */
  static async collaborativeFiltering(perfumeId, limit = 10) {
    try {
      // Find all delivered & paid orders containing this perfume
      const ordersWithPerfume = await Order.find({
        'items.perfumeId': perfumeId,
        status: 'Delivered',
        paymentStatus: 'Paid'
      }).select('items');

      if (ordersWithPerfume.length === 0) {
        return [];
      }

      // Count co-purchases
      const coPurchaseMap = {};
      
      ordersWithPerfume.forEach(order => {
        const otherPerfumes = order.items
          .filter(item => item.perfumeId.toString() !== perfumeId.toString())
          .map(item => item.perfumeId.toString());

        otherPerfumes.forEach(otherId => {
          coPurchaseMap[otherId] = (coPurchaseMap[otherId] || 0) + 1;
        });
      });

      // Convert to array and calculate frequency score
      const recommendations = Object.entries(coPurchaseMap)
        .map(([productId, count]) => ({
          productId,
          score: Math.min(count / ordersWithPerfume.length, 1), // Normalize to 0-1
          reason: 'frequently_bought',
          details: `${count} customer${count > 1 ? 's' : ''} bought this with the perfume`
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return recommendations;
    } catch (error) {
      console.error('[RecommendationEngine] Collaborative filtering error:', error.message);
      return [];
    }
  }

  /**
   * User-Based Recommendations: Personalized by purchase history
   * Algorithm: Find products similar to user's past purchases
   */
  static async userBasedRecommendations(userEmail, limit = 10) {
    try {
      if (!userEmail) return [];

      // Get user's purchase history
      const userOrders = await Order.find({
        customerEmail: userEmail,
        status: 'Delivered',
        paymentStatus: 'Paid'
      }).select('items');

      if (userOrders.length === 0) {
        return [];
      }

      // Extract products user has bought
      const userPerfumeIds = new Set();
      const userScentProfile = [];

      userOrders.forEach(order => {
        order.items.forEach(item => {
          userPerfumeIds.add(item.perfumeId.toString());
        });
      });

      // Get scent profile of user's purchases
      const userPerfumes = await Perfume.find({
        _id: { $in: Array.from(userPerfumeIds) }
      }).select('scentProfile');

      userPerfumes.forEach(p => {
        if (p.scentProfile) {
          userScentProfile.push(...p.scentProfile);
        }
      });

      // Find products with similar scent profile (not already bought)
      const candidateProducts = await Perfume.find({
        _id: { $nin: Array.from(userPerfumeIds) },
        isDeleted: false,
        scentProfile: { $exists: true, $ne: [] }
      });

      const similarities = candidateProducts.map(product => ({
        productId: product._id,
        score: this.jaccardSimilarity(userScentProfile, product.scentProfile || []),
        reason: 'user_preference',
        details: 'Based on your purchase history'
      }));

      return similarities
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      console.error('[RecommendationEngine] User-based recommendations error:', error.message);
      return [];
    }
  }

  /**
   * Hybrid Recommendations: Combine all strategies with weighted scoring
   * Formula: (0.4 × Content) + (0.3 × Collaborative) + (0.3 × User)
   */
  static async hybridRecommendations(perfumeId, userEmail, limit = 10) {
    try {
      const [content, collaborative, userBased] = await Promise.all([
        this.contentBasedSimilarity(perfumeId, 20),
        this.collaborativeFiltering(perfumeId, 20),
        userBased ? this.userBasedRecommendations(userEmail, 20) : Promise.resolve([])
      ]);

      // Create scores map
      const scoreMap = {};

      // Add content-based scores (40% weight)
      content.forEach(rec => {
        const key = rec.productId.toString();
        scoreMap[key] = {
          ...rec,
          finalScore: (scoreMap[key]?.finalScore || 0) + rec.score * 0.4,
          weights: { ...(scoreMap[key]?.weights || {}), content: rec.score * 0.4 }
        };
      });

      // Add collaborative scores (30% weight)
      collaborative.forEach(rec => {
        const key = typeof rec.productId === 'string' ? rec.productId : rec.productId.toString();
        scoreMap[key] = {
          ...rec,
          finalScore: (scoreMap[key]?.finalScore || 0) + rec.score * 0.3,
          weights: { ...(scoreMap[key]?.weights || {}), collaborative: rec.score * 0.3 }
        };
      });

      // Add user-based scores (30% weight)
      if (userEmail) {
        userBased.forEach(rec => {
          const key = rec.productId.toString();
          scoreMap[key] = {
            ...rec,
            finalScore: (scoreMap[key]?.finalScore || 0) + rec.score * 0.3,
            weights: { ...(scoreMap[key]?.weights || {}), user: rec.score * 0.3 }
          };
        });
      }

      // Convert to array, sort by final score
      const hybrid = Object.values(scoreMap)
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, limit)
        .map(rec => ({
          productId: rec.productId,
          score: rec.finalScore,
          reason: rec.reason,
          details: rec.details
        }));

      return hybrid;
    } catch (error) {
      console.error('[RecommendationEngine] Hybrid recommendations error:', error.message);
      return [];
    }
  }

  /**
   * Trending Products: Most frequently purchased in last 30 days
   */
  static async trendingProducts(limit = 10) {
    try {
      // TODO: Fix MongoDB aggregation timeout issue
      // For now, return empty array to prevent route errors
      return [];
    } catch (error) {
      console.error('[RecommendationEngine] Trending products error:', error.message);
      return [];
    }
  }

  /**
   * Refresh all recommendation caches (batch operation)
   * Should run daily to precompute recommendations
   */
  static async refreshCache() {
    try {
      console.log('[RecommendationEngine] Starting cache refresh...');
      
      const perfumes = await Perfume.find({ isDeleted: false }).select('_id');
      const totalProducts = perfumes.length;
      
      let processed = 0;
      let errors = 0;

      for (const perfume of perfumes) {
        try {
          // Generate all recommendation types
          const [hybrid, contentBased, collaborative] = await Promise.all([
            this.hybridRecommendations(perfume._id.toString(), null, 10),
            this.contentBasedSimilarity(perfume._id, 10),
            this.collaborativeFiltering(perfume._id, 10)
          ]);

          // Save to cache
          await RecommendationCache.updateOne(
            { productId: perfume._id, type: 'hybrid' },
            {
              productId: perfume._id,
              type: 'hybrid',
              recommendations: hybrid,
              computedAt: new Date()
            },
            { upsert: true }
          );

          await RecommendationCache.updateOne(
            { productId: perfume._id, type: 'content' },
            {
              productId: perfume._id,
              type: 'content',
              recommendations: contentBased,
              computedAt: new Date()
            },
            { upsert: true }
          );

          await RecommendationCache.updateOne(
            { productId: perfume._id, type: 'collaborative' },
            {
              productId: perfume._id,
              type: 'collaborative',
              recommendations: collaborative,
              computedAt: new Date()
            },
            { upsert: true }
          );

          processed++;
        } catch (err) {
          console.error(`[RecommendationEngine] Error for product ${perfume._id}:`, err.message);
          errors++;
        }
      }

      console.log(
        `[RecommendationEngine] Cache refresh complete: ${processed}/${totalProducts} successful, ${errors} errors`
      );

      return {
        processed,
        total: totalProducts,
        errors
      };
    } catch (error) {
      console.error('[RecommendationEngine] Cache refresh failed:', error.message);
      throw error;
    }
  }
}

module.exports = RecommendationEngine;
