package aiassistant

import (
	"backend/middlewares"
	"net/http"
)

func (h *Handler) RegisterRoutes(mux *http.ServeMux, manager *middlewares.Manager) {
	mux.Handle("POST /ai/chat", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.Chat))))
}
