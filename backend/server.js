const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { checkConnection } = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const inventoryRoutes = require('./routes/inventory');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded product images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API routes
app.use('/api', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportRoutes);

// Serve Frontend SPA production build
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      status: 'online',
      message: 'TechMart Admin Server is running. Frontend build not found.',
      time: new Date()
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    message: 'An internal server error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Start Express server
async function startServer() {
  const isDbConnected = await checkConnection();
  if (isDbConnected) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Combined TechMart Application is running at:`);
      console.log(`   - http://localhost:${PORT}`);
      console.log(`   - http://127.0.0.1:${PORT}`);
    });
  } else {
    console.error('⚠️ Database initialization error. Retrying in 10s...');
    setTimeout(startServer, 10000);
  }
}

startServer();
