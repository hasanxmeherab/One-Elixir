const express = require('express');
const router = express.Router();
const Investment = require('../models/Investment');

// 1. GET Names for dropdown
router.get('/names', async (req, res) => {
  try {
    const investors = await Investment.find({}, 'investorName');
    res.json(investors);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// 2. GET All data
router.get('/', async (req, res) => {
  try {
    const investments = await Investment.find().sort({ lastUpdated: -1 });
    res.json(investments);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// 3. POST Add/Update Investment
router.post('/add', async (req, res) => {
  const { investorName, amount, note, date } = req.body;
  try {
    let investment = await Investment.findOne({ 
      investorName: { $regex: new RegExp("^" + investorName + "$", "i") } 
    });

    const customDate = date ? new Date(date) : new Date();

    if (investment) {
      investment.transactions.push({ amount: Number(amount), note, date: customDate });
      investment.totalAmount += Number(amount);
      investment.lastUpdated = Date.now();
      await investment.save();
      res.json(investment);
    } else {
      const newInv = new Investment({
        investorName,
        totalAmount: Number(amount),
        transactions: [{ amount: Number(amount), note, date: customDate }]
      });
      await newInv.save();
      res.status(201).json(newInv);
    }
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// 4. DELETE Specific Transaction
router.delete('/:investorId/transaction/:transactionId', async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.investorId);
    if (!investment) return res.status(404).json({ message: "Investor not found" });

    const transaction = investment.transactions.id(req.params.transactionId);
    if (transaction) {
      investment.totalAmount -= transaction.amount;
      investment.transactions.pull(req.params.transactionId);
      await investment.save();
    }
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;