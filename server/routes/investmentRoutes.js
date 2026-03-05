const express = require('express');
const router = express.Router();
const Investment = require('../models/Investment');
const { verifyAdmin } = require('../middleware/authMiddleware');
const { validate, addInvestmentSchema } = require('../middleware/validate');

// 1. GET Names for dropdown (admin only)
router.get('/names', verifyAdmin, async (req, res) => {
  try {
    const investors = await Investment.find({}, 'investorName');
    res.json(investors);
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
});

// 2. GET All data (admin only)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    if (req.query.page) {
      const page = parseInt(req.query.page);
      const limit = parseInt(req.query.limit) || 50;
      const skip = (page - 1) * limit;
      const total = await Investment.countDocuments();
      const investments = await Investment.find().sort({ lastUpdated: -1 }).skip(skip).limit(limit);
      const sanitizedData = investments.map(inv => ({
        ...inv._doc,
        totalAmount: Number(inv.totalAmount) || 0,
        transactions: inv.transactions || []
      }));
      return res.json({ investments: sanitizedData, total, page, pages: Math.ceil(total / limit) });
    }
    const investments = await Investment.find().sort({ lastUpdated: -1 });
    const sanitizedData = investments.map(inv => ({
      ...inv._doc,
      totalAmount: Number(inv.totalAmount) || 0,
      transactions: inv.transactions || []
    }));
    res.json(sanitizedData);
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
});

// 3. POST Add/Update Investment (admin only)
router.post('/add', verifyAdmin, validate(addInvestmentSchema), async (req, res) => {
  const { investorName, amount, note, date } = req.body;
  try {
    let investment = await Investment.findOne({ 
      investorName: { $regex: new RegExp("^" + investorName + "$", "i") } 
    });

    // Ensure we use the date selected by Admin, or fallback to Today
    const customDate = date ? new Date(date) : new Date();
    const numericAmount = Number(amount) || 0;

    if (investment) {
      // Update existing investor
      investment.transactions.push({ 
        amount: numericAmount, 
        note: note || "Capital Injection", 
        date: customDate 
      });
      
      // Safety: Ensure we aren't adding to a NaN value
      const currentTotal = Number(investment.totalAmount) || 0;
      investment.totalAmount = currentTotal + numericAmount;
      
      investment.lastUpdated = Date.now();
      await investment.save();
      res.json(investment);
    } else {
      // Create new investor
      const newInv = new Investment({
        investorName,
        totalAmount: numericAmount,
        transactions: [{ 
          amount: numericAmount, 
          note: note || "Initial Investment", 
          date: customDate 
        }]
      });
      await newInv.save();
      res.status(201).json(newInv);
    }
  } catch (err) { 
    res.status(400).json({ message: err.message }); 
  }
});

// 4. DELETE Specific Transaction (admin only)
router.delete('/:investorId/transaction/:transactionId', verifyAdmin, async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.investorId);
    if (!investment) return res.status(404).json({ message: "Investor not found" });

    const transaction = investment.transactions.id(req.params.transactionId);
    if (transaction) {
      const currentTotal = Number(investment.totalAmount) || 0;
      investment.totalAmount = currentTotal - (Number(transaction.amount) || 0);
      
      investment.transactions.pull(req.params.transactionId);
      await investment.save();
    }
    res.json({ message: "Transaction removed and total recalculated" });
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
});

module.exports = router;