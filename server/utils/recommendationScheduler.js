const cron = require('node-cron');
const RecommendationEngine = require('./recommendationEngine');

// ✅ FEATURE #6: Daily recommendation cache refresh scheduler
class RecommendationScheduler {
  static startScheduler() {
    // Run every day at 3 AM (after cart abandonment scheduler at 2 AM)
    cron.schedule('0 3 * * *', async () => {
      console.log('[RecommendationScheduler] Running daily cache refresh...');
      try {
        const result = await RecommendationEngine.refreshCache();
        console.log(
          `[RecommendationScheduler] ✅ Cache refresh complete: ${result.processed} products, ${result.errors} errors`
        );
      } catch (error) {
        console.error('[RecommendationScheduler] Error:', error.message);
      }
    });

    console.log('✅ Recommendation Scheduler started (runs daily at 3 AM)');

    // Optionally, for testing: run immediately after startup (comment out in production)
    // setTimeout(async () => {
    //   console.log('[RecommendationScheduler] TEST: Running immediately...');
    //   await RecommendationEngine.refreshCache();
    // }, 10000);
  }
}

module.exports = RecommendationScheduler;
