package studentpoints

import (
	"backend/utils"
	"net/http"
)

func (h *Handler) AcceptTransfer(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok || user.Type != "student" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	state, err := h.service.AcceptTransfer(user.UserID, r.PathValue("id"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	utils.SendDataFunc(w, state, http.StatusOK)
}
