package studentpoints

import (
	"backend/utils"
	"encoding/json"
	"net/http"
)

type transferRequest struct {
	ReceiverID string `json:"receiverId"`
	Amount     int    `json:"amount"`
}

func (h *Handler) Transfer(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok || user.Type != "student" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req transferRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	state, err := h.service.Transfer(user.UserID, req.ReceiverID, req.Amount)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	utils.SendDataFunc(w, state, http.StatusOK)
}
