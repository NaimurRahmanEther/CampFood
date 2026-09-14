package db

import (
	"backend/config"
	"strconv"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

func getConnectionString(config config.DbConfig) string {

	sslMode := "disable"
	if config.EnableSSL {
		sslMode = "enable"
	}
	return "host=" + config.Host + " port=" + strconv.Itoa(config.Port) + " user=" + config.User + " password=" + config.Password + " dbname=" + config.Name + " sslmode=" + sslMode
}

func Connect(config config.DbConfig) (*sqlx.DB, error) {
	connStr := getConnectionString(config)

	db, err := sqlx.Connect("postgres", connStr)
	if err != nil {
		return nil, err
	}
	return db, nil
}
