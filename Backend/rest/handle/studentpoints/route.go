package studentpoints

import (
	"backend/middlewares"
	"net/http"
)

func (h *Handler) RegisterRoutes(mux *http.ServeMux, manager *middlewares.Manager) {
	mux.Handle("GET /students/me/points", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.GetState))))
	mux.Handle("POST /students/me/points/transfer", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.Transfer))))
	mux.Handle("POST /students/me/points/transfer-requests/{id}/accept", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.AcceptTransfer))))
	mux.Handle("POST /students/me/points/transfer-requests/{id}/reject", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.RejectTransfer))))
	mux.Handle("POST /students/me/points/redeem", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.Redeem))))
}
