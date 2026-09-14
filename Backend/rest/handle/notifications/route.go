package notifications

import (
	"backend/middlewares"
	"net/http"
)

func (h *Handler) RegisterRoutes(mux *http.ServeMux, manager *middlewares.Manager) {
	mux.Handle("GET /me/notifications", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.List))))
	mux.Handle("POST /me/notifications/{id}/read", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.MarkRead))))
	mux.Handle("POST /me/notifications/read-all", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.MarkAllRead))))

	mux.Handle("GET /students/me/notifications", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.List))))
	mux.Handle("POST /students/me/notifications/{id}/read", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.MarkRead))))
	mux.Handle("POST /students/me/notifications/read-all", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.MarkAllRead))))
}
