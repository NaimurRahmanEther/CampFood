package orders

import (
	"backend/utils"
	"net/http"
)

func (h *Handler) ForwardToPaid(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok || user.Type != "admin" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	order, err := h.service.ForwardToPaid(r.PathValue("id"), user.FullName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	utils.SendDataFunc(w, order, http.StatusOK)
}
