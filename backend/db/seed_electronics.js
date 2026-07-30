const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Determine database path
const dbPath = path.join(__dirname, 'techmart.db');
const db = new sqlite3.Database(dbPath);

const categoriesMap = {
  'Smartphones': [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=400&fit=crop',
    'https://cdn.dummyjson.com/product-images/smartphones/iphone-13-pro/1.webp',
    'https://cdn.dummyjson.com/product-images/smartphones/iphone-x/1.webp',
    'https://cdn.dummyjson.com/product-images/smartphones/samsung-galaxy-s10/1.webp',
    'https://cdn.dummyjson.com/product-images/smartphones/oppo-a57/1.webp',
    'https://cdn.dummyjson.com/product-images/smartphones/vivo-x21/1.webp'
  ],
  'Laptops': [
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=400&fit=crop',
    'https://cdn.dummyjson.com/product-images/laptops/apple-macbook-pro-14-inch-space-grey/1.webp',
    'https://cdn.dummyjson.com/product-images/laptops/asus-zenbook-pro-dual-screen-laptop/1.webp',
    'https://cdn.dummyjson.com/product-images/laptops/huawei-matebook-x-pro/1.webp',
    'https://cdn.dummyjson.com/product-images/laptops/lenovo-yoga-920/1.webp',
    'https://cdn.dummyjson.com/product-images/laptops/new-dell-xps-13-9300-laptop/1.webp'
  ],
  'Tablets': [
    'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&h=400&fit=crop',
    'https://cdn.dummyjson.com/product-images/tablets/ipad-mini-2021-starlight/1.webp',
    'https://cdn.dummyjson.com/product-images/tablets/samsung-galaxy-tab-s8-plus-grey/1.webp',
    'https://cdn.dummyjson.com/product-images/tablets/samsung-galaxy-tab-white/1.webp',
    'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1589739900243-4b52cd9b104e?w=600&h=400&fit=crop'
  ],
  'Smartwatches': [
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&h=400&fit=crop',
    'https://cdn.dummyjson.com/product-images/mobile-accessories/apple-watch-series-4-gold/1.webp',
    'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1544117519-31a4b719223d?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1617043786394-f977fa12eddf?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1517420879524-86d64ac2f339?w=600&h=400&fit=crop'
  ],
  'Headphones': [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=400&fit=crop',
    'https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods/1.webp',
    'https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods-max-silver/1.webp',
    'https://cdn.dummyjson.com/product-images/mobile-accessories/beats-flex-wireless-earphones/1.webp',
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&h=400&fit=crop'
  ],
  'Speakers': [
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&h=400&fit=crop',
    'https://cdn.dummyjson.com/product-images/mobile-accessories/amazon-echo-plus/1.webp',
    'https://cdn.dummyjson.com/product-images/mobile-accessories/apple-homepod-mini-cosmic-grey/1.webp',
    'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&h=400&fit=crop',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Loudspeaker.jpg/600px-Loudspeaker.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Bluetooth_speaker.jpg/600px-Bluetooth_speaker.jpg'
  ],
  'Cameras': [
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&h=400&fit=crop',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Canon_EOS_400D_with_battery_grip.jpg/600px-Canon_EOS_400D_with_battery_grip.jpg',
    'https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?w=600&h=400&fit=crop',
    'https://cdn.dummyjson.com/product-images/mobile-accessories/tv-studio-camera-pedestal/1.webp',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Sony_Alpha_ILCE-6000_15.jpg/600px-Sony_Alpha_ILCE-6000_15.jpg',
    'https://images.unsplash.com/photo-1516961642265-531546e84af2?w=600&h=400&fit=crop'
  ]
};

const brands = ['Samsung', 'Sony', 'Apple', 'Dell', 'HP', 'Asus', 'Logitech', 'Anker', 'SanDisk', 'Bose'];

async function runSeed() {
  db.serialize(() => {
    console.log('Clearing existing data and resetting sequences...');
    db.run(`DELETE FROM payments`);
    db.run(`DELETE FROM order_items`);
    db.run(`DELETE FROM orders`);
    db.run(`DELETE FROM inventory`);
    db.run(`DELETE FROM products`);
    db.run(`DELETE FROM categories`);
    
    // Reset auto-increment for affected tables
    db.run(`DELETE FROM sqlite_sequence WHERE name IN ('categories', 'products', 'inventory', 'orders', 'order_items', 'payments')`);

    // Ensure customer ID 1 exists as Guest User to prevent FK failure in anonymous checkouts
    db.run(`INSERT OR IGNORE INTO customers (id, name, email, phone, address) VALUES (1, 'Guest User', 'guest@techmart.com', '0000000000', 'Guest Address')`);

    console.log('Generating pure electronics categories and products (distinct real images per brand)...');
    
    const insertCategory = db.prepare(`INSERT INTO categories (name, description) VALUES (?, ?)`);
    const insertProduct = db.prepare(`
      INSERT INTO products (name, category_id, brand, price, discount, stock, image_url, description) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertInventory = db.prepare(`
      INSERT INTO inventory (product_id, stock_level, low_stock_threshold) 
      VALUES (?, ?, ?)
    `);

    Object.entries(categoriesMap).forEach(([catName, images]) => {
      insertCategory.run(catName, `Explore our latest ${catName}`, function(err) {
        if (err) return console.error(err);
        const catId = this.lastID;

        // 6 items per category
        for (let i = 0; i < 6; i++) {
          const brand = brands[Math.floor(Math.random() * brands.length)];
          const productName = `${brand} ${catName} Pro X${i + 1}`;
          const price = Math.floor(Math.random() * 50000) + 2500;
          const discount = [0, 5, 10, 15][Math.floor(Math.random() * 4)];
          const stock = Math.floor(Math.random() * 50) + 10;
          
          const imageUrl = images[i];
          const desc = `Premium quality ${brand} ${catName.toLowerCase()} with state-of-the-art features and performance. Reliable, durable, and packed with modern technology.`;

          insertProduct.run(productName, catId, brand, price, discount, stock, imageUrl, desc, function(err) {
            if (err) return console.error(err);
            const productId = this.lastID;
            insertInventory.run(productId, stock, 5, function(err) {
               if (err) console.error(err);
            });
          });
        }
      });
    });

    // We finalize after all runs have been scheduled in the queue
    db.run('SELECT 1', () => {
      insertCategory.finalize();
      insertProduct.finalize();
      insertInventory.finalize();
      console.log('✅ Seeding complete. 7 categories loaded with 42 hand-picked distinct product images.');
      db.close();
    });
  });
}

runSeed();
