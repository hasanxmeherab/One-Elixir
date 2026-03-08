const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const { verifyAdmin } = require('../middleware/authMiddleware');
const { validate, createExpenseSchema } = require('../middleware/validate');

// GET all expenses (admin only)
router.get('/', verifyAdmin, async (req, res) => {
    try {
        if (req.query.page) {
            const page = parseInt(req.query.page);
            const limit = Math.min(parseInt(req.query.limit) || 50, 100);
            const skip = (page - 1) * limit;
            const total = await Expense.countDocuments();
            const expenses = await Expense.find().sort({ date: -1 }).skip(skip).limit(limit);
            return res.json({ expenses, total, page, pages: Math.ceil(total / limit) });
        }
        const expenses = await Expense.find().sort({ date: -1 });
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST new expense (admin only)
router.post('/', verifyAdmin, validate(createExpenseSchema), async (req, res) => {
    try {
        const expense = new Expense(req.body);
        const newExpense = await expense.save();
        res.status(201).json(newExpense);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE expense (admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        await Expense.findByIdAndDelete(req.params.id);
        res.json({ message: "Expense record removed" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;