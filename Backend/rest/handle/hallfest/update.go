package hallfest

import (
	"backend/domain"
	"backend/utils"
	"encoding/json"
	"net/http"
)

func (h *Handler) UpdateFest(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok || user.Type != "hall_kitchen" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req festRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	item, err := h.service.Update(domain.HallFest{
		ID:            r.PathValue("id"),
		KitchenUserID: user.UserID,
		Title:         req.Title,
		FestDate:      req.FestDate,
		SpecialMenu:   req.SpecialMenu,
		Notes:         req.Notes,
		IsActive:      req.IsActive,
	})
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	utils.SendDataFunc(w, item, http.StatusOK)
}
