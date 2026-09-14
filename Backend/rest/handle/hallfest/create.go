package hallfest

import (
	"backend/domain"
	"backend/utils"
	"encoding/json"
	"net/http"
)

type festRequest struct {
	Title       string `json:"title"`
	FestDate    string `json:"festDate"`
	SpecialMenu string `json:"specialMenu"`
	Notes       string `json:"notes"`
	IsActive    bool   `json:"isActive"`
}

func (h *Handler) CreateFest(w http.ResponseWriter, r *http.Request) {
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

	item, err := h.service.Create(domain.HallFest{
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

	utils.SendDataFunc(w, item, http.StatusCreated)
}
