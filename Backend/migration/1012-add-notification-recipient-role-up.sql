-- +migrate Up

ALTER TABLE user_notifications
    ADD COLUMN IF NOT EXISTS recipient_role varchar(50) NOT NULL DEFAULT 'student';

DROP INDEX IF EXISTS idx_user_notifications_user_created;
DROP INDEX IF EXISTS idx_user_notifications_user_unread;

CREATE INDEX IF NOT EXISTS idx_user_notifications_recipient_created
    ON user_notifications (recipient_role, user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_recipient_unread
    ON user_notifications (recipient_role, user_id, is_read, created_at DESC, id DESC);
