const router = require('express').Router();
const { verifyAdmin } = require('../middleware/authMiddleware');
const { dashboardRange, dashboardMetrics } = require('../utils/dashboardMetrics');
const Order = require('../models/Order');
const Perfume = require('../models/Perfume');
const Expense = require('../models/Expense');
const Investment = require('../models/Investment');
const PaymentLedger = require('../models/PaymentLedger');
const Settlement = require('../models/Settlement');
const Admin = require('../models/Admin');
const SystemConfig = require('../models/SystemConfig');

router.get('/', verifyAdmin, async (req, res) => {
  let range;
  try { range = dashboardRange(req.query); }
  catch (error) { return res.status(400).json({ message: error.message }); }
  try {
    const superadmin = req.admin.role === 'superadmin';
    const [orders, products, expenses, investors, ledger, settlements, admins, reset] = await Promise.all([
      Order.find().lean(), Perfume.find({ isDeleted: { $ne: true } }).lean(),
      superadmin ? Expense.find().lean() : Expense.find().select('amount').lean(),
      superadmin ? Investment.find().lean() : Investment.find().select('totalAmount').lean(),
      PaymentLedger.find(superadmin ? {} : { adminId: req.admin.id }).lean(),
      Settlement.find({ status: 'pending', ...(superadmin ? {} : { adminId: req.admin.id }) }).lean(),
      superadmin ? Admin.find().select('_id name role').lean() : [], SystemConfig.findOne({ key: 'ledgerResetAt' }).lean(),
    ]);
    res.set('Cache-Control', 'no-store');
    res.json(dashboardMetrics({ orders, products, expenses, investors, ledger, settlements, admins, viewer: req.admin, range, resetAt: reset?.value || null }));
  } catch { res.status(500).json({ message: 'Could not load dashboard. Please try again.' }); }
});
module.exports = router;
