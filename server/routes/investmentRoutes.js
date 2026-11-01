const express = require('express');
const router = express.Router();
const Investment = require('../models/Investment');
const { verifyAdmin } = require('../middleware/authMiddleware');
const { validate, addInvestmentSchema } = require('../middleware/validate');
const investmentInput = require('../utils/investmentInput');
const writeLog = require('../utils/writeLog');

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
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
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
    console.error('Investment GET error:', err);
    res.status(500).json({ message: err.message }); 
  }
});

// 3. POST Add/Update Investment (admin only)
router.post('/add', verifyAdmin, validate(addInvestmentSchema), async (req, res) => {
  try {
    const { investorName, amount: numericAmount, note, date: customDate, namePattern } = investmentInput(req.body);
    let investment = await Investment.findOne({ 
      investorName: { $regex: namePattern }
    });

    // Ensure we use the date selected by Admin, or fallback to Today

    if (investment) {
      if (numericAmount === 0) return res.status(409).json({ message: 'This investor already exists. Select their account to record a transaction.' });
      // Update existing investor
      investment.transactions.push({ 
        amount: numericAmount, 
        note,
        date: customDate 
      });
      
      // Safety: Ensure we aren't adding to a NaN value
      const currentTotal = Number(investment.totalAmount) || 0;
      investment.totalAmount = Math.round((currentTotal + numericAmount) * 100) / 100;
      
      investment.lastUpdated = Date.now();
      await investment.save();
      await writeLog(req, 'ADD_INVESTMENT', 'Investment', `${investorName}: ${numericAmount} TK`);
      res.json(investment);
    } else {
      // Create new investor
      const newInv = new Investment({
        investorName,
        totalAmount: numericAmount,
        transactions: numericAmount === 0 ? [] : [{
          amount: numericAmount, 
          note: note || "Initial Investment", 
          date: customDate 
        }]
      });
      await newInv.save();
      await writeLog(req, 'ADD_INVESTMENT', 'Investment', `Created investor ${investorName}: ${numericAmount} TK`);
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
      investment.totalAmount = Math.round((currentTotal - (Number(transaction.amount) || 0)) * 100) / 100;
      
      investment.transactions.pull(req.params.transactionId);
      await investment.save();
      await writeLog(req, 'DELETE_INVESTMENT_TRANSACTION', 'Investment', `${investment.investorName}: removed ${transaction.amount} TK`);
    } else return res.status(404).json({ message: 'Transaction not found.' });
    res.json({ message: "Transaction removed and total recalculated" });
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
});

module.exports = router;
