INSERT INTO investment_plans (name, slug, description, min_amount, max_amount, return_multiplier, trade_duration_hours, is_active, sort_order) 
VALUES
  ('Basic Plan', 'basic-plan', 'Entry-level investment plan with 5% daily returns', 100.00, NULL, 5.00, 24, true, 1),
  ('Premium Plan', 'premium-plan', 'High-yield investment plan with 10% daily returns', 500.00, NULL, 10.00, 48, true, 2),
  ('VIP Plan', 'vip-plan', 'Elite investment plan with 15% daily returns', 1000.00, NULL, 15.00, 72, true, 3);