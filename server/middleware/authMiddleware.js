const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const User = require('../models/User');
const ADMIN_ROLES = ['admin', 'superadmin'];
function identity(req, res) {
  const token = req.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) { res.status(401).json({ message: 'No token provided' }); return null; }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!mongoose.isValidObjectId(decoded.id)) throw new Error('Invalid identity');
    return decoded;
  } catch { res.status(401).json({ message: 'Invalid or expired token' }); return null; }
}
const verifyAdmin = async (req, res, next) => {
  const decoded = identity(req, res);
  if (!decoded) return;
  if (!ADMIN_ROLES.includes(decoded.role)) return res.status(403).json({ message: 'Admin access required' });
  let admin;
  try { admin = await Admin.findById(decoded.id).select('_id name role sessionVersion').lean(); }
  catch { return res.status(503).json({ message: 'Could not verify admin access. Please retry.' }); }
  if (!admin) return res.status(401).json({ message: 'Admin account no longer exists. Please sign in again.' });
  if ((decoded.sessionVersion ?? 0) !== (admin.sessionVersion || 0)) return res.status(401).json({ message: 'Admin session ended. Please sign in again.' });
  if (!ADMIN_ROLES.includes(admin.role)) return res.status(403).json({ message: 'Admin access required' });
  req.admin = { id: String(admin._id), name: admin.name, role: admin.role };
  next();
};
const verifySuperadmin = (req, res, next) => verifyAdmin(req, res, () => {
  if (req.admin.role !== 'superadmin') return res.status(403).json({ message: 'Superadmin access required' });
  next();
});
const verifyUser = async (req, res, next) => {
  const decoded = identity(req, res);
  if (!decoded) return;
  if (decoded.role !== undefined && decoded.role !== 'customer') return res.status(403).json({ message: 'Customer access required' });
  let user;
  try { user = await User.findById(decoded.id).select('_id name email role').lean(); }
  catch { return res.status(503).json({ message: 'Could not verify customer access. Please retry.' }); }
  if (!user) return res.status(401).json({ message: 'Customer account no longer exists. Please sign in again.' });
  if (user.role && user.role !== 'customer') return res.status(403).json({ message: 'Customer access required' });
  req.userId = String(user._id);
  req.user = user;
  next();
};
module.exports = { verifyAdmin, verifySuperadmin, verifyUser };
