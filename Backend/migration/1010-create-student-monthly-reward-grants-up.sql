-- +migrate Up

CREATE TABLE IF NOT EXISTS student_monthly_reward_grants (
    id serial PRIMARY KEY,
    student_user_id varchar(255) NOT NULL,
    reward_type varchar(80) NOT NULL,
    reward_month date NOT NULL,
    reward_points integer NOT NULL CHECK (reward_points > 0),
    note text NOT NULL,
    granted_at timestamp with time zone NOT NULL DEFAULT current_timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_monthly_reward_grants_unique
    ON student_monthly_reward_grants (student_user_id, reward_type, reward_month);

CREATE INDEX IF NOT EXISTS idx_student_monthly_reward_grants_month
    ON student_monthly_reward_grants (reward_month DESC, granted_at DESC);
