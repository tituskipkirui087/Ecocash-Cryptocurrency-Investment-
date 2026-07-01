-- Check table ownership
SELECT 
  tablename, 
  tableowner 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'investment_plans', 'investments', 'deposits', 'withdrawals', 'audit_logs', 'notifications');

-- Fix ownership if needed
-- ALTER TABLE users OWNER TO postgres;
-- ALTER TABLE investment_plans OWNER TO postgres;
-- etc.