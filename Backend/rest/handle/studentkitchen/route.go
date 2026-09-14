package studentkitchen

import (
	"backend/middlewares"
	"net/http"
)

func (h *Handler) RegisterRoutes(mux *http.ServeMux, manager *middlewares.Manager) {
	mux.Handle("POST /student-kitchens", manager.Apply(http.HandlerFunc(h.CreateStudentKitchen)))
	mux.Handle("POST /student-kitchens/login", manager.Apply(http.HandlerFunc(h.LoginStudentKitchen)))
	mux.Handle("GET /student-kitchens/me", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.GetMyStudentKitchen))))
	mux.Handle("POST /student-kitchens/me", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.CreateMyStudentKitchen))))
	mux.Handle("POST /student-kitchens/me/access", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.CreateMyStudentKitchenAccessSession))))
}
