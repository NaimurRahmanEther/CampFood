-- +migrate Up

CREATE TABLE IF NOT EXISTS student_point_transfer_requests (
    id serial PRIMARY KEY,
    sender_user_id varchar(255) NOT NULL,
    receiver_user_id varchar(255) NOT NULL,
    amount integer NOT NULL CHECK (amount > 0),
    status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at timestamp with time zone NOT NULL DEFAULT current_timestamp,
    responded_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_student_point_transfer_requests_sender_status
    ON student_point_transfer_requests (sender_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_point_transfer_requests_receiver_status
    ON student_point_transfer_requests (receiver_user_id, status, created_at DESC);
