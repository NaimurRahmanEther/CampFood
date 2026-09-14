-- +migrate Up

CREATE TABLE IF NOT EXISTS student_points (
    student_user_id varchar(255) PRIMARY KEY,
    points integer NOT NULL DEFAULT 0,
    total_earned integer NOT NULL DEFAULT 0,
    total_transferred integer NOT NULL DEFAULT 0,
    is_free_delivery_partner boolean NOT NULL DEFAULT false,
    updated_at timestamp with time zone NOT NULL DEFAULT current_timestamp
);

CREATE TABLE IF NOT EXISTS student_point_transactions (
    id serial PRIMARY KEY,
    student_user_id varchar(255) NOT NULL,
    transaction_type varchar(50) NOT NULL,
    amount integer NOT NULL,
    note text NOT NULL,
    expires_at timestamp with time zone,
    remaining_amount integer,
    created_at timestamp with time zone NOT NULL DEFAULT current_timestamp
);
