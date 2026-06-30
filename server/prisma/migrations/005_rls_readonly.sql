-- Create permissive RLS policies for publishable key access
-- This is needed because Supabase's publishable keys still require RLS policies

DROP POLICY IF EXISTS "Allow public access" ON users;
DROP POLICY IF EXISTS "Allow public access" ON investment_plans;
DROP POLICY IF EXISTS "Allow public access" ON investments;
DROP POLICY IF EXISTS "Allow public access" ON deposits;
DROP POLICY IF EXISTS "Allow public access" ON withdrawals;
DROP POLICY IF EXISTS "Allow public access" ON audit_logs;
DROP POLICY IF EXISTS "Allow public access" ON notifications;

-- For read-only public access (use for publishable key)
CREATE POLICY "Allow public access" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public access" ON investment_plans FOR SELECT USING (true);
CREATE POLICY "Allow public access" ON investments FOR SELECT USING (true);
CREATE POLICY "Allow public access" ON deposits FOR SELECT USING (true);
CREATE POLICY "Allow public access" ON withdrawals FOR SELECT USING (true);
CREATE POLICY "Allow public access" ON audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow public access" ON notifications FOR SELECT USING (true);