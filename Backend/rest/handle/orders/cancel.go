package orders

import (
	"backend/utils"
	"encoding/json"
	"net/http"
)

type cancelOrderRequest struct {
	Reason string `json:"reason"`
}

func (h *Handler) CancelOrder(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok || user.Type != "admin" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req cancelOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	order, err := h.service.Cancel(r.PathValue("id"), user.FullName, req.Reason)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	utils.SendDataFunc(w, order, http.StatusOK)
}
