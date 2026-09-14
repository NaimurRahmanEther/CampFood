-- +migrate Up

CREATE TABLE IF NOT EXISTS foods(
    id serial primary key,
    user_id varchar(255) not null,
    food_name varchar(255) not null,
    category varchar(100) not null,
    price varchar(50) not null,
    stock integer not null default 0,
    image varchar(500) not null,
    visible boolean not null default true,
    create_at timestamp with time zone default current_timestamp,
    update_at timestamp with time zone default current_timestamp
);

-- +migrate StatementBegin
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'foods' AND column_name = 'title'
    )
    AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'foods' AND column_name = 'food_name'
    ) THEN
        ALTER TABLE foods RENAME COLUMN title TO food_name;
    END IF;
END $$;
-- +migrate StatementEnd

-- +migrate StatementBegin
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'foods' AND column_name = 'image_url'
    )
    AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'foods' AND column_name = 'image'
    ) THEN
        ALTER TABLE foods RENAME COLUMN image_url TO image;
    END IF;
END $$;
-- +migrate StatementEnd

ALTER TABLE foods ADD COLUMN IF NOT EXISTS category varchar(100);
ALTER TABLE foods ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT true;

UPDATE foods SET category = COALESCE(NULLIF(category, ''), 'Uncategorized');

-- +migrate StatementBegin
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'foods' AND column_name = 'description'
    ) THEN
        UPDATE foods
        SET category = COALESCE(NULLIF(description, ''), category, 'Uncategorized')
        WHERE category IS NULL OR category = '' OR category = 'Uncategorized';
    END IF;
END $$;
-- +migrate StatementEnd

UPDATE foods SET image = '' WHERE image IS NULL;

ALTER TABLE foods ALTER COLUMN food_name SET NOT NULL;
ALTER TABLE foods ALTER COLUMN category SET NOT NULL;
ALTER TABLE foods ALTER COLUMN image SET NOT NULL;

ALTER TABLE foods DROP COLUMN IF EXISTS description;
