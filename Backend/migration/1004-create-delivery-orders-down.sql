-- +migrate Down

DROP TABLE IF EXISTS delivery_order_incidents;
DROP TABLE IF EXISTS delivery_order_items;
DROP TABLE IF EXISTS delivery_orders;
