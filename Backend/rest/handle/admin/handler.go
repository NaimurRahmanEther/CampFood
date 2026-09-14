package admin

import (
	"backend/config"
	"backend/middlewares"
	"backend/utils"
	"encoding/json"
	"net/http"
)

type Handler struct {
	Service     Service
	cnf         *config.Config
	middlewares *middlewares.Middlewares
}

func NewHandler(service Service, cnf *config.Config, middlewares *middlewares.Middlewares) *Handler {
	return &Handler{
		Service:     service,
		cnf:         cnf,
		middlewares: middlewares,
	}
}

func (h *Handler) GetPendingKitchens(w http.ResponseWriter, r *http.Request) {
	requests, err := h.Service.GetPendingKitchens()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	utils.SendDataFunc(w, requests, http.StatusOK)
}

type ApprovalRequest struct {
	KitchenType string `json:"kitchen_type"`
	ID          string `json:"id"`
}

func (h *Handler) ApproveKitchen(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok || user.Type != "admin" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req ApprovalRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	err = h.Service.ApproveKitchen(req.KitchenType, req.ID, user.Email)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	utils.SendDataFunc(w, map[string]string{"message": "Kitchen approved"}, http.StatusOK)
}

func (h *Handler) RejectKitchen(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok || user.Type != "admin" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req ApprovalRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	err = h.Service.RejectKitchen(req.KitchenType, req.ID, user.Email)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	utils.SendDataFunc(w, map[string]string{"message": "Kitchen rejected"}, http.StatusOK)
}
