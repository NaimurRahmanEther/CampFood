package hallfest

import (
	"backend/utils"
	"net/http"
)

func (h *Handler) ListMine(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok || user.Type != "hall_kitchen" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	items, err := h.service.ListByKitchen(user.UserID)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	utils.SendDataFunc(w, items, http.StatusOK)
}
