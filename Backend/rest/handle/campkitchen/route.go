package campkitchen

import (
	"backend/middlewares"
	"net/http"
)

func (h *Handler) RegisterRoutes(mux *http.ServeMux, manager *middlewares.Manager) {
	mux.Handle("POST /camp-kitchens", manager.Apply(http.HandlerFunc(h.CreateCampKitchen)))
	mux.Handle("POST /camp-kitchens/login", manager.Apply(http.HandlerFunc(h.LoginCampKitchen)))
}
