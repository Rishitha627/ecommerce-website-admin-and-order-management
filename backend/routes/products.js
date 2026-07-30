const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');

// Setup image upload storage using Multer
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images are allowed (jpg, jpeg, png, webp, gif)'));
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// GET /api/products
// Optional Query parameters: search, categoryId, brand, lowStock (boolean)
router.get('/', async (req, res) => {
  const { search, categoryId, brand, lowStock } = req.query;
  
  let sql = `
    SELECT p.*, c.name AS category_name, i.low_stock_threshold, i.last_updated AS stock_updated_at
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN inventory i ON p.id = i.product_id
    WHERE 1=1
  `;
  const params = [];

  if (search && search.trim() !== '') {
    const searchTrimmed = search.trim();
    sql += ' AND (LOWER(p.name) LIKE LOWER(?) OR LOWER(p.brand) LIKE LOWER(?) OR LOWER(p.description) LIKE LOWER(?) OR LOWER(c.name) LIKE LOWER(?))';
    const searchVal = `%${searchTrimmed}%`;
    params.push(searchVal, searchVal, searchVal, searchVal);
  }

  if (categoryId) {
    sql += ' AND p.category_id = ?';
    params.push(categoryId);
  }

  if (brand) {
    sql += ' AND LOWER(p.brand) = LOWER(?)';
    params.push(brand);
  }

  if (lowStock === 'true') {
    sql += ' AND p.stock <= i.low_stock_threshold';
  }

  sql += ' ORDER BY p.id DESC';

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error fetching products', error: error.message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, c.name AS category_name, i.low_stock_threshold, i.last_updated AS stock_updated_at
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Server error fetching product', error: error.message });
  }
});

// POST /api/products (Protected + Image upload)
router.post('/', auth, upload.single('image'), async (req, res) => {
  const { name, category_id, brand, price, discount, stock, description } = req.body;

  if (!name || !price) {
    return res.status(400).json({ message: 'Product name and price are required' });
  }

  let imageUrl = null;
  if (req.file) {
    imageUrl = `/uploads/${req.file.filename}`;
  } else if (req.body.image_url) {
    imageUrl = req.body.image_url;
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO products (name, category_id, brand, price, discount, stock, image_url, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        category_id ? parseInt(category_id) : null,
        brand || '',
        parseFloat(price),
        discount ? parseFloat(discount) : 0.00,
        stock ? parseInt(stock) : 0,
        imageUrl,
        description || ''
      ]
    );

    const [newProduct] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);

    res.status(201).json({
      product: newProduct[0],
      message: 'Product created successfully'
    });

  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Server error creating product', error: error.message });
  }
});

// PUT /api/products/:id (Protected + Optional Image Upload)
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { name, category_id, brand, price, discount, stock, description } = req.body;

  if (!name || !price) {
    return res.status(400).json({ message: 'Product name and price are required' });
  }

  try {
    const [existing] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let imageUrl = existing[0].image_url;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.image_url) {
      imageUrl = req.body.image_url;
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.query(
        `UPDATE products 
         SET name = ?, category_id = ?, brand = ?, price = ?, discount = ?, stock = ?, image_url = ?, description = ?
         WHERE id = ?`,
        [
          name,
          category_id ? parseInt(category_id) : null,
          brand || '',
          parseFloat(price),
          discount ? parseFloat(discount) : 0.00,
          stock ? parseInt(stock) : 0,
          imageUrl,
          description || '',
          id
        ]
      );

      await connection.query(
        'UPDATE inventory SET stock_level = ? WHERE product_id = ?',
        [stock ? parseInt(stock) : 0, id]
      );

      await connection.commit();
      connection.release();

      const [updatedProduct] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
      res.json({
        product: updatedProduct[0],
        message: 'Product updated successfully'
      });
    } catch (transactionError) {
      await connection.rollback();
      connection.release();
      throw transactionError;
    }

  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Server error updating product', error: error.message });
  }
});

// DELETE /api/products/:id (Protected)
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await pool.query('DELETE FROM products WHERE id = ?', [id]);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error deleting product', error: error.message });
  }
});

// POST /api/products/import (Protected)
router.post('/import', auth, async (req, res) => {
  console.log('🔄 Triggering product import from third-party API...');
  
  try {
    const [categories] = await pool.query('SELECT * FROM categories');
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name.toLowerCase()] = cat.id;
    });

    const response = await axios.get('https://fakestoreapi.com/products');
    const apiProducts = response.data;
    
    const techBrands = ['Samsung', 'Sony', 'Logitech', 'Apple', 'Dell', 'Asus', 'HP', 'Anker', 'SanDisk', 'Intel'];
    let imported = 0;
    let skipped = 0;

    for (const item of apiProducts) {
      const [existing] = await pool.query('SELECT id FROM products WHERE name = ?', [item.title]);
      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const itemCat = item.category.toLowerCase();
      if (!itemCat.includes('electronic')) {
        skipped++;
        continue;
      }
      
      let catName = 'Computer Accessories';

      let categoryId = categoryMap[catName.toLowerCase()];
      if (!categoryId) {
        const [catResult] = await pool.query(
          'INSERT INTO categories (name, description) VALUES (?, ?)',
          [catName, `Dynamic category created for imported ${catName} products.`]
        );
        categoryId = catResult.insertId;
        categoryMap[catName.toLowerCase()] = categoryId;
      }

      const brand = techBrands[Math.floor(Math.random() * techBrands.length)];
      const stock = Math.floor(Math.random() * 40) + 10;
      const discount = Math.random() > 0.5 ? [5, 10, 15, 20][Math.floor(Math.random() * 4)] : 0.00;

      await pool.query(
        `INSERT INTO products (name, category_id, brand, price, discount, stock, image_url, description) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.title,
          categoryId,
          brand,
          item.price,
          discount,
          stock,
          item.image,
          item.description
        ]
      );
      imported++;
    }

    res.json({
      success: true,
      message: `API Import complete. Imported ${imported} new products, skipped ${skipped} duplicates.`,
      imported,
      skipped
    });

  } catch (error) {
    console.error('Error importing products:', error);
    res.status(500).json({ message: 'Third Party API Import failed', error: error.message });
  }
});

module.exports = router;
