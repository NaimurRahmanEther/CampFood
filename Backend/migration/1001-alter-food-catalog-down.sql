-- +migrate Down

ALTER TABLE foods DROP COLUMN IF EXISTS approval_status;
ALTER TABLE foods DROP COLUMN IF EXISTS provider_type;
ALTER TABLE foods DROP COLUMN IF EXISTS provider_name;
ALTER TABLE foods DROP COLUMN IF EXISTS kitchen_type;
