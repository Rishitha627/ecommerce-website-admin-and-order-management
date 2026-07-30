const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./db/techmart.db');
const bcrypt = require('bcryptjs');

bcrypt.hash('user123', 10).then(hash => {
  db.run(
    `INSERT OR IGNORE INTO customers (id, name, email, phone, address, password_hash) VALUES (2, 'Rishi Kumar', 'rishi.kumar@gmail.com', '+91 9876543210', 'Mumbai, India', ?)`,
    [hash],
    (err) => {
      if (err) console.error(err);
      else console.log('Default user seeded!');
    }
  );
});
