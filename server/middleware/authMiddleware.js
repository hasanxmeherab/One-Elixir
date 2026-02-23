const jwt = require('jsonwebtoken');

// Verify admin JWT and attach admin info to req
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded; // { id, role, name }
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
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

module.exports = { verifyAdmin, verifySuperadmin };