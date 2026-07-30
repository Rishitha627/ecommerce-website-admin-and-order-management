const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
  const authHeader = req.header('Authorization') || req.header('authorization');
  
  if (!authHeader) {
    return res.status(401).json({ message: 'No authorization token provided, access denied.' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is empty.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'techmart_jwt_super_secret_key_2026');
    req.user = decoded;
    req.admin = decoded; // Backwards compatibility
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    return res.status(401).json({ message: 'Token is invalid or expired. Please login again.' });
  }
};
