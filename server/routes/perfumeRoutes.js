const express = require('express');
const router = express.Router();
const Perfume = require('../models/Perfume');

// GET all perfumes
router.get('/', async (req, res) => {
    try {
        const perfumes = await Perfume.find();
        res.json(perfumes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET a single perfume by ID (NEW)
router.get('/:id', async (req, res) => {
    try {
        const perfume = await Perfume.findById(req.params.id);
        if (!perfume) return res.status(404).json({ message: "Elixir not found" });
        res.json(perfume);
    } catch (err) {
        // This handles cases where the ID format is invalid
        res.status(500).json({ message: err.message });
    }
});

// POST a new perfume
router.post('/', async (req, res) => {
    const perfume = new Perfume({
        name: req.body.name,
        price: req.body.price,
        description: req.body.description,
        scentProfile: req.body.scentProfile,
        image: req.body.image
    });

    try {
        const newPerfume = await perfume.save();
        res.status(201).json(newPerfume);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE a perfume
router.delete('/:id', async (req, res) => {
    try {
        await Perfume.findByIdAndDelete(req.params.id);
        res.json({ message: "Product removed from collection" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// UPDATE a perfume
router.put('/:id', async (req, res) => {
    try {
        const updatedPerfume = await Perfume.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true } // Returns the modified document rather than the original
        );
        res.json(updatedPerfume);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;