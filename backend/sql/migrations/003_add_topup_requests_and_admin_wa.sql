-- Migration: 003_add_topup_requests_and_admin_wa
-- Description: Tabel request topup saldo user & setting nomor WhatsApp admin
-- Date: 2026-06-12

USE raca_cell;

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

INSERT INTO settings (setting_key, setting_value)
VALUES ('admin_whatsapp', '')
ON DUPLICATE KEY UPDATE setting_key = setting_key;
