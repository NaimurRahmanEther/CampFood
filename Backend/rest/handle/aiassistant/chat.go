package aiassistant

import (
	assistantsvc "backend/aiassistant"
	"backend/utils"
	"encoding/json"
	"net/http"
	"strings"
)

type chatRequest struct {
	Message string                     `json:"message"`
	History []assistantsvc.ChatMessage `json:"history"`
}

func (h *Handler) Chat(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok || user.Type != "student" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req chatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON payload", http.StatusBadRequest)
		return
	}

	req.Message = strings.TrimSpace(req.Message)
	if req.Message == "" {
		http.Error(w, "message is required", http.StatusBadRequest)
		return
	}

	response, err := h.service.Chat(user, req.Message, req.History)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	utils.SendDataFunc(w, response, http.StatusOK)
}
