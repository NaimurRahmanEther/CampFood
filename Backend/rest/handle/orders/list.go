package orders

import (
	"backend/utils"
	"net/http"
)

func (h *Handler) ListOrders(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	scope := r.URL.Query().Get("scope")
	orders, err := h.service.List(user, scope)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	utils.SendDataFunc(w, orders, http.StatusOK)
}
