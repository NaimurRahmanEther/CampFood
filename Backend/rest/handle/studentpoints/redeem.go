package studentpoints

import (
	"backend/utils"
	"encoding/json"
	"net/http"
)

type redeemRequest struct {
	Amount int    `json:"amount"`
	Note   string `json:"note"`
}

func (h *Handler) Redeem(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok || user.Type != "student" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req redeemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	state, err := h.service.Redeem(user.UserID, req.Amount, req.Note)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	utils.SendDataFunc(w, state, http.StatusOK)
}
