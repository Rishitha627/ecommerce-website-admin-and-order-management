const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/inventory (Protected)
// Filters: search, categoryId, status ('low_stock' | 'out_of_stock' | 'ok')
router.get('/', auth, async (req, res) => {
  const { search, categoryId, status } = req.query;

  let sql = `
    SELECT i.*, p.name AS product_name, p.brand AS product_brand, p.price AS product_price, c.name AS category_name
    FROM inventory i
    JOIN products p ON i.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    sql += ' AND (p.name LIKE ? OR p.brand LIKE ?)';
    const searchVal = `%${search}%`;
    params.push(searchVal, searchVal);
  }

  if (categoryId) {
    sql += ' AND p.category_id = ?';
    params.push(categoryId);
  }

  if (status === 'low_stock') {
    sql += ' AND i.stock_level <= i.low_stock_threshold AND i.stock_level > 0';
  } else if (status === 'out_of_stock') {
    sql += ' AND i.stock_level = 0';
  } else if (status === 'ok') {
    sql += ' AND i.stock_level > i.low_stock_threshold';
  }

  sql += ' ORDER BY i.stock_level ASC';

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ message: 'Server error fetching inventory', error: error.message });
  }
});

// PUT /api/inventory/:id (Protected - Adjust stock or threshold)
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { stock_level, low_stock_threshold, adjustment } = req.body;

  try {
    // Check if inventory record exists
    const [existing] = await pool.query('SELECT * FROM inventory WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Inventory record not found' });
    }

    const currentRecord = existing[0];
    let newStockLevel = currentRecord.stock_level;
    let newThreshold = currentRecord.low_stock_threshold;

    // Apply absolute value updates or adjustment increments
    if (stock_level !== undefined) {
      newStockLevel = parseInt(stock_level);
    } else if (adjustment !== undefined) {
      newStockLevel = currentRecord.stock_level + parseInt(adjustment);
    }

    if (newStockLevel < 0) {
      return res.status(400).json({ message: 'Stock level cannot be negative' });
    }

    if (low_stock_threshold !== undefined) {
      newThreshold = parseInt(low_stock_threshold);
      if (newThreshold < 0) {
        return res.status(400).json({ message: 'Low stock threshold cannot be negative' });
      }
    }

    // Execute update inside a transaction to ensure product.stock and inventory.stock_level match
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.query(
        'UPDATE inventory SET stock_level = ?, low_stock_threshold = ? WHERE id = ?',
        [newStockLevel, newThreshold, id]
      );

      // Trigger 'after_inventory_update' will automatically sync this,
      // but explicitly updating ensures sync regardless of trigger environment support.
      await connection.query(
        'UPDATE products SET stock = ? WHERE id = ?',
        [newStockLevel, currentRecord.product_id]
      );

      await connection.commit();
      connection.release();

      // Return updated record
      const [updatedRecord] = await pool.query(
        `SELECT i.*, p.name AS product_name, p.brand AS product_brand, c.name AS category_name
         FROM inventory i
         JOIN products p ON i.product_id = p.id
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE i.id = ?`,
        [id]
      );

      res.json({
        inventory: updatedRecord[0],
        message: 'Inventory updated successfully'
      });

    } catch (txError) {
      await connection.rollback();
      connection.release();
      throw txError;
    }

  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ message: 'Server error updating inventory', error: error.message });
  }
});

module.exports = router;
