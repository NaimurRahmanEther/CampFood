-- +migrate Down

DROP INDEX IF EXISTS idx_user_notifications_recipient_created;
DROP INDEX IF EXISTS idx_user_notifications_recipient_unread;

DROP INDEX IF EXISTS idx_user_notifications_user_created;
DROP INDEX IF EXISTS idx_user_notifications_user_unread;

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
    ON user_notifications (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
    ON user_notifications (user_id, is_read, created_at DESC, id DESC);

ALTER TABLE user_notifications
    DROP COLUMN IF EXISTS recipient_role;
