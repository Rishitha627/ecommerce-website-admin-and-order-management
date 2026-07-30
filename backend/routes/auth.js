const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
require('dotenv').config();

// POST /api/login (Admin Login)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET || 'techmart_jwt_super_secret_key_2026',
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Admin login successful',
      token,
      role: 'admin',
      user: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: 'admin'
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error during admin login', error: error.message });
  }
});

// POST /api/customer/login (Customer / User Login)
router.post('/customer/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM customers WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Customer account not found with this email' });
    }

    const customer = rows[0];
    
    // If password_hash exists, compare it; otherwise default check for user123
    let isMatch = false;
    if (customer.password_hash) {
      isMatch = await bcrypt.compare(password, customer.password_hash);
    } else if (password === 'user123') {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid customer password' });
    }

    const token = jwt.sign(
      { id: customer.id, name: customer.name, email: customer.email, role: 'customer' },
      process.env.JWT_SECRET || 'techmart_jwt_super_secret_key_2026',
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Customer login successful',
      token,
      role: 'customer',
      user: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        role: 'customer'
      }
    });

  } catch (error) {
    console.error('Customer login error:', error);
    res.status(500).json({ message: 'Server error during customer login', error: error.message });
  }
});

// POST /api/customer/register (Customer Registration)
router.post('/customer/register', async (req, res) => {
  const { name, email, password, phone, address } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM customers WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'A customer account already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO customers (name, email, password_hash, phone, address) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone || '', address || '']
    );

    const customerId = result.insertId;
    const token = jwt.sign(
      { id: customerId, name, email, role: 'customer' },
      process.env.JWT_SECRET || 'techmart_jwt_super_secret_key_2026',
      { expiresIn: '8h' }
    );

    res.status(201).json({
      message: 'Customer registered successfully',
      token,
      role: 'customer',
      user: {
        id: customerId,
        name,
        email,
        phone: phone || '',
        address: address || '',
        role: 'customer'
      }
    });

  } catch (error) {
    console.error('Customer register error:', error);
    res.status(500).json({ message: 'Server error during customer registration', error: error.message });
  }
});

module.exports = router;
