const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/reports/stats (Protected - general dashboard KPI numbers)
router.get('/stats', auth, async (req, res) => {
  try {
    // 1. Total Sales (Paid orders)
    const [salesRow] = await pool.query(
      'SELECT SUM(total_amount) AS total_sales FROM orders WHERE payment_status = "Paid"'
    );
    const totalSales = salesRow[0].total_sales || 0.00;

    // 2. Counts of Products, Categories, Orders, Customers
    const [[{ prodCount }]] = await pool.query('SELECT COUNT(*) AS prodCount FROM products');
    const [[{ catCount }]] = await pool.query('SELECT COUNT(*) AS catCount FROM categories');
    const [[{ orderCount }]] = await pool.query('SELECT COUNT(*) AS orderCount FROM orders');
    const [[{ custCount }]] = await pool.query('SELECT COUNT(*) AS custCount FROM customers');

    // 3. Delivery status breakdown
    const [statusRows] = await pool.query(
      'SELECT delivery_status, COUNT(*) as count FROM orders GROUP BY delivery_status'
    );
    const deliveryBreakdown = {
      Pending: 0,
      Processing: 0,
      Shipped: 0,
      Delivered: 0,
      Cancelled: 0,
      Returned: 0
    };
    statusRows.forEach(row => {
      deliveryBreakdown[row.delivery_status] = row.count;
    });

    // 4. Low stock products count
    const [[{ lowStockCount }]] = await pool.query(
      'SELECT COUNT(*) AS lowStockCount FROM inventory WHERE stock_level <= low_stock_threshold'
    );

    res.json({
      kpis: {
        totalSales: parseFloat(totalSales),
        totalProducts: prodCount,
        totalCategories: catCount,
        totalOrders: orderCount,
        totalCustomers: custCount,
        lowStockProducts: lowStockCount
      },
      deliveryBreakdown
    });

  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    res.status(500).json({ message: 'Server error fetching statistics', error: error.message });
  }
});

// GET /api/reports/sales (Protected - Monthly sales history)
router.get('/sales', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        SUM(total_amount) AS revenue,
        COUNT(id) AS orders_count
      FROM orders
      WHERE payment_status = 'Paid'
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
      LIMIT 12
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching sales report:', error);
    res.status(500).json({ message: 'Server error fetching sales report', error: error.message });
  }
});

// GET /api/reports/orders (Protected - Full orders analysis)
router.get('/orders', auth, async (req, res) => {
  try {
    const [statusBreakdown] = await pool.query(`
      SELECT delivery_status, COUNT(*) AS count, SUM(total_amount) AS total_value
      FROM orders
      GROUP BY delivery_status
    `);

    const [paymentBreakdown] = await pool.query(`
      SELECT payment_status, COUNT(*) AS count
      FROM orders
      GROUP BY payment_status
    `);

    res.json({
      delivery: statusBreakdown,
      payment: paymentBreakdown
    });
  } catch (error) {
    console.error('Error fetching orders report:', error);
    res.status(500).json({ message: 'Server error fetching orders report', error: error.message });
  }
});

// GET /api/reports/inventory (Protected - Inventory details & best selling products)
router.get('/inventory', auth, async (req, res) => {
  try {
    // 1. Stock levels per Category
    const [categoryStock] = await pool.query(`
      SELECT c.name AS category_name, SUM(p.stock) AS total_stock
      FROM products p
      JOIN categories c ON p.category_id = c.id
      GROUP BY c.id
    `);

    // 2. Top 5 Best Selling Products (by quantity sold in paid orders)
    const [bestSellers] = await pool.query(`
      SELECT p.name AS product_name, p.brand, SUM(oi.quantity) AS total_qty_sold, SUM(oi.quantity * oi.price) AS total_revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.payment_status = 'Paid'
      GROUP BY oi.product_id
      ORDER BY total_qty_sold DESC
      LIMIT 5
    `);

    // 3. Out of stock products list
    const [outOfStock] = await pool.query(`
      SELECT p.id, p.name, p.brand, c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.stock = 0
    `);

    res.json({
      categoryStock,
      bestSellers,
      outOfStock
    });
  } catch (error) {
    console.error('Error fetching inventory report:', error);
    res.status(500).json({ message: 'Server error fetching inventory report', error: error.message });
  }
});

module.exports = router;
