package orders

import (
	"backend/utils"
	"net/http"
)

func (h *Handler) CompleteOrder(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok || user.Type != "student" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	order, reward, err := h.service.Complete(r.PathValue("id"), user)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	utils.SendDataFunc(w, map[string]interface{}{
		"order":        order,
		"rewardPoints": reward,
	}, http.StatusOK)
}
