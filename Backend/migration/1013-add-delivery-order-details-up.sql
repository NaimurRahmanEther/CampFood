-- +migrate Up

ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS delivery_recipient_name varchar(255) NOT NULL DEFAULT '';
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS delivery_phone varchar(50) NOT NULL DEFAULT '';
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS delivery_hall varchar(255) NOT NULL DEFAULT '';
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS delivery_address text NOT NULL DEFAULT '';
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS delivery_landmark varchar(255) NOT NULL DEFAULT '';
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS delivery_note text NOT NULL DEFAULT '';
