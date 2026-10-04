const jwt = require('jsonwebtoken');

const ADMIN_ROLES = ['admin', 'superadmin'];

// Verify admin JWT and attach admin info to req
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  // 🔒 Customer tokens are signed with the same secret but carry no role claim.
  // Only tokens issued by the admin login/refresh routes include an admin role.
  if (!ADMIN_ROLES.includes(decoded.role)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  req.admin = decoded; // { id, role, name }
  next();
};

// Allow only superadmin
const verifySuperadmin = (req, res, next) => {
  verifyAdmin(req, res, () => {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ message: 'Superadmin access required' });
    }
    next();
  });
};

// Verify user JWT and attach userId to req
const verifyUser = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { verifyAdmin, verifySuperadmin, verifyUser };