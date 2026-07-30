const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { pool, checkConnection, isSQLite } = require('../config/db');

async function seed() {
  console.log('🔄 Starting database initialization and seeding (Reduced Product Prices + Real-Time Payment Setup)...');

  await checkConnection();
  const sqliteMode = isSQLite();

  try {
    if (sqliteMode) {
      console.log('🔨 Setting up SQLite database tables...');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT,
          phone TEXT,
          address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          category_id INTEGER,
          brand TEXT,
          price REAL NOT NULL,
          discount REAL DEFAULT 0.00,
          stock INTEGER NOT NULL DEFAULT 0,
          image_url TEXT,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS inventory (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL UNIQUE,
          stock_level INTEGER NOT NULL DEFAULT 0,
          low_stock_threshold INTEGER NOT NULL DEFAULT 5,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          total_amount REAL NOT NULL,
          tax REAL DEFAULT 0.00,
          payment_status TEXT DEFAULT 'Pending',
          delivery_status TEXT DEFAULT 'Pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          product_id INTEGER,
          quantity INTEGER NOT NULL,
          price REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          payment_method TEXT DEFAULT 'Credit Card',
          payment_status TEXT DEFAULT 'Pending',
          transaction_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        );
      `);

    } else {
      console.log('📖 Reading MySQL schema.sql...');
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      
      let cleanSql = schemaSql
        .replace(/DELIMITER \$\$/g, '')
        .replace(/DELIMITER ;/g, '')
        .replace(/\$\$/g, ';');

      await pool.query(cleanSql);
    }

    try {
      if (sqliteMode) {
        await pool.query('ALTER TABLE customers ADD COLUMN password_hash TEXT;');
      } else {
        await pool.query('ALTER TABLE customers ADD COLUMN password_hash VARCHAR(255);');
      }
    } catch (e) {
      // Column already exists
    }

    // 1. Seed Admin Account
    const [admins] = await pool.query('SELECT * FROM admins LIMIT 1');
    const hashedPassword = await bcrypt.hash('rishi627', 10);
    if (admins.length === 0) {
      await pool.query(
        'INSERT INTO admins (username, email, password_hash) VALUES (?, ?, ?)',
        ['rishi', 'rishi@techmart.com', hashedPassword]
      );
      console.log('✅ Admin account created: rishi / rishi627');
    } else {
      await pool.query(
        'UPDATE admins SET username = ?, password_hash = ? WHERE id = ?',
        ['rishi', hashedPassword, admins[0].id]
      );
      console.log('✅ Admin account updated: rishi / rishi627');
    }

    // Clear dependent tables first
    await pool.query('DELETE FROM payments;');
    await pool.query('DELETE FROM order_items;');
    await pool.query('DELETE FROM orders;');

    // 2. Seed 20 Electronics Categories
    await pool.query('DELETE FROM categories;');
    const electronicsCategories = [
      ['Smartphones', 'Latest smartphones and mobile devices.'],
      ['Laptops', 'High performance laptops and notebooks.'],
      ['Tablets', 'iPads, Android tablets, and e-readers.'],
      ['Smartwatches', 'Fitness trackers and smart wearables.'],
      ['Headphones & Earbuds', 'Noise-canceling headphones and wireless earbuds.'],
      ['Speakers', 'Bluetooth speakers and home audio systems.'],
      ['Televisions', '4K Smart TVs and home entertainment.'],
      ['Cameras', 'DSLR, mirrorless, and action cameras.'],
      ['Gaming Consoles', 'PlayStation, Xbox, Nintendo and gaming accessories.'],
      ['Computer Accessories', 'Monitors, cables, docks and webcams.'],
      ['Keyboards & Mice', 'Mechanical keyboards and ergonomic mice.'],
      ['Printers', 'Laser, inkjet and 3D printers.'],
      ['Storage Devices (SSD, HDD, Pen Drives)', 'External drives, SSDs, and flash storage.'],
      ['Networking Devices (Wi-Fi Routers, Modems)', 'Routers, mesh systems, and network switches.'],
      ['Home Appliances', 'Vacuum cleaners, air purifiers, and irons.'],
      ['Kitchen Appliances', 'Microwaves, blenders, and coffee makers.'],
      ['Wearable Electronics', 'VR headsets, smart rings, and AR glasses.'],
      ['Power Banks & Chargers', 'Portable chargers, wireless pads, and adapters.'],
      ['Monitors', 'High refresh rate and ultrawide displays.'],
      ['Smart Home Devices', 'Smart bulbs, plugs, and security cameras.']
    ];

    for (const cat of electronicsCategories) {
      await pool.query('INSERT INTO categories (name, description) VALUES (?, ?)', cat);
    }
    console.log('✅ 20 Electronics categories seeded.');

    // Get category mappings
    const [dbCats] = await pool.query('SELECT id, name FROM categories');
    const catMap = {};
    dbCats.forEach(c => {
      catMap[c.name.toLowerCase()] = c.id;
    });

    // 3. Seed Customers with gmail.com domain
    const defaultCustPass = await bcrypt.hash('user123', 10);
    await pool.query('DELETE FROM customers;');
    const mockCustomers = [
      ['Rishi Kumar', 'rishi.kumar@gmail.com', defaultCustPass, '+91 9876543210', 'Tata Consultancy Services, Mumbai, India'],
      ['Sarah Jenkins', 'sarah.jenkins@gmail.com', defaultCustPass, '+1 555-0199', '123 Pine St, Seattle, WA, USA'],
      ['Liam O\'Connor', 'liam.oconnor@gmail.com', defaultCustPass, '+353 1 496 0123', '45 Grafton St, Dublin, Ireland'],
      ['Aarav Mehta', 'aarav.mehta@gmail.com', defaultCustPass, '+91 9988776655', 'Whitefield, Bangalore, India']
    ];

    for (const cust of mockCustomers) {
      await pool.query(
        'INSERT INTO customers (name, email, password_hash, phone, address) VALUES (?, ?, ?, ?, ?)',
        cust
      );
    }
    console.log('✅ Customers seeded with @gmail.com accounts (Password: user123)');

    // 4. Seed Electronics Catalog with REDUCED AFFORDABLE PRICES in INR (₹)
    await pool.query('DELETE FROM inventory;');
    await pool.query('DELETE FROM products;');

    const imageMap = {
      'smartphones': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
      'laptops': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80',
      'tablets': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80',
      'smartwatches': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
      'headphones & earbuds': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
      'speakers': 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80',
      'televisions': 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&auto=format&fit=crop&q=80',
      'cameras': 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80',
      'gaming consoles': 'https://images.unsplash.com/photo-1486401899868-0e435ed85128?w=600&auto=format&fit=crop&q=80',
      'computer accessories': 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80',
      'keyboards & mice': 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=600&auto=format&fit=crop&q=80',
      'printers': 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=600&auto=format&fit=crop&q=80',
      'storage devices (ssd, hdd, pen drives)': 'https://images.unsplash.com/photo-1618420138541-bcabfb2a4d33?w=600&auto=format&fit=crop&q=80',
      'networking devices (wi-fi routers, modems)': 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop&q=80',
      'home appliances': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
      'kitchen appliances': 'https://images.unsplash.com/photo-1556910103-1c02745a872f?w=600&auto=format&fit=crop&q=80',
      'wearable electronics': 'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=600&auto=format&fit=crop&q=80',
      'power banks & chargers': 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&auto=format&fit=crop&q=80',
      'monitors': 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80',
      'smart home devices': 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80'
    };
    const fallbackImg = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&auto=format&fit=crop&q=80';

    const electronicsCatalog = [];
    const brandsList = ['Samsung', 'Apple', 'Sony', 'LG', 'Asus', 'Dell', 'HP', 'Lenovo', 'OnePlus', 'Xiaomi', 'Bose', 'Logitech', 'Razer', 'Corsair', 'Canon', 'Nikon'];

    // Generate 20 products for each category
    for (const cat of electronicsCategories) {
      const catName = cat[0];
      const catId = catMap[catName.toLowerCase()];
      const catImg = imageMap[catName.toLowerCase()] || fallbackImg;
      for (let i = 1; i <= 20; i++) {
        const brand = brandsList[Math.floor(Math.random() * brandsList.length)];
        const productName = `${brand} Premium ${catName} Model ${i}`;
        const price = Math.floor(Math.random() * 50000) + 1000; // Between 1000 and 51000
        const discount = Math.floor(Math.random() * 20); // 0 to 20%
        const stock = Math.floor(Math.random() * 100) + 5; // 5 to 104
        const desc = `High quality ${catName.toLowerCase()} manufactured by ${brand}. Features cutting edge technology and premium build quality.`;
        
        electronicsCatalog.push([
          productName,
          catId,
          brand,
          price,
          discount,
          stock,
          catImg,
          desc
        ]);
      }
    }

    let insertedCount = 0;
    for (const item of electronicsCatalog) {
      const [pRes] = await pool.query(
        `INSERT INTO products (name, category_id, brand, price, discount, stock, image_url, description) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        item
      );
      const pId = pRes.insertId;
      if (pId) {
        await pool.query(
          'INSERT INTO inventory (product_id, stock_level, low_stock_threshold) VALUES (?, ?, ?)',
          [pId, item[5], 5]
        );
        insertedCount++;
      }
    }

    console.log(`🎉 Seeding complete! ${insertedCount} Electronic Products seeded.`);

  } catch (error) {
    console.error('❌ Error during seeding:', error.message);
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
