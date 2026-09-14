package product

import (
	"backend/middlewares"

	"net/http"
)

func (h *Handler) ProductRoutes(mux *http.ServeMux, manager *middlewares.Manager) {
	mux.Handle("GET /products", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.GetAllProducts))))
	mux.Handle("POST /products", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.CreateProduct))))
	mux.Handle("GET /products/{id}", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.GetProductByID))))
	mux.Handle("PUT /products/{id}", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.UpdateProduct))))
	mux.Handle("DELETE /products/{id}", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.DeleteProduct))))
}
