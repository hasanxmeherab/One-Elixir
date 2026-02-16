const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// SIGN UP
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({ token, user: { name: user.name, email: user.email } });
  } catch (err) { 
    res.status(400).json({ message: "Registration failed", error: err.message }); 
  }
});

// SIGN IN
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

// --- FORGOT PASSWORD ---
router.post('/forgot-password', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "No account found with that email." });

    // Generate Token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Save to User Document
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Construct URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const htmlMessage = `
    <div style="font-family: 'Playfair Display', serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 40px; text-align: center; color: #1a1a1a;">
      <h1 style="letter-spacing: 8px; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #D4AF37; display: inline-block; padding-bottom: 10px;">ONEELIXIR</h1>
      <h2 style="margin-top: 20px; font-size: 24px;">Password Reset Requested</h2>
      <p style="line-height: 1.8; color: #555; margin: 30px 0;">Please click the button below to secure your new credentials.</p>
      <a href="${resetUrl}" style="background-color: #000; color: #fff; padding: 15px 35px; text-decoration: none; display: inline-block; font-weight: bold; letter-spacing: 3px; font-size: 12px; margin: 20px 0;">RESET PASSWORD</a>
      <p style="font-size: 10px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">&copy; 2026 ONEELIXIR FRAGRANCES.</p>
    </div>`;

    await sendEmail({
      email: user.email,
      subject: 'OneElixir | Password Reset Request',
      message: `Reset your password here: ${resetUrl}`,
      html: htmlMessage
    });

    res.json({ message: "Reset link sent to your email." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error sending reset email." });
  }
});

// --- RESET PASSWORD ---
router.post('/reset-password/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token." });

    // Hash new password and clear token fields
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