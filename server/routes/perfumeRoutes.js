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

// RESTORE STOCK (New: Added for Archive functionality)
// This adds quantity back to a perfume's stock when an order is deleted
router.put('/restore-stock', async (req, res) => {
    try {
        const { id, quantity } = req.body;
        const perfume = await Perfume.findById(id);
        
        if (!perfume) return res.status(404).json({ message: "Perfume not found" });

        // Update the stock count
        perfume.stock = (Number(perfume.stock) || 0) + Number(quantity);
        await perfume.save();

        res.json({ message: "Stock successfully restored", newStock: perfume.stock });
    } catch (err) {
        res.status(500).json({ message: "Error restoring stock", error: err.message });
    }
});

// GET a single perfume by ID
router.get('/:id', async (req, res) => {
    try {
        const perfume = await Perfume.findById(req.params.id);
        if (!perfume) return res.status(404).json({ message: "Elixir not found" });
        res.json(perfume);
    } catch (err) {
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
        image: req.body.image,
        stock: req.body.stock || 0 // Ensure stock is handled on creation
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
            { new: true }
        );
        res.json(updatedPerfume);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;