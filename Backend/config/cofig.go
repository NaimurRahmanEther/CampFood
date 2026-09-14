package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type DbConfig struct {
	Host      string
	Port      int
	User      string
	Password  string
	Name      string
	EnableSSL bool
}

type Config struct {
	Version       string
	ServiceName   string
	HTTPPort      int
	JwtSecret     string
	AdminEmail    string
	AdminPassword string
	AdminLoginID  string
	OpenAIAPIKey  string
	OpenAIModel   string
	OpenAIBaseURL string
	DBConfig      DbConfig
}

var configurations Config
var DBConfig DbConfig

func loadConfig() {
	err := godotenv.Load()
	if err != nil {
		fmt.Println("Error loading .env file")
		os.Exit(1)
	}

	version := os.Getenv("VERSION")
	if version == "" {
		fmt.Println("VERSION not set in .env file")
		os.Exit(1)
	}

	serviceName := os.Getenv("SERVICE_NAME")
	if serviceName == "" {
		fmt.Println("SERVICE_NAME not set in .env file")
		os.Exit(1)
	}

	httpPort := os.Getenv("HTTP_PORT")
	if httpPort == "" {
		fmt.Println("HTTP_PORT not set in .env file")
		os.Exit(1)
	}

	httpPortInt, err := strconv.Atoi(httpPort)
	if err != nil {
		fmt.Println("Invalid HTTP_PORT value in .env file")
		os.Exit(1)
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		fmt.Println("JWT_SECRET not set in .env file")
		os.Exit(1)
	}

	adminEmail := os.Getenv("Admin_Email")
	if adminEmail == "" {
		fmt.Println("Admin_Email not set in .env file")
		os.Exit(1)
	}

	adminPassword := os.Getenv("Admin_Password")
	if adminPassword == "" {
		fmt.Println("Admin_Password not set in .env file")
		os.Exit(1)
	}

	adminLoginID := os.Getenv("Admin_Login_ID")
	if adminLoginID == "" {
		adminLoginID = "0000000000"
	}
	openAIModel := os.Getenv("OPENAI_MODEL")
	if openAIModel == "" {
		openAIModel = "gpt-4.1-mini"
	}

	openAIBaseURL := os.Getenv("OPENAI_BASE_URL")
	if openAIBaseURL == "" {
		openAIBaseURL = "https://api.openai.com/v1"
	}
	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		fmt.Println("DB_PORT not set in .env file")
		os.Exit(1)
	}

	dbportInt, err := strconv.Atoi(dbPort)
	if err != nil {
		fmt.Println("Invalid DB_PORT value in .env file")
		os.Exit(1)
	}

	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		fmt.Println("DB_HOST not set in .env file")
		os.Exit(1)
	}

	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		fmt.Println("DB_USER not set in .env file")
		os.Exit(1)
	}

	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		fmt.Println("DB_PASSWORD not set in .env file")
		os.Exit(1)
	}

	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		fmt.Println("DB_NAME not set in .env file")
		os.Exit(1)
	}
	enableSSL := os.Getenv("SSL_MODE")
	if enableSSL == "" {
		fmt.Println("SSL_MODE not set in .env file")
		os.Exit(1)
	}
	enableSS, err := strconv.ParseBool(enableSSL)
	if err != nil {
		fmt.Println("Invalid SSL_MODE value in .env file")
		os.Exit(1)
	}

	DBConfig = DbConfig{
		Host:      dbHost,
		Port:      dbportInt,
		User:      dbUser,
		Password:  dbPassword,
		Name:      dbName,
		EnableSSL: enableSS,
	}

	configurations = Config{
		Version:       version,
		ServiceName:   serviceName,
		HTTPPort:      httpPortInt,
		JwtSecret:     jwtSecret,
		AdminEmail:    adminEmail,
		AdminPassword: adminPassword,
		AdminLoginID:  adminLoginID,
		OpenAIAPIKey:  os.Getenv("OPENAI_API_KEY"),
		OpenAIModel:   openAIModel,
		OpenAIBaseURL: openAIBaseURL,
		DBConfig:      DBConfig,
	}

}

func GetConfig() *Config {
	loadConfig()
	return &configurations
}
