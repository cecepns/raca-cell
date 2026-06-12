-- Pascabayar: simpan hasil inquiry sebelum pembayaran
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

ALTER TABLE transactions
  ADD COLUMN transaction_type ENUM('prepaid', 'pasca') NOT NULL DEFAULT 'prepaid' AFTER brand;
