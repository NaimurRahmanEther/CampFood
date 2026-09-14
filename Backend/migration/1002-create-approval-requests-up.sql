-- +migrate Up

CREATE TABLE IF NOT EXISTS approval_requests (
    id serial PRIMARY KEY,
    request_type varchar(50) NOT NULL,
    applicant_name varchar(255) NOT NULL,
    applicant_email varchar(255) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'pending',
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    review_note text NOT NULL DEFAULT '',
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT current_timestamp
);
