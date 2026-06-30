-- Create permissive RLS policies for all tables
-- These allow full access when using secret keys from server-side

DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert access for all users" ON users;
DROP POLICY IF EXISTS "Enable update access for all users" ON users;
DROP POLICY IF EXISTS "Enable delete access for all users" ON users;

CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON users FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON users FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON investment_plans;
DROP POLICY IF EXISTS "Enable insert access for all users" ON investment_plans;
DROP POLICY IF EXISTS "Enable update access for all users" ON investment_plans;
DROP POLICY IF EXISTS "Enable delete access for all users" ON investment_plans;

CREATE POLICY "Enable read access for all users" ON investment_plans FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON investment_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON investment_plans FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON investment_plans FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON investments;
DROP POLICY IF EXISTS "Enable insert access for all users" ON investments;
DROP POLICY IF EXISTS "Enable update access for all users" ON investments;
DROP POLICY IF EXISTS "Enable delete access for all users" ON investments;

CREATE POLICY "Enable read access for all users" ON investments FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON investments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON investments FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON investments FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON deposits;
DROP POLICY IF EXISTS "Enable insert access for all users" ON deposits;
DROP POLICY IF EXISTS "Enable update access for all users" ON deposits;
DROP POLICY IF EXISTS "Enable delete access for all users" ON deposits;

CREATE POLICY "Enable read access for all users" ON deposits FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON deposits FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON deposits FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON deposits FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON withdrawals;
DROP POLICY IF EXISTS "Enable insert access for all users" ON withdrawals;
DROP POLICY IF EXISTS "Enable update access for all users" ON withdrawals;
DROP POLICY IF EXISTS "Enable delete access for all users" ON withdrawals;

CREATE POLICY "Enable read access for all users" ON withdrawals FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON withdrawals FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON withdrawals FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON withdrawals FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON audit_logs;
DROP POLICY IF EXISTS "Enable insert access for all users" ON audit_logs;
DROP POLICY IF EXISTS "Enable update access for all users" ON audit_logs;
DROP POLICY IF EXISTS "Enable delete access for all users" ON audit_logs;

CREATE POLICY "Enable read access for all users" ON audit_logs FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON audit_logs FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON audit_logs FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON notifications;
DROP POLICY IF EXISTS "Enable insert access for all users" ON notifications;
DROP POLICY IF EXISTS "Enable update access for all users" ON notifications;
DROP POLICY IF EXISTS "Enable delete access for all users" ON notifications;

CREATE POLICY "Enable read access for all users" ON notifications FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON notifications FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON notifications FOR DELETE USING (true);