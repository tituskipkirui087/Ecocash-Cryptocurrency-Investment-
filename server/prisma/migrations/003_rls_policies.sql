-- Enable Row Level Security on all tables (required before creating policies)
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS investment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate permissive ones
DROP POLICY IF EXISTS "Allow all" ON users;
DROP POLICY IF EXISTS "Allow all" ON investment_plans;
DROP POLICY IF EXISTS "Allow all" ON investments;
DROP POLICY IF EXISTS "Allow all" ON deposits;
DROP POLICY IF EXISTS "Allow all" ON withdrawals;
DROP POLICY IF EXISTS "Allow all" ON audit_logs;
DROP POLICY IF EXISTS "Allow all" ON notifications;

-- Create permissive policies for all tables
CREATE POLICY "Allow all" ON users FOR ALL USING (true);
CREATE POLICY "Allow all" ON investment_plans FOR ALL USING (true);
CREATE POLICY "Allow all" ON investments FOR ALL USING (true);
CREATE POLICY "Allow all" ON deposits FOR ALL USING (true);
CREATE POLICY "Allow all" ON withdrawals FOR ALL USING (true);
CREATE POLICY "Allow all" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Allow all" ON notifications FOR ALL USING (true);