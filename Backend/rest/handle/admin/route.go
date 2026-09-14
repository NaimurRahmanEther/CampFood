package admin

import (
	"backend/middlewares"
	"net/http"
)

func (h *Handler) RegisterRoutes(mux *http.ServeMux, manager *middlewares.Manager) {
	mux.Handle("POST /admin/login", manager.Apply(http.HandlerFunc(h.LoginAdmin)))
	mux.Handle("GET /admin/pending-kitchens", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.GetPendingKitchens))))
	mux.Handle("POST /admin/approve-kitchen", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.ApproveKitchen))))
	mux.Handle("POST /admin/reject-kitchen", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.RejectKitchen))))
	mux.Handle("GET /admin/approvals", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.GetApprovalRequests))))
	mux.Handle("PATCH /admin/approvals/{id}", h.middlewares.AuthMiddleware(manager.Apply(http.HandlerFunc(h.ReviewApprovalRequest))))
	mux.Handle("POST /approval-requests", manager.Apply(http.HandlerFunc(h.CreateApprovalRequest)))
	mux.Handle("GET /approval-requests/status", manager.Apply(http.HandlerFunc(h.GetApprovalStatus)))
}
