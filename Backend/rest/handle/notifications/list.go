package notifications

import (
	"backend/utils"
	"net/http"
	"strconv"
	"strings"
)

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	userID, userType, ok := resolveNotificationUser(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	limit := 0
	rawLimit := strings.TrimSpace(r.URL.Query().Get("limit"))
	if rawLimit != "" {
		parsedLimit, err := strconv.Atoi(rawLimit)
		if err != nil || parsedLimit <= 0 {
			http.Error(w, "limit must be a positive integer", http.StatusBadRequest)
			return
		}
		limit = parsedLimit
	}

	feed, err := h.service.List(userID, userType, limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	utils.SendDataFunc(w, feed, http.StatusOK)
}
