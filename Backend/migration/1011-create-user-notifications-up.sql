-- +migrate Up

CREATE TABLE IF NOT EXISTS user_notifications (
    id serial PRIMARY KEY,
    user_id varchar(255) NOT NULL,
    category varchar(50) NOT NULL,
    title varchar(160) NOT NULL,
    message text NOT NULL,
    related_order_id integer REFERENCES delivery_orders(id) ON DELETE SET NULL,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT current_timestamp
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
    ON user_notifications (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
    ON user_notifications (user_id, is_read, created_at DESC, id DESC);
