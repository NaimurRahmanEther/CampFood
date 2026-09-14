package hallfest

import (
	"backend/middlewares"
	"net/http"
)

func (h *Handler) RegisterRoutes(mux *http.ServeMux, manager *middlewares.Manager) {
	mux.Handle("GET /hall-fests/mine", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.ListMine))))
	mux.Handle("POST /hall-fests", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.CreateFest))))
	mux.Handle("PUT /hall-fests/{id}", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.UpdateFest))))
	mux.Handle("DELETE /hall-fests/{id}", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.DeleteFest))))
}
