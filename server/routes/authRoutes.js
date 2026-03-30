const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const sendEmail = require('../utils/sendEmail');
const { validate, signupSchema, signinSchema } = require('../middleware/validate');

// Helper — generate both tokens
const generateTokens = (user) => {
  const payload = { id: user._id };
  const accessToken  = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// SIGN UP
router.post('/signup', validate(signupSchema), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    const { accessToken, refreshToken } = generateTokens(user);

    user.refreshToken = await bcrypt.hash(refreshToken, 10);
    await user.save();

    res.status(201).json({ token: accessToken, refreshToken, user: { _id: user._id, name: user.name, email: user.email, avatar: user.avatar || '' } });
  } catch (err) {
    res.status(400).json({ message: 'Registration failed' });
  }
});

// SIGN IN
router.post('/signin', validate(signinSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json('Invalid credentials');
    }

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = await bcrypt.hash(refreshToken, 10);
    await user.save();

    res.json({ token: accessToken, refreshToken, user: { _id: user._id, name: user.name, email: user.email, avatar: user.avatar || '' } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GOOGLE SIGN IN ───────────────────────────────────────────
// POST /api/auth/google
// Frontend sends: { credential } — the Google ID token from @react-oauth/google
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: 'No credential provided' });

    // Verify Google ID token by calling Google's tokeninfo endpoint
    const googleRes = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );

    const { email, name, picture, sub: googleId } = googleRes.data;
    if (!email) return res.status(400).json({ message: 'Invalid Google token' });

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      // New user — create without password (Google users don't have one)
      user = await User.create({
        name,
        email,
        password: await bcrypt.hash(googleId + process.env.JWT_SECRET, 10), // dummy hashed password
        avatar: picture,
        googleId
      });
    } else {
      // Existing user — update google info if not set
      if (!user.googleId) { user.googleId = googleId; }
      if (picture && !user.avatar) { user.avatar = picture; }
      await user.save();
    }

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = await bcrypt.hash(refreshToken, 10);
    await user.save();

    res.json({
      token: accessToken,
      refreshToken,
      user: { _id: user._id, name: user.name, email: user.email, avatar: user.avatar }
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ message: 'Google authentication failed' });
  }
});

// REFRESH TOKEN
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.refreshToken) return res.status(403).json({ message: 'Invalid refresh token' });

    const valid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!valid) return res.status(403).json({ message: 'Refresh token mismatch' });

    const newAccessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({ token: newAccessToken });
  } catch {
    res.status(403).json({ message: 'Expired or invalid refresh token. Please sign in again.' });
  }
});

// LOGOUT
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.json({ message: 'Logged out' });
    const decoded = jwt.decode(refreshToken);
    if (decoded?.id) await User.findByIdAndUpdate(decoded.id, { refreshToken: null });
    res.json({ message: 'Logged out successfully' });
  } catch {
    res.json({ message: 'Logged out' });
  }
});

// GET /api/auth/me — returns current user profile from token
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -refreshToken');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ _id: user._id, name: user.name, email: user.email, avatar: user.avatar || '' });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// UPDATE PROFILE (name, password, avatar)
router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, currentPassword, newPassword, avatar } = req.body;

    if (name) user.name = name;
    if (avatar) user.avatar = avatar;

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ message: 'Current password required' });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    res.json({ user: { name: user.name, email: user.email, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ message: 'Update failed' });
  }
});

// FORGOT PASSWORD (unchanged)
router.post('/forgot-password', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'No account found with that email.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

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

    res.json({ message: 'Reset link sent to your email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error sending reset email.' });
  }
});

// RESET PASSWORD
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token.' });

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password updated successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Error resetting password.' });
  }
});

module.exports = router;