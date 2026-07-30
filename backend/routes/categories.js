const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error fetching categories', error: error.message });
  }
});

// POST /api/categories (Protected)
router.post('/', auth, async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Category name is required' });
  }

  try {
    // Check if duplicate exists
    const [existing] = await pool.query('SELECT id FROM categories WHERE name = ?', [name]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Category name already exists' });
    }

    const [result] = await pool.query(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description || '']
    );

    res.status(201).json({
      id: result.insertId,
      name,
      description: description || '',
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Server error creating category', error: error.message });
  }
});

// PUT /api/categories/:id (Protected)
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Category name is required' });
  }

  try {
    // Check if category exists
    const [existing] = await pool.query('SELECT id FROM categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if name is taken by another category
    const [dup] = await pool.query('SELECT id FROM categories WHERE name = ? AND id != ?', [name, id]);
    if (dup.length > 0) {
      return res.status(400).json({ message: 'Category name already in use by another category' });
    }

    await pool.query(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name, description || '', id]
    );

    res.json({
      id: parseInt(id),
      name,
      description,
      message: 'Category updated successfully'
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Server error updating category', error: error.message });
  }
});

// DELETE /api/categories/:id (Protected)
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT id FROM categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Set categories of related products to NULL (cascade rule handles this or SET NULL is defined in SQL)
    await pool.query('DELETE FROM categories WHERE id = ?', [id]);

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Server error deleting category', error: error.message });
  }
});

module.exports = router;
