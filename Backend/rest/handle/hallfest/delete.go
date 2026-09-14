package hallfest

import (
	"backend/utils"
	"net/http"
)

func (h *Handler) DeleteFest(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok || user.Type != "hall_kitchen" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if err := h.service.Delete(r.PathValue("id"), user.UserID); err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	utils.SendDataFunc(w, map[string]string{"message": "Hall fest deleted"}, http.StatusOK)
}
