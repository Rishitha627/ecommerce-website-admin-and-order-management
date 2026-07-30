-- TechMart E-Commerce Admin & Order Management System Schema

CREATE DATABASE IF NOT EXISTS `techmart_db`;
USE `techmart_db`;

-- 1. Admins Table
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Customers Table
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `phone` VARCHAR(20),
  `address` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_customer_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Products Table
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `category_id` INT,
  `brand` VARCHAR(100),
  `price` DECIMAL(10, 2) NOT NULL,
  `discount` DECIMAL(5, 2) DEFAULT 0.00, -- as percentage e.g. 10.00 for 10%
  `stock` INT NOT NULL DEFAULT 0,
  `image_url` VARCHAR(512),
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
  INDEX `idx_product_name` (`name`),
  INDEX `idx_product_category` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Inventory Table (for tracking transactions, minimum thresholds, etc.)
CREATE TABLE IF NOT EXISTS `inventory` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL UNIQUE,
  `stock_level` INT NOT NULL DEFAULT 0,
  `low_stock_threshold` INT NOT NULL DEFAULT 5,
  `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Orders Table
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT NOT NULL,
  `total_amount` DECIMAL(10, 2) NOT NULL,
  `tax` DECIMAL(10, 2) DEFAULT 0.00,
  `payment_status` ENUM('Pending', 'Paid', 'Failed', 'Refunded') DEFAULT 'Pending',
  `delivery_status` ENUM('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned') DEFAULT 'Pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT,
  INDEX `idx_order_customer` (`customer_id`),
  INDEX `idx_order_created` (`created_at`),
  INDEX `idx_order_status` (`delivery_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. OrderItems Table
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `product_id` INT,
  `quantity` INT NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL, -- capturing unit price at order time
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL,
  INDEX `idx_order_item_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Payments Table
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL DEFAULT 'Credit Card',
  `payment_status` ENUM('Pending', 'Paid', 'Failed', 'Refunded') DEFAULT 'Pending',
  `transaction_id` VARCHAR(100),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  INDEX `idx_payment_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Trigger to automatically create inventory record when a new product is added
DELIMITER $$
CREATE TRIGGER `after_product_insert`
AFTER INSERT ON `products`
FOR EACH ROW
BEGIN
  INSERT INTO `inventory` (`product_id`, `stock_level`, `low_stock_threshold`)
  VALUES (NEW.id, NEW.stock, 5);
END$$
DELIMITER ;

-- Trigger to automatically sync stock in products table when inventory is updated
DELIMITER $$
CREATE TRIGGER `after_inventory_update`
AFTER UPDATE ON `inventory`
FOR EACH ROW
BEGIN
  UPDATE `products`
  SET `stock` = NEW.stock_level
  WHERE `id` = NEW.product_id;
END$$
DELIMITER ;
