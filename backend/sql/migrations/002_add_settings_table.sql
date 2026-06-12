-- Migration: 002_add_settings_table
-- Description: Tambah tabel settings untuk pengaturan margin harga jual
-- Date: 2026-06-12

USE raca_cell;

CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value VARCHAR(255) NOT NULL,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_settings_key (setting_key)
);

INSERT INTO settings (setting_key, setting_value)
VALUES ('margin_percent', '5')
ON DUPLICATE KEY UPDATE setting_key = setting_key;
