package food

import (
	"backend/utils"
	"net/http"
)

func (h *Handler) GetMyFoods(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok || (user.Type != "student_kitchen" && user.Type != "hall_kitchen" && user.Type != "camp_kitchen") {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if user.Type == "hall_kitchen" || user.Type == "camp_kitchen" {
		approved, err := h.service.IsKitchenApproved(user.UserID, user.Type)
		if err != nil {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}
		if !approved {
			http.Error(w, "Kitchen not approved", http.StatusForbidden)
			return
		}
	}

	foods, err := h.service.ListByOwner(user.UserID, user.Type)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	utils.SendDataFunc(w, foods, http.StatusOK)
}
