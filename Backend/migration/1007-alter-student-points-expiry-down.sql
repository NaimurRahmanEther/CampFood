-- +migrate Down

ALTER TABLE student_point_transactions
    DROP COLUMN IF EXISTS remaining_amount,
    DROP COLUMN IF EXISTS expires_at;

ALTER TABLE student_points
    ALTER COLUMN points SET DEFAULT 1240,
    ALTER COLUMN total_earned SET DEFAULT 1240;
