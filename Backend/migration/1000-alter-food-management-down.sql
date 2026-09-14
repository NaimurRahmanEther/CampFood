-- +migrate Down

ALTER TABLE foods ADD COLUMN IF NOT EXISTS description text;

UPDATE foods SET description = category WHERE description IS NULL;

ALTER TABLE foods DROP COLUMN IF EXISTS visible;
ALTER TABLE foods DROP COLUMN IF EXISTS stock;
ALTER TABLE foods DROP COLUMN IF EXISTS category;

-- +migrate StatementBegin
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'foods' AND column_name = 'food_name'
    )
    AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'foods' AND column_name = 'title'
    ) THEN
        ALTER TABLE foods RENAME COLUMN food_name TO title;
    END IF;
END $$;
-- +migrate StatementEnd

-- +migrate StatementBegin
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'foods' AND column_name = 'image'
    )
    AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'foods' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE foods RENAME COLUMN image TO image_url;
    END IF;
END $$;
-- +migrate StatementEnd
