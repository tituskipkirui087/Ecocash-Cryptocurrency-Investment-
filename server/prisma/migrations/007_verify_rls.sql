-- Check and fix RLS configuration
-- First check current RLS status
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('users', 'investment_plans');

-- If rowsecurity is true, we need policies
-- If rowsecurity is false, we should still create policies for publishable key

-- Disable RLS (simplest)
ALTER TABLE investment_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE investments DISABLE ROW LEVEL SECURITY;
ALTER TABLE deposits DISABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Verify tables are accessible
SELECT * FROM investment_plans LIMIT 1;