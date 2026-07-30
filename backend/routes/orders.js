const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/orders (Protected)
router.get('/', auth, async (req, res) => {
  const { search, deliveryStatus, paymentStatus } = req.query;

  let sql = `
    SELECT o.*, c.name AS customer_name, c.email AS customer_email,
           COUNT(oi.id) AS total_items, SUM(oi.quantity) AS total_quantity
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    sql += ' AND (c.name LIKE ? OR c.email LIKE ? OR o.id = ?)';
    const searchVal = `%${search}%`;
    params.push(searchVal, searchVal, search);
  }

  if (deliveryStatus) {
    sql += ' AND o.delivery_status = ?';
    params.push(deliveryStatus);
  }

  if (paymentStatus) {
    sql += ' AND o.payment_status = ?';
    params.push(paymentStatus);
  }

  sql += ' GROUP BY o.id ORDER BY o.id DESC';

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error fetching orders', error: error.message });
  }
});

// GET /api/orders/:id (Protected)
router.get('/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const [orderRows] = await pool.query(
      `SELECT o.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone, c.address AS customer_address
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       WHERE o.id = ?`,
      [id]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orderRows[0];

    const [itemRows] = await pool.query(
      `SELECT oi.*, p.name AS product_name, p.brand AS product_brand, p.image_url AS product_image
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [id]
    );

    const [paymentRows] = await pool.query(
      'SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC',
      [id]
    );

    res.json({
      order,
      items: itemRows,
      payments: paymentRows
    });

  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ message: 'Server error fetching order details', error: error.message });
  }
});

// POST /api/orders (Create Order with Real-Time Payment support)
router.post('/', auth, async (req, res) => {
  const { customer_id, items, payment_method, payment_status, transaction_id } = req.body;

  if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Customer ID and order items are required' });
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const { product_id, quantity } = item;
      
      if (!product_id || !quantity || quantity <= 0) {
        throw new Error('Invalid product ID or quantity');
      }

      const [productRows] = await connection.query(
        'SELECT * FROM products WHERE id = ?',
        [product_id]
      );

      if (productRows.length === 0) {
        throw new Error(`Product ID ${product_id} not found`);
      }

      const product = productRows[0];
      if (product.stock < quantity) {
        throw new Error(`Insufficient stock for product "${product.name}". Available: ${product.stock}, Requested: ${quantity}`);
      }

      const discountAmount = product.price * (product.discount / 100);
      const finalPrice = product.price - discountAmount;
      const itemTotal = finalPrice * quantity;
      
      subtotal += itemTotal;
      validatedItems.push({
        product_id: product.id,
        quantity,
        price: finalPrice
      });
    }

    const taxRate = 0.18;
    const tax = parseFloat((subtotal * taxRate).toFixed(2));
    const totalAmount = parseFloat((subtotal + tax).toFixed(2));

    const finalPayStatus = payment_status || 'Paid';
    const txnId = transaction_id || ('TXN-' + Math.random().toString(36).substring(2, 11).toUpperCase());

    const [orderResult] = await connection.query(
      `INSERT INTO orders (customer_id, total_amount, tax, payment_status, delivery_status) 
       VALUES (?, ?, ?, ?, 'Pending')`,
      [customer_id, totalAmount, tax, finalPayStatus]
    );

    const orderId = orderResult.insertId;

    for (const item of validatedItems) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price) 
         VALUES (?, ?, ?, ?)`,
        [orderId, item.product_id, item.quantity, item.price]
      );

      await connection.query(
        'UPDATE inventory SET stock_level = stock_level - ? WHERE product_id = ?',
        [item.quantity, item.product_id]
      );

      await connection.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    await connection.query(
      `INSERT INTO payments (order_id, amount, payment_method, payment_status, transaction_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [orderId, totalAmount, payment_method || 'Credit Card / Debit Card', finalPayStatus, txnId]
    );

    await connection.commit();
    connection.release();

    res.status(201).json({
      orderId,
      totalAmount,
      tax,
      transactionId: txnId,
      paymentStatus: finalPayStatus,
      message: 'Order created and real-time payment approved successfully.'
    });

  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error creating order:', error);
    res.status(400).json({ message: error.message || 'Server error creating order' });
  }
});

// PUT /api/orders/:id
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { delivery_status } = req.body;

  if (!delivery_status) {
    return res.status(400).json({ message: 'Delivery status is required' });
  }

  const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
  if (!validStatuses.includes(delivery_status)) {
    return res.status(400).json({ message: 'Invalid delivery status value' });
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const [orderRows] = await connection.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (orderRows.length === 0) {
      connection.release();
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orderRows[0];
    const oldStatus = order.delivery_status;

    await connection.query('UPDATE orders SET delivery_status = ? WHERE id = ?', [delivery_status, id]);

    const isReversal = (delivery_status === 'Cancelled' || delivery_status === 'Returned');
    const wasReversed = (oldStatus === 'Cancelled' || oldStatus === 'Returned');

    if (isReversal && !wasReversed) {
      const [items] = await connection.query('SELECT * FROM order_items WHERE order_id = ?', [id]);
      
      for (const item of items) {
        if (item.product_id) {
          await connection.query(
            'UPDATE inventory SET stock_level = stock_level + ? WHERE product_id = ?',
            [item.quantity, item.product_id]
          );
          await connection.query(
            'UPDATE products SET stock = stock + ? WHERE id = ?',
            [item.quantity, item.product_id]
          );
        }
      }

      if (order.payment_status === 'Paid') {
        await connection.query('UPDATE orders SET payment_status = "Refunded" WHERE id = ?', [id]);
        await connection.query(
          'UPDATE payments SET payment_status = "Refunded" WHERE order_id = ?',
          [id]
        );
      }
    }

    await connection.commit();
    connection.release();

    res.json({
      message: `Order status updated from ${oldStatus} to ${delivery_status} successfully.`
    });

  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error updating order:', error);
    res.status(500).json({ message: error.message || 'Server error updating order status' });
  }
});

// POST /api/orders/:id/simulate-payment
router.post('/:id/simulate-payment', auth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['Paid', 'Failed', 'Refunded'].includes(status)) {
    return res.status(400).json({ message: 'Valid payment status (Paid, Failed, Refunded) is required' });
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const [orderRows] = await connection.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (orderRows.length === 0) {
      connection.release();
      return res.status(404).json({ message: 'Order not found' });
    }

    await connection.query(
      'UPDATE orders SET payment_status = ? WHERE id = ?',
      [status, id]
    );

    await connection.query(
      'UPDATE payments SET payment_status = ? WHERE order_id = ?',
      [status, id]
    );

    await connection.commit();
    connection.release();

    res.json({
      message: `Payment simulation recorded as ${status} successfully.`
    });

  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error simulating payment:', error);
    res.status(500).json({ message: 'Server error simulating payment', error: error.message });
  }
});

module.exports = router;
