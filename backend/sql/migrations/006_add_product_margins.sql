-- Migration 006: Per-product margin overrides
-- Description: Margin khusus per SKU produk (override margin global)

CREATE TABLE IF NOT EXISTS product_margins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  buyer_sku_code VARCHAR(50) NOT NULL UNIQUE,
  product_name VARCHAR(200) NOT NULL,
  transaction_type ENUM('prepaid', 'pasca') NOT NULL DEFAULT 'prepaid',
  margin_percent DECIMAL(5, 2) NOT NULL,
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_product_margins_sku (buyer_sku_code),
  INDEX idx_product_margins_type (transaction_type)
);
