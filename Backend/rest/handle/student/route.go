package student

import (
	"backend/middlewares"

	"net/http"
)

func (h *Handler) RegisterRoutes(mux *http.ServeMux, manager *middlewares.Manager) {
	mux.Handle("POST /students", manager.Apply(http.HandlerFunc(h.CreateUser)))
	mux.Handle("POST /students/login", manager.Apply(http.HandlerFunc(h.LoginUser)))
	mux.Handle("PATCH /students/me/profile", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.UpdateProfile))))
}
