-- +migrate Up
CREATE TABLE IF NOT EXISTS food_reviews (
    id serial PRIMARY KEY,
    food_id integer NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
    user_id varchar(255) NOT NULL,
    student_name varchar(255) NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text NOT NULL,
    create_at timestamp with time zone DEFAULT current_timestamp,
    update_at timestamp with time zone DEFAULT current_timestamp,
    UNIQUE(food_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_food_reviews_food_id ON food_reviews(food_id);
CREATE INDEX IF NOT EXISTS idx_food_reviews_user_id ON food_reviews(user_id);
