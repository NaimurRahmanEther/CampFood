-- +migrate Up

CREATE TABLE IF NOT EXISTS hall_fests (
    id serial PRIMARY KEY,
    kitchen_user_id varchar(255) NOT NULL,
    title varchar(255) NOT NULL,
    fest_date varchar(50) NOT NULL,
    special_menu text NOT NULL,
    notes text NOT NULL DEFAULT '',
    is_active boolean NOT NULL DEFAULT true,
    updated_at timestamp with time zone NOT NULL DEFAULT current_timestamp
);
