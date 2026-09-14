package notifications

import (
	"backend/utils"
	"net/http"
)

func (h *Handler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	userID, userType, ok := resolveNotificationUser(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if err := h.service.MarkAllRead(userID, userType); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	utils.SendDataFunc(w, map[string]bool{"ok": true}, http.StatusOK)
}
