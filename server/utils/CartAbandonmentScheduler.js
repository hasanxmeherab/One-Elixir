const cron = require('node-cron');
const CartAbandonment = require('../models/CartAbandonment');
const axios = require('axios');

// ✅ FEATURE #5: Scheduled cart abandonment recovery emails
class CartAbandonmentScheduler {
  static startScheduler() {
    // Run every day at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('[CartAbandonmentScheduler] Running daily cart recovery check...');
      try {
        await CartAbandonmentScheduler.sendRecoveryEmails();
        console.log('[CartAbandonmentScheduler] Recovery emails sent successfully');
      } catch (error) {
        console.error('[CartAbandonmentScheduler] Error:', error.message);
      }
    });

    // Alternatively, for testing: 5 seconds after server start
    // setTimeout(async () => {
    //   console.log('[CartAbandonmentScheduler] TEST: Running immediately...');
    //   await CartAbandonmentScheduler.sendRecoveryEmails();
    // }, 5000);
  }

  static async sendRecoveryEmails() {
    try {
      // Find carts abandoned > 24 hours ago that haven't had recovery email yet
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

      const eligibleCarts = await CartAbandonment.find({
        $or: [
          {
            status: 'active',
            lastActivityAt: { $lte: twentyFourHoursAgo },
            reminderCount: 0
          },
          {
            status: 'recovery_email_sent',
            lastActivityAt: { $lte: fortyEightHoursAgo },
            reminderCount: 1
          }
        ]
      });

      console.log(`[CartAbandonmentScheduler] Found ${eligibleCarts.length} eligible carts for recovery emails`);

      // ✅ Send email for each eligible cart
      let sentCount = 0;
      for (const cart of eligibleCarts) {
        try {
          const sendEndpoint = `${process.env.API_URL || 'http://localhost:5000'}/api/cart-abandonment/${cart._id}/send-recovery-email`;
          await axios.post(sendEndpoint, {});
          sentCount++;
          console.log(`[CartAbandonmentScheduler] Email sent to ${cart.userEmail}`);
        } catch (error) {
          console.error(`[CartAbandonmentScheduler] Failed for ${cart.userEmail}:`, error.message);
        }
      }

      console.log(`[CartAbandonmentScheduler] Successfully sent ${sentCount}/${eligibleCarts.length} recovery emails`);

      // ✅ Clean up expired carts (older than 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const result = await CartAbandonment.updateMany(
        {
          status: { $ne: 'recovered' },
          createdAt: { $lte: sevenDaysAgo }
        },
        { $set: { status: 'expired' } }
      );

      console.log(`[CartAbandonmentScheduler] Marked ${result.modifiedCount} old carts as expired`);
    } catch (error) {
      console.error('[CartAbandonmentScheduler] Scheduler error:', error.message);
    }
  }
}

module.exports = CartAbandonmentScheduler;
