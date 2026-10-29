/**
 * FIFO Batch Deduction Utility
 * ────────────────────────────
 * Deducts order quantities from CostRecord batches for each perfume,
 * consuming the oldest batch first (First-In, First-Out).
 *
 * Returns a ledger of deductions so they can be reversed on cancellation.
 */

const CostRecord = require('../models/CostRecord');

/**
 * Deduct `quantity` bottles from a perfume's cost batches using FIFO.
 *
 * @param {Array<{ perfumeId: string|ObjectId, quantity: number }>} items
 *   The order items (items without perfumeId are skipped).
 * @param {mongoose.ClientSession|null} session
 *   Optional Mongoose session for transactional safety.
 *
 * @returns {Promise<Array<{ batchId: string, perfumeId: string, qty: number }>>}
 *   A ledger of which batches were reduced by how many bottles.
 *   Store this on the Order so it can be reversed on cancellation.
 */
const deductFifoBatches = async (items, session = null) => {
  const deductions = []; // ledger returned to caller

  // Group quantities by perfumeId to handle multiple line-items of the same perfume
  const qtyByPerfume = {};
  for (const item of items) {
    if (!item.perfumeId) continue;
    const pid = item.perfumeId.toString();
    qtyByPerfume[pid] = (qtyByPerfume[pid] || 0) + (item.quantity || 1);
  }

  for (const [perfumeId, totalQty] of Object.entries(qtyByPerfume)) {
    let remaining = totalQty;

    // Fetch all batches for this perfume that still have stock, oldest first (FIFO)
    const batches = await CostRecord.find(
      { perfumeId, remainingBottles: { $gt: 0 } },
      null,
      { session }
    ).sort({ createdAt: 1 }); // ascending = oldest first

    for (const batch of batches) {
      if (remaining <= 0) break;

      const available = batch.remainingBottles ?? batch.bottlesProduced;
      const take      = Math.min(available, remaining);

      batch.remainingBottles = available - take;
      await batch.save({ session });

      deductions.push({
        batchId:   batch._id.toString(),
        perfumeId,
        qty:       take,
      });

      remaining -= take;
    }

    // If more bottles were ordered than exist in any batch, we still proceed
    // (the Perfume stock guard in orderRoutes already validated availability).
    // Remaining > 0 here simply means cost batches don't fully cover the order —
    // log it but don't throw (avoids blocking real orders over missing cost records).
    if (remaining > 0) {
      console.warn(
        `[FIFO] Perfume ${perfumeId}: ${remaining} bottle(s) could not be deducted from cost batches ` +
        `(no batch with remaining stock). Order proceeds; cost records may be out of sync.`
      );
    }
  }

  return deductions;
};

/**
 * Restore previously deducted batch quantities (used on order cancellation).
 *
 * @param {Array<{ batchId: string, qty: number }>} deductions
 *   The ledger returned by a prior call to deductFifoBatches.
 * @param {mongoose.ClientSession|null} session
 */
const restoreFifoBatches = async (deductions, session = null) => {
  if (!deductions || deductions.length === 0) return;

  for (const entry of deductions) {
    await CostRecord.findByIdAndUpdate(
      entry.batchId,
      { $inc: { remainingBottles: entry.qty } },
      { session }
    );
  }
};

module.exports = { deductFifoBatches, restoreFifoBatches };

