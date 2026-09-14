-- +migrate Up

ALTER TABLE student_points
    ALTER COLUMN points SET DEFAULT 0,
    ALTER COLUMN total_earned SET DEFAULT 0;

ALTER TABLE student_point_transactions
    ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS remaining_amount integer;

UPDATE student_point_transactions
SET expires_at = created_at + interval '15 days'
WHERE transaction_type = 'bonus'
  AND expires_at IS NULL;

UPDATE student_point_transactions
SET remaining_amount = amount
WHERE transaction_type = 'bonus'
  AND remaining_amount IS NULL;

UPDATE student_point_transactions
SET remaining_amount = 0
WHERE transaction_type <> 'bonus'
  AND remaining_amount IS NULL;
