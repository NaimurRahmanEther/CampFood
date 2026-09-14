package orders

import (
	"backend/utils"
	"encoding/json"
	"net/http"
)

type sendChatMessageRequest struct {
	Message string `json:"message"`
}

func (h *Handler) SendChatMessage(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok || user.Type != "student" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req sendChatMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	order, err := h.service.SendChatMessage(r.PathValue("id"), user, req.Message)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	utils.SendDataFunc(w, order, http.StatusOK)
}
