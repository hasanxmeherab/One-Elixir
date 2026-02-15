const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Add this for token generation
const sendEmail = require('../utils/sendEmail'); // Ensure you have this helper

// SIGN UP (Instant Login Kept)
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

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

// --- NEW: FORGOT PASSWORD ROUTE ---
router.post('/forgot-password', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "No account found with that email." });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiry
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const message = `You requested a password reset. Click here to set a new password: ${resetUrl}`;

    await sendEmail({
      email: user.email,
      subject: 'OneElixir Password Reset',
      message
    });

    res.json({ message: "Reset link sent to your email." });
  } catch (err) {
    res.status(500).json({ message: "Error sending reset email." });
  }
});

// --- NEW: RESET PASSWORD ROUTE ---
router.post('/reset-password/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token." });

    user.password = await bcrypt.hash(req.body.password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password updated successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Error resetting password." });
  }
});

module.exports = router;