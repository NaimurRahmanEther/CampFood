-- +migrate Down

ALTER TABLE delivery_orders DROP COLUMN IF EXISTS delivery_note;
ALTER TABLE delivery_orders DROP COLUMN IF EXISTS delivery_landmark;
ALTER TABLE delivery_orders DROP COLUMN IF EXISTS delivery_address;
ALTER TABLE delivery_orders DROP COLUMN IF EXISTS delivery_hall;
ALTER TABLE delivery_orders DROP COLUMN IF EXISTS delivery_phone;
ALTER TABLE delivery_orders DROP COLUMN IF EXISTS delivery_recipient_name;
