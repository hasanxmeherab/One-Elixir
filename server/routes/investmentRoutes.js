const express = require('express');
const router = express.Router();
const Investment = require('../models/Investment');

router.get('/', async (req, res) => {
    try {
        const investments = await Investment.find().sort({ date: -1 });
        res.json(investments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const investment = new Investment(req.body);
        const newInvestment = await investment.save();
        res.status(201).json(newInvestment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await Investment.findByIdAndDelete(req.params.id);
        res.json({ message: "Record deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;