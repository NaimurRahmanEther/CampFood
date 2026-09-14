package food

import (
	"backend/middlewares"
	"net/http"
)

func (h *Handler) FoodRoutes(mux *http.ServeMux, manager *middlewares.Manager) {
	mux.Handle("GET /foods", manager.Apply(http.HandlerFunc(h.GetAllFood)))
	mux.Handle("GET /foods/mine", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.GetMyFoods))))
	mux.Handle("POST /foods", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.CreateFood))))
	mux.Handle("GET /foods/{id}/reviews", manager.Apply(http.HandlerFunc(h.ListFoodReviews)))
	mux.Handle("POST /foods/{id}/reviews", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.UpsertFoodReview))))
	mux.Handle("GET /foods/{id}", manager.Apply(http.HandlerFunc(h.GetFoodByID)))
	mux.Handle("PUT /foods/{id}", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.UpdateFood))))
	mux.Handle("DELETE /foods/{id}", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.DeleteFood))))
}
