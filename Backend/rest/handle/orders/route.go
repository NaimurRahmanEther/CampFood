package orders

import (
	"backend/middlewares"
	"net/http"
)

func (h *Handler) RegisterRoutes(mux *http.ServeMux, manager *middlewares.Manager, auth *middlewares.Middlewares) {
	mux.Handle("POST /orders", auth.AuthMiddleware(manager.Apply(http.HandlerFunc(h.CreateOrder))))
	mux.Handle("GET /delivery-orders", auth.AuthMiddleware(manager.Apply(http.HandlerFunc(h.ListOrders))))
	mux.Handle("POST /delivery-orders/{id}/accept", auth.AuthMiddleware(manager.Apply(http.HandlerFunc(h.AcceptOrder))))
	mux.Handle("POST /delivery-orders/{id}/complete", auth.AuthMiddleware(manager.Apply(http.HandlerFunc(h.CompleteOrder))))
	mux.Handle("POST /delivery-orders/{id}/chat", auth.AuthMiddleware(manager.Apply(http.HandlerFunc(h.SendChatMessage))))
	mux.Handle("POST /delivery-orders/{id}/forward-to-paid", auth.AuthMiddleware(manager.Apply(http.HandlerFunc(h.ForwardToPaid))))
	mux.Handle("POST /delivery-orders/{id}/cancel", auth.AuthMiddleware(manager.Apply(http.HandlerFunc(h.CancelOrder))))
}
