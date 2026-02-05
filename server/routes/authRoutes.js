const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// SIGN UP (Updated to support instant login)
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

    // Generate token so they are logged in immediately
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Send back the token and user info
    res.status(201).json({ 
      token, 
      user: { name: user.name, email: user.email } 
    });
  } catch (err) { 
    res.status(400).json({ message: "Registration failed", error: err.message }); 
  }
});

// SIGN IN (Kept your working logic)
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
      res.json({ token, user: { name: user.name, email: user.email } });
    } else {
      res.status(401).json("Invalid credentials");
    }
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;