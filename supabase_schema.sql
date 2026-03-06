-- ==========================================
-- SUPABASE SCHEMA for Feedlot Ops 5
-- Copy-paste this into Supabase SQL Editor
-- ==========================================

-- 1) INDUKSI
CREATE TABLE IF NOT EXISTS induksi (
    rfid TEXT PRIMARY KEY,
    shipment TEXT,
    tanggal TEXT,
    eartag TEXT,
    berat REAL DEFAULT 0,
    pen TEXT,
    gigi TEXT DEFAULT '0',
    frame TEXT,
    "kodeProperty" TEXT,
    vitamin INT DEFAULT 1,
    "jenisSapi" TEXT
);
CREATE INDEX idx_induksi_shipment ON induksi(shipment);
CREATE INDEX idx_induksi_pen ON induksi(pen);

-- 2) REWEIGHT
CREATE TABLE IF NOT EXISTS reweight (
    id BIGSERIAL PRIMARY KEY,
    rfid TEXT,
    "tglInduksi" TEXT,
    tanggal TEXT,
    eartag TEXT,
    shipment TEXT,
    berat REAL DEFAULT 0,
    "beratInduksi" REAL DEFAULT 0,
    "penInduksi" TEXT,
    "penAwal" TEXT,
    "penAkhir" TEXT,
    dof INT DEFAULT 0,
    adg REAL DEFAULT 0,
    frame TEXT,
    vitamin INT DEFAULT 1,
    "jenisSapi" TEXT
);
CREATE INDEX idx_reweight_rfid ON reweight(rfid);
CREATE INDEX idx_reweight_shipment ON reweight(shipment);

-- 3) PENJUALAN
CREATE TABLE IF NOT EXISTS penjualan (
    id BIGSERIAL PRIMARY KEY,
    rfid TEXT,
    pembeli TEXT,
    "tanggalJual" TEXT,
    eartag TEXT,
    shipment TEXT,
    berat REAL DEFAULT 0,
    "noPenjualan" TEXT,
    "statusJual" TEXT
);
CREATE INDEX idx_penjualan_rfid ON penjualan(rfid);
CREATE INDEX idx_penjualan_pembeli ON penjualan(pembeli);
CREATE INDEX idx_penjualan_nopenjualan ON penjualan("noPenjualan");
CREATE INDEX idx_penjualan_shipment ON penjualan(shipment);

-- 4) MASTER_DATA
CREATE TABLE IF NOT EXISTS master_data (
    type TEXT,
    value TEXT,
    PRIMARY KEY (type, value)
);
CREATE INDEX idx_master_type ON master_data(type);

-- 5) USERS
CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password TEXT,
    role TEXT DEFAULT 'user',
    permissions JSONB DEFAULT '{}'::jsonb
);

-- 6) SETTINGS
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- 7) LOGS
CREATE TABLE IF NOT EXISTS logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TEXT,
    action TEXT,
    detail TEXT
);
CREATE INDEX idx_logs_timestamp ON logs(timestamp);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) — allow anon key
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE induksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE reweight ENABLE ROW LEVEL SECURITY;
ALTER TABLE penjualan ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Policy: allow all operations for anon role (PWA uses anon key)
CREATE POLICY "Allow all for anon" ON induksi FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON reweight FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON penjualan FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON master_data FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON logs FOR ALL TO anon USING (true) WITH CHECK (true);
