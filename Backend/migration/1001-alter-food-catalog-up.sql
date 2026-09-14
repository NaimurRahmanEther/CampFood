-- +migrate Up

ALTER TABLE foods ADD COLUMN IF NOT EXISTS kitchen_type varchar(50) NOT NULL DEFAULT 'student_kitchen';
ALTER TABLE foods ADD COLUMN IF NOT EXISTS provider_name varchar(255) NOT NULL DEFAULT '';
ALTER TABLE foods ADD COLUMN IF NOT EXISTS provider_type varchar(50) NOT NULL DEFAULT 'Student Homemade';
ALTER TABLE foods ADD COLUMN IF NOT EXISTS approval_status varchar(20) NOT NULL DEFAULT 'approved';

UPDATE foods
SET provider_name = COALESCE(NULLIF(provider_name, ''), food_name);

UPDATE foods
SET provider_type = CASE
    WHEN kitchen_type = 'hall_kitchen' THEN 'Hall'
    WHEN kitchen_type = 'camp_kitchen' THEN 'Campus Kitchen'
    ELSE 'Student Homemade'
END
WHERE provider_type IS NULL OR provider_type = '';
