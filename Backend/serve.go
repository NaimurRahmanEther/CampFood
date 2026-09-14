package main

import (
	"backend/admin"
	"backend/aiassistant"
	"backend/campkitchen"
	"backend/cmd"
	"backend/config"
	foodservice "backend/food"
	"backend/hallfest"
	"backend/hallkitchen"
	"backend/infra/db"
	"backend/middlewares"
	"backend/notifications"
	"backend/orders"
	"backend/products"
	"backend/repo"
	adminHandle "backend/rest/handle/admin"
	assistantHandle "backend/rest/handle/aiassistant"
	campKitchenHandle "backend/rest/handle/campkitchen"
	foodhandle "backend/rest/handle/food"
	hallFestHandle "backend/rest/handle/hallfest"
	hallKitchenHandle "backend/rest/handle/hallkitchen"
	notificationHandle "backend/rest/handle/notifications"
	ordersHandle "backend/rest/handle/orders"
	"backend/rest/handle/product"
	"backend/rest/handle/student"
	"backend/rest/handle/studentkitchen"
	studentPointsHandle "backend/rest/handle/studentpoints"
	students "backend/student"
	studentkitchens "backend/studentkitchen"
	"backend/studentpoints"

	"errors"
	"fmt"
	"os"
	"time"
)

const deliveryOrderAutoForwardSweepInterval = 30 * time.Second

func serve() {

	cnf := config.GetConfig()

	dbConn, err := db.Connect(cnf.DBConfig)
	if err != nil {
		fmt.Println("Failed to connect to the database:", err)
		os.Exit(1)
	}

	err = db.MigrateDb(dbConn, "./migration")
	if err != nil {
		fmt.Println("Failed to migrate the database:", err)
		os.Exit(1)
	}

	studentRepo := repo.NewStudentRepo(dbConn)
	campKitchenRepo := repo.NewCampKitchenRepo(dbConn)
	studentKitchenRepo := repo.NewStudentKitchenRepo(dbConn)
	hallKitchenRepo := repo.NewHallKitchenRepo(dbConn)
	productRepo := repo.NewProductRepo(dbConn)
	foodRepo := repo.NewFoodRepo(dbConn)
	adminRepo := repo.NewAdminRepo(dbConn, cnf)
	studentPointsRepo := repo.NewStudentPointsRepo(dbConn)
	ordersRepo := repo.NewOrdersRepo(dbConn)
	hallFestRepo := repo.NewHallFestRepo(dbConn)
	notificationRepo := repo.NewNotificationRepo(dbConn)

	middleware := middlewares.NewMiddlewares(cnf)

	campKitchenService := campkitchen.NewService(campKitchenRepo)
	studentService := students.NewService(studentRepo)
	studentKitchenService := studentkitchens.NewService(studentKitchenRepo)
	hallKitchenService := hallkitchen.NewService(hallKitchenRepo)
	productService := products.NewService(productRepo, adminRepo)
	foodService := foodservice.NewService(foodRepo, adminRepo)
	adminService := admin.NewService(adminRepo)
	studentPointsService := studentpoints.NewService(studentPointsRepo)
	ordersService := orders.NewService(ordersRepo)
	hallFestService := hallfest.NewService(hallFestRepo)
	notificationService := notifications.NewService(notificationRepo)
	assistantService := aiassistant.NewService(cnf, foodService, ordersService)
	startDeliveryOrderAutoForwardWorker(ordersService)

	adminHandlers := adminHandle.NewHandler(adminService, cnf, middleware)
	campKitchenHandlers := campKitchenHandle.NewHandler(campKitchenService, cnf)
	productHandler := product.NewHandler(middleware, productService)
	foodHandler := foodhandle.NewHandler(middleware, foodService)
	hallKitchenHandlers := hallKitchenHandle.NewHandler(hallKitchenService, cnf)
	userHandlers := student.NewHandler(studentService, cnf, middleware)
	studentKitchenHandlers := studentkitchen.NewHandler(studentKitchenService, cnf, middleware)
	studentPointsHandler := studentPointsHandle.NewHandler(middleware, studentPointsService)
	ordersHandler := ordersHandle.NewHandler(ordersService)
	hallFestHandler := hallFestHandle.NewHandler(middleware, hallFestService)
	notificationHandler := notificationHandle.NewHandler(middleware, notificationService)
	assistantHandler := assistantHandle.NewHandler(assistantService, middleware)

	server := cmd.NewServer(adminHandlers, campKitchenHandlers, userHandlers, studentKitchenHandlers, hallKitchenHandlers, productHandler, foodHandler, studentPointsHandler, ordersHandler, hallFestHandler, notificationHandler, assistantHandler, cnf)
	err = cmd.Serve(server, cnf)
	if err != nil {
		if errors.Is(err, cmd.ErrBackendAlreadyRunning) {
			fmt.Printf(
				"Backend is already running on http://localhost:%d. Stop that process first if you want to restart with new code.\n",
				cnf.HTTPPort,
			)
			return
		}
		fmt.Println("Server is not running:", err)
		os.Exit(1)
	}

}

func startDeliveryOrderAutoForwardWorker(ordersService orders.Service) {
	if err := ordersService.RunAutoForwardSweep(); err != nil {
		fmt.Println("Initial delivery auto-forward sweep failed:", err)
	}

	go func() {
		ticker := time.NewTicker(deliveryOrderAutoForwardSweepInterval)
		defer ticker.Stop()

		for range ticker.C {
			if err := ordersService.RunAutoForwardSweep(); err != nil {
				fmt.Println("Delivery auto-forward sweep failed:", err)
			}
		}
	}()
}
