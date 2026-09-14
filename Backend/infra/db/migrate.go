package db

import (
	"fmt"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	migrate "github.com/rubenv/sql-migrate"
)

func MigrateDb(db *sqlx.DB, migrationsDir string) error {
	migrations := &migrate.FileMigrationSource{
		Dir: migrationsDir,
	}
	migrationSet := migrate.MigrationSet{
		IgnoreUnknown: true,
	}
	_, err := migrationSet.Exec(db.DB, "postgres", migrations, migrate.Up)
	if err != nil {
		return err
	}
	fmt.Println("Database migration completed successfully.")
	return nil
}
