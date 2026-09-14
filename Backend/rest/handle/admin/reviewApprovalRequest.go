package admin

import (
	"backend/utils"
	"encoding/json"
	"net/http"
)

type ReviewApprovalRequestInput struct {
	Status     string `json:"status"`
	ReviewNote string `json:"reviewNote"`
}

func (h *Handler) ReviewApprovalRequest(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok || user.Type != "admin" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req ReviewApprovalRequestInput
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.Service.ReviewApprovalRequest(r.PathValue("id"), req.Status, req.ReviewNote, user.Email); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	utils.SendDataFunc(w, map[string]string{"message": "Approval request updated"}, http.StatusOK)
}
