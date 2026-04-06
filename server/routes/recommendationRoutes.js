const express = require('express');
const router = express.Router();
const RecommendationEngine = require('../utils/recommendationEngine');
const RecommendationCache = require('../models/RecommendationCache');
const Perfume = require('../models/Perfume');
const { verifyAdmin } = require('../middleware/authMiddleware');

console.log('[RecommendationRoutes] Module loaded, registering routes...');

// ✅ FEATURE #6: POST admin endpoint - Manually trigger cache refresh
router.post('/admin/cache/refresh', verifyAdmin, async (req, res) => {
  try {
    const result = await RecommendationEngine.refreshCache();

    res.json({
      message: 'Cache refresh completed',
      processed: result.processed,
      total: result.total,
      errors: result.errors
    });
  } catch (err) {
    console.error('[RecommendationRoutes] Cache refresh error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ✅ FEATURE #6: GET admin stats - Recommendation coverage & quality
router.get('/admin/stats', verifyAdmin, async (req, res) => {
  try {
    const totalProducts = await Perfume.countDocuments({ isDeleted: false });
    const productsWithRecs = await RecommendationCache.aggregate([
      {
        $group: {
          _id: '$productId',
          types: { $push: '$type' }
        }
      },
      {
        $match: {
          types: { $eq: ['collaborative', 'content', 'hybrid'] }
        }
      },
      { $count: 'total' }
    ]);

    const coverage = productsWithRecs[0]?.total || 0;
    const coveragePercentage = totalProducts > 0 ? (coverage / totalProducts) * 100 : 0;

    // Average recommendation scores
    const avgScores = await RecommendationCache.aggregate([
      {
        $unwind: '$recommendations'
      },
      {
        $group: {
          _id: '$type',
          avgScore: { $avg: '$recommendations.score' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      overview: {
        totalProducts,
        productsWithRecommendations: coverage,
        coveragePercentage: coveragePercentage.toFixed(2)
      },
      qualityMetrics: avgScores,
      recommendations: 'Focus on growing scent profile diversity for better content-based recommendations'
    });
  } catch (err) {
    console.error('[RecommendationRoutes] Stats error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ✅ FEATURE #6: GET trending products (no auth required)
router.get('/trending/products', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const trending = await RecommendationEngine.trendingProducts(parseInt(limit));

    // Populate product details
    const enrichedTrending = await Promise.all(
      trending.map(async rec => {
        const product = await Perfume.findById(rec.productId).select(
          'name slug price image scentProfile flashSale variants'
        );
        return {
          ...rec,
          product
        };
      })
    );

    res.json({
      recommendations: enrichedTrending,
      type: 'trending',
      period: 'last_30_days'
    });
  } catch (err) {
    console.error('[RecommendationRoutes] Trending products error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ✅ FEATURE #6: GET personalized recommendations for logged-in user
router.get('/user/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    const { limit = 5 } = req.query;

    const recommendations = await RecommendationEngine.userBasedRecommendations(
      userEmail,
      parseInt(limit)
    );

    // Populate product details
    const enrichedRecs = await Promise.all(
      recommendations.map(async rec => {
        const product = await Perfume.findById(rec.productId).select(
          'name slug price image scentProfile flashSale variants'
        );
        return {
          ...rec,
          product
        };
      })
    );

    res.json({
      userEmail,
      recommendations: enrichedRecs,
      type: 'user_personalized'
    });
  } catch (err) {
    console.error('[RecommendationRoutes] User recommendations error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ✅ FEATURE #6: GET recommendations for a specific product (must be last for generic :param)
router.get('/:perfumeId', async (req, res) => {
  try {
    const { perfumeId } = req.params;
    const { type = 'hybrid', limit = 5, userEmail = null } = req.query;

    // Validate perfume exists
    const perfume = await Perfume.findById(perfumeId);
    if (!perfume || perfume.isDeleted) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Try to get from cache first
    const cached = await RecommendationCache.findOne({
      productId: perfumeId,
      type: type
    });

    let recommendations = [];
    let isCached = false;

    if (cached) {
      recommendations = cached.recommendations;
      isCached = true;

      // If cache exists but expired, regenerate in background (don't wait)
      if (cached.expiresAt < new Date()) {
        RecommendationEngine[
          type === 'content'
            ? 'contentBasedSimilarity'
            : type === 'collaborative'
              ? 'collaborativeFiltering'
              : 'hybridRecommendations'
        ]
          .call(RecommendationEngine, perfumeId, userEmail, parseInt(limit))
          .then(recs => {
            RecommendationCache.updateOne(
              { _id: cached._id },
              { recommendations: recs, computedAt: new Date() }
            ).catch(err => console.error('Cache update failed:', err));
          })
          .catch(err => console.error('Background cache refresh failed:', err));
      }
    } else {
      // Generate on demand
      if (type === 'content') {
        recommendations = await RecommendationEngine.contentBasedSimilarity(perfumeId, parseInt(limit));
      } else if (type === 'collaborative') {
        recommendations = await RecommendationEngine.collaborativeFiltering(perfumeId, parseInt(limit));
      } else {
        recommendations = await RecommendationEngine.hybridRecommendations(
          perfumeId,
          userEmail,
          parseInt(limit)
        );
      }

      // Save to cache for next time
      if (recommendations.length > 0) {
        RecommendationCache.updateOne(
          { productId: perfumeId, type: type },
          {
            productId: perfumeId,
            type: type,
            recommendations: recommendations,
            computedAt: new Date()
          },
          { upsert: true }
        ).catch(err => console.error('Could not cache recommendations:', err));
      }
    }

    // Populate product details for recommendations
    const enrichedRecs = await Promise.all(
      recommendations.map(async rec => {
        const product = await Perfume.findById(rec.productId).select(
          'name slug price image scentProfile flashSale variants'
        );
        return {
          ...rec,
          product
        };
      })
    );

    res.json({
      perfumeId,
      recommendations: enrichedRecs,
      type,
      isCached,
      cacheExpiresAt: cached?.expiresAt || null
    });
  } catch (err) {
    console.error('[RecommendationRoutes] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
