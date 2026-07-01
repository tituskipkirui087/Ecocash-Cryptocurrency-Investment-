-- Grant permissions to Supabase service_role and authenticated roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verify permissions
SELECT 
  grantee,
  table_name,
  privilege_type
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'investment_plans')
AND grantee IN ('postgres', 'service_role', 'authenticated');