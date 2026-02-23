const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Log = require('../models/Log');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifyAdmin, verifySuperadmin } = require('../middleware/authMiddleware');

// Helper — write an activity log
const writeLog = async (req, action, target, detail) => {
  try {
    await Log.create({
      adminId:   req.admin?.id   || null,
      adminName: req.admin?.name || 'System',
      action,
      target,
      detail,
      ip: req.ip || ''
    });
  } catch (e) {
    console.error('Log write failed:', e.message);
  }
};

// ── 1. REGISTER new admin (superadmin only, or first-run if no admins exist)
router.post('/register', verifyAdmin, async (req, res) => {
  try {
    // Allow superadmin to set role, default to 'admin'
    const { name, email, password, role } = req.body;
    const assignedRole = req.admin.role === 'superadmin' && role === 'superadmin'
      ? 'superadmin'
      : 'admin';

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newAdmin = new Admin({ name, email, password: hashedPassword, role: assignedRole });
    await newAdmin.save();

    await writeLog(req, 'CREATE_ADMIN', 'Admin', `Created admin account for ${email} with role ${assignedRole}`);
    res.status(201).json({ message: 'Admin created successfully' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── 2. ADMIN LOGIN — returns accessToken (15m) + refreshToken (7d)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: 'Admin not found' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const payload = { id: admin._id, role: admin.role, name: admin.name };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Store hashed refresh token on admin document
    admin.refreshToken = await bcrypt.hash(refreshToken, 8);
    await admin.save();

    await Log.create({
      adminId: admin._id, adminName: admin.name,
      action: 'LOGIN', target: 'Admin',
      detail: `${admin.name} logged in`, ip: req.ip || ''
    });

    res.json({
      accessToken,
      refreshToken,
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── 3. REFRESH TOKEN — exchange valid refreshToken for new accessToken
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.refreshToken) return res.status(403).json({ message: 'Invalid refresh token' });

    const valid = await bcrypt.compare(refreshToken, admin.refreshToken);
    if (!valid) return res.status(403).json({ message: 'Refresh token mismatch' });

    const payload = { id: admin._id, role: admin.role, name: admin.name };
    const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({ accessToken: newAccessToken });
  } catch {
    res.status(403).json({ message: 'Expired or invalid refresh token' });
  }
});

// ── 4. LOGOUT — clear stored refresh token
router.post('/logout', verifyAdmin, async (req, res) => {
  try {
    await Admin.findByIdAndUpdate(req.admin.id, { refreshToken: null });
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── 5. GET all admins (any admin can view)
router.get('/list', verifyAdmin, async (req, res) => {
  try {
    const admins = await Admin.find().select('-password -refreshToken');
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── 6. DELETE an admin (superadmin only)
router.delete('/:id', verifySuperadmin, async (req, res) => {
  try {
    const target = await Admin.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'Admin not found' });

    // Prevent superadmin from deleting themselves
    if (req.params.id === req.admin.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await Admin.findByIdAndDelete(req.params.id);
    await writeLog(req, 'DELETE_ADMIN', 'Admin', `Revoked access for admin: ${target.email}`);
    res.json({ message: 'Admin access revoked successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;