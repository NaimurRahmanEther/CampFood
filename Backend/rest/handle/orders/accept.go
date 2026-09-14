package orders

import (
	"backend/utils"
	"encoding/json"
	"net/http"
)

type acceptRequest struct {
	Plan string `json:"plan"`
}

func (h *Handler) AcceptOrder(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok || user.Type != "student" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req acceptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	order, err := h.service.Accept(r.PathValue("id"), user, req.Plan)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	utils.SendDataFunc(w, order, http.StatusOK)
}
