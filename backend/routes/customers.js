const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
require('dotenv').config();

// Helper middleware for optional/flexible auth on customer reads
const optionalAuth = (req, res, next) => {
  const authHeader = req.header('Authorization') || req.header('authorization');
  if (authHeader) {
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'techmart_jwt_super_secret_key_2026');
      req.user = decoded;
      req.admin = decoded;
    } catch (e) {
      // Token expired or invalid - continue gracefully for GET search
    }
  }
  next();
};

// GET /api/customers (Search customers by name, email, phone)
router.get('/', optionalAuth, async (req, res) => {
  const { search } = req.query;
  let sql = `
    SELECT c.*, COUNT(o.id) as total_orders
    FROM customers c
    LEFT JOIN orders o ON c.id = o.customer_id
    WHERE 1=1
  `;
  const params = [];

  if (search && search.trim() !== '') {
    const searchTrimmed = search.trim();
    sql += ' AND (LOWER(c.name) LIKE LOWER(?) OR LOWER(c.email) LIKE LOWER(?) OR c.phone LIKE ? OR c.id = ?)';
    const searchVal = `%${searchTrimmed}%`;
    params.push(searchVal, searchVal, searchVal, searchTrimmed);
  }

  sql += ' GROUP BY c.id ORDER BY c.name ASC';

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: 'Server error fetching customers', error: error.message });
  }
});

// GET /api/customers/:id (Customer details & purchase history)
router.get('/:id', optionalAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const [customerRows] = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
    
    if (customerRows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const customer = customerRows[0];

    const [orderRows] = await pool.query(
      `SELECT o.id, o.total_amount, o.tax, o.payment_status, o.delivery_status, o.created_at
       FROM orders o
       WHERE o.customer_id = ?
       ORDER BY o.created_at DESC`,
      [id]
    );

    res.json({
      customer,
      orders: orderRows
    });

  } catch (error) {
    console.error('Error fetching customer details:', error);
    res.status(500).json({ message: 'Server error fetching customer details', error: error.message });
  }
});

module.exports = router;
