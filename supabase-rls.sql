-- =========================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES untuk NFC-REVIEW
-- Jalankan file ini di Supabase Dashboard > SQL Editor > New Query
-- =========================================================================
-- Prinsip:
--  * Default: BLOKIR semua akses dari anon key (public).
--  * Operasi tulis & baca sensitif dilakukan dari SERVER-SIDE pakai service_role
--    (bypass RLS). Jadi kita tidak perlu policy untuk service_role.
--  * Hanya operasi super-public yang kita izinkan via anon:
--      - SELECT devices by id (untuk halaman /setup/[id] aktivasi customer)
--      - UPDATE devices (aktivasi dengan PIN) - via API server saja, jadi tidak perlu
--      - SELECT inventory stock (untuk tampil stok di homepage/beli)
-- =========================================================================

-- --- 1. admin_users: FULL LOCK (hanya service_role yang boleh akses) ---
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_users_no_anon ON admin_users;
-- Tidak membuat policy apapun = anon tidak bisa SELECT/INSERT/UPDATE/DELETE.

-- --- 2. devices: anon boleh SELECT (karena /setup/[id] perlu baca), tulis via server ---
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS devices_public_read ON devices;
CREATE POLICY devices_public_read
  ON devices FOR SELECT
  TO anon
  USING (true);
-- INSERT/UPDATE/DELETE devices HANYA via server (service_role).

-- --- 3. orders: FULL LOCK (seluruh operasi via server pakai /api/*) ---
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- Tidak ada policy = anon tidak bisa akses.

-- --- 4. sales: FULL LOCK (hanya admin via server) ---
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- --- 5. inventory: anon boleh SELECT (tampil stok real-time di landing), tulis via server ---
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_public_read ON inventory;
CREATE POLICY inventory_public_read
  ON inventory FOR SELECT
  TO anon
  USING (true);

-- --- 6. coupons: FULL LOCK (validasi via /api/coupons di server) ---
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- --- 7. device_stats: anon boleh INSERT (track scan NFC/QR), SELECT via server ---
ALTER TABLE device_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS device_stats_public_insert ON device_stats;
CREATE POLICY device_stats_public_insert
  ON device_stats FOR INSERT
  TO anon
  WITH CHECK (true);

-- =========================================================================
-- MIGRASI: Hash password & PIN plaintext yang existing menjadi bcrypt
-- =========================================================================
-- CARA PAKAI: Setelah deploy versi baru, buka halaman /api/admin/migrate-passwords
-- SEKALI untuk hash semua password & PIN plaintext di admin_users.
-- (Sudah dibuatkan endpoint di app/api/admin/migrate-passwords/route.js)
-- =========================================================================

-- =========================================================================
-- CATATAN PENTING:
--   1. Pastikan Anda sudah set env var berikut di Vercel:
--        SUPABASE_SERVICE_ROLE_KEY   (dari Supabase > Settings > API)
--        JWT_SECRET                   (string acak panjang, min 32 karakter)
--   2. Jangan expose SERVICE_ROLE_KEY ke client/browser. Hanya untuk server.
--   3. Setelah pasang RLS ini, admin lama yang masih pakai anon key dari browser
--      akan OTOMATIS DITOLAK oleh Supabase - itu yang kita mau.
-- =========================================================================
