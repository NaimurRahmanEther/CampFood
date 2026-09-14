package notifications

import (
	"backend/utils"
	"net/http"
	"strings"
)

func (h *Handler) MarkRead(w http.ResponseWriter, r *http.Request) {
	userID, userType, ok := resolveNotificationUser(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	notificationID := strings.TrimSpace(r.PathValue("id"))
	if notificationID == "" {
		http.Error(w, "notification id is required", http.StatusBadRequest)
		return
	}

	if err := h.service.MarkRead(userID, userType, notificationID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	utils.SendDataFunc(w, map[string]bool{"ok": true}, http.StatusOK)
}
