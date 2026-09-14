package cmd

import (
	"backend/config"
	"backend/middlewares"
	"backend/rest/handle/admin"
	"backend/rest/handle/aiassistant"
	"backend/rest/handle/campkitchen"
	"backend/rest/handle/food"
	"backend/rest/handle/hallfest"
	"backend/rest/handle/hallkitchen"
	"backend/rest/handle/notifications"
	"backend/rest/handle/orders"
	"backend/rest/handle/product"
	"backend/rest/handle/student"
	"backend/rest/handle/studentkitchen"
	"backend/rest/handle/studentpoints"

	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
	"syscall"
	"time"
)

var ErrBackendAlreadyRunning = errors.New("backend already running")

type Server struct {
	AdminHandler          *admin.Handler
	CampKitchenHandler    *campkitchen.Handler
	cnf                   *config.Config
	HallKitchenHandler    *hallkitchen.Handler
	StudentHandler        *student.Handler
	StudentKitchenHandler *studentkitchen.Handler
	ProductHandler        *product.Handler
	FoodHandler           *food.Handler
	StudentPointsHandler  *studentpoints.Handler
	OrdersHandler         *orders.Handler
	HallFestHandler       *hallfest.Handler
	NotificationHandler   *notifications.Handler
	AIAssistantHandler    *aiassistant.Handler
}

func NewServer(
	adminHandler *admin.Handler,
	campKitchenHandler *campkitchen.Handler,
	userHandler *student.Handler,
	studentKitchenHandler *studentkitchen.Handler,
	hallKitchenHandler *hallkitchen.Handler,
	productHandler *product.Handler,
	foodHandler *food.Handler,
	studentPointsHandler *studentpoints.Handler,
	ordersHandler *orders.Handler,
	hallFestHandler *hallfest.Handler,
	notificationHandler *notifications.Handler,
	aiAssistantHandler *aiassistant.Handler,
	cnf *config.Config,
) *Server {
	return &Server{
		AdminHandler:          adminHandler,
		CampKitchenHandler:    campKitchenHandler,
		cnf:                   cnf,
		HallKitchenHandler:    hallKitchenHandler,
		StudentHandler:        userHandler,
		StudentKitchenHandler: studentKitchenHandler,
		ProductHandler:        productHandler,
		FoodHandler:           foodHandler,
		StudentPointsHandler:  studentPointsHandler,
		OrdersHandler:         ordersHandler,
		HallFestHandler:       hallFestHandler,
		NotificationHandler:   notificationHandler,
		AIAssistantHandler:    aiAssistantHandler,
	}
}

func Serve(server *Server, cnf *config.Config) error {

	manager := middlewares.NewManager()

	manager.Use(middlewares.Logger, middlewares.Huddai)

	mux := http.NewServeMux()
	mux.Handle("GET /{$}", healthHandler(cnf))
	mux.Handle("GET /health", healthHandler(cnf))

	server.AdminHandler.RegisterRoutes(mux, manager)
	server.CampKitchenHandler.RegisterRoutes(mux, manager)
	server.StudentHandler.RegisterRoutes(mux, manager)
	server.StudentKitchenHandler.RegisterRoutes(mux, manager)
	server.HallKitchenHandler.RegisterRoutes(mux, manager)
	server.ProductHandler.ProductRoutes(mux, manager)
	server.FoodHandler.FoodRoutes(mux, manager)
	server.StudentPointsHandler.RegisterRoutes(mux, manager)
	server.OrdersHandler.RegisterRoutes(mux, manager, middlewares.NewMiddlewares(cnf))
	server.HallFestHandler.RegisterRoutes(mux, manager)
	server.NotificationHandler.RegisterRoutes(mux, manager)
	server.AIAssistantHandler.RegisterRoutes(mux, manager)
	mux.Handle("GET /uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))

	port := strconv.Itoa(cnf.HTTPPort)
	addr := ":" + port

	listener, err := net.Listen("tcp", addr)
	if err != nil {
		if errors.Is(err, syscall.EADDRINUSE) || strings.Contains(strings.ToLower(err.Error()), "address already in use") || strings.Contains(strings.ToLower(err.Error()), "only one usage of each socket address") {
			if backendAlreadyRunning(addr) {
				return fmt.Errorf("%w: http://localhost%s", ErrBackendAlreadyRunning, addr)
			}
			return fmt.Errorf("port %s is already in use, stop the existing process or change HTTP_PORT: %w", addr, err)
		}
		return fmt.Errorf("failed to bind %s: %w", addr, err)
	}

	fmt.Printf("Server is running on port %d (health: http://localhost%s/health)\n", cnf.HTTPPort, addr)

	err = http.Serve(listener, middlewares.GlobalMiddleware(mux))
	if err != nil {
		return fmt.Errorf("http server stopped: %w", err)
	}

	return nil
}

func IsBackendRunning(port int) bool {
	return backendAlreadyRunning(":" + strconv.Itoa(port))
}

type healthResponse struct {
	Status      string `json:"status"`
	ServiceName string `json:"serviceName"`
	Version     string `json:"version"`
}

func healthHandler(cnf *config.Config) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(healthResponse{
			Status:      "ok",
			ServiceName: cnf.ServiceName,
			Version:     cnf.Version,
		}); err != nil {
			http.Error(w, "failed to encode health response", http.StatusInternalServerError)
		}
	})
}

func backendAlreadyRunning(addr string) bool {
	client := http.Client{Timeout: 2 * time.Second}

	for _, path := range []string{"/health", "/foods"} {
		resp, err := client.Get("http://127.0.0.1" + addr + path)
		if err != nil {
			continue
		}
		resp.Body.Close()

		if resp.StatusCode == http.StatusOK {
			return true
		}
	}

	return false
}
