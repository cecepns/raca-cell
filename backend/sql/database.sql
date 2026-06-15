-- Raca Cell PPOB - Full Database Schema (latest)
-- Untuk fresh install, jalankan file ini ATAU gunakan migration berurutan:
--   sql/migrations/000_create_database.sql
--   sql/migrations/001_initial_schema.sql
--   sql/migrations/002_add_settings_table.sql
--
-- Untuk update database yang sudah ada, jalankan hanya migration baru di folder migrations/

CREATE DATABASE IF NOT EXISTS raca_cell CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE raca_cell;

-- ─── 001: Initial Schema ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  partner_name VARCHAR(100) NULL DEFAULT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('owner', 'admin', 'user') NOT NULL DEFAULT 'user',
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_status (status),
  INDEX idx_users_email (email)
);

CREATE TABLE IF NOT EXISTS balance_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('topup', 'add', 'reduce', 'purchase', 'refund') NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  balance_before DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2) NOT NULL,
  note TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_balance_user (user_id),
  INDEX idx_balance_type (type)
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  ref_id VARCHAR(100) NOT NULL UNIQUE,
  customer_no VARCHAR(30) NOT NULL,
  buyer_sku_code VARCHAR(50) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  brand VARCHAR(100),
  transaction_type ENUM('prepaid', 'pasca') NOT NULL DEFAULT 'prepaid',
  price DECIMAL(15, 2) NOT NULL,
  selling_price DECIMAL(15, 2) NOT NULL,
  status ENUM('success', 'pending', 'failed') NOT NULL DEFAULT 'pending',
  sn VARCHAR(255),
  message TEXT,
  digiflazz_response JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_transactions_user (user_id),
  INDEX idx_transactions_status (status),
  INDEX idx_transactions_ref (ref_id)
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  metadata JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_logs_user (user_id),
  INDEX idx_logs_action (action),
  INDEX idx_logs_created (created_at)
);

-- ─── 002: Settings Table (Margin) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value VARCHAR(255) NOT NULL,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_settings_key (setting_key)
);

INSERT INTO settings (setting_key, setting_value) VALUES ('margin_percent', '5')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

INSERT INTO settings (setting_key, setting_value) VALUES ('admin_whatsapp', '')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- ─── 003: Topup Requests ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS topup_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  note TEXT,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  processed_by INT,
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_topup_user (user_id),
  INDEX idx_topup_status (status)
);

-- ─── 004: Pascabayar Support ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pasca_inquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  ref_id VARCHAR(100) NOT NULL UNIQUE,
  buyer_sku_code VARCHAR(50) NOT NULL,
  customer_no VARCHAR(30) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  brand VARCHAR(100),
  base_price DECIMAL(15, 2) NOT NULL,
  selling_price DECIMAL(15, 2) NOT NULL,
  customer_name VARCHAR(200),
  inquiry_response JSON,
  paid_at TIMESTAMP NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_pasca_inquiry_user (user_id),
  INDEX idx_pasca_inquiry_expires (expires_at)
);

-- Default owner dibuat otomatis saat server pertama kali dijalankan
-- Email: owner@racacell.com | Password: password123
