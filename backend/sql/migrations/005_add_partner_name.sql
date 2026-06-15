-- Tambah kolom nama mitra per user (untuk struk transaksi)
ALTER TABLE users
  ADD COLUMN partner_name VARCHAR(100) NULL DEFAULT NULL
  AFTER phone;
