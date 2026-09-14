package hallkitchen

import (
	"backend/middlewares"
	"net/http"
)

func (h *Handler) RegisterRoutes(mux *http.ServeMux, manager *middlewares.Manager) {
	mux.Handle("POST /hall-kitchens", manager.Apply(http.HandlerFunc(h.CreateHallKitchen)))
	mux.Handle("POST /hall-kitchens/login", manager.Apply(http.HandlerFunc(h.LoginHallKitchen)))
}
