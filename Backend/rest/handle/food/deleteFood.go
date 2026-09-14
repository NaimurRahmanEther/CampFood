package food

import (
	"backend/utils"
	"database/sql"
	"errors"
	"net/http"
	"strconv"
)

func (h *Handler) DeleteFood(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if user.Type != "student_kitchen" && user.Type != "hall_kitchen" && user.Type != "camp_kitchen" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	approved, err := h.service.IsKitchenApproved(user.UserID, user.Type)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	if !approved {
		http.Error(w, "Kitchen not approved", http.StatusForbidden)
		return
	}

	foodID := r.PathValue("id")
	fid, err := strconv.Atoi(foodID)
	if err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	err = h.service.Delete(fid, user.UserID, user.Type)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "Food not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	utils.SendDataFunc(w, "Deleted Successfully", http.StatusOK)
}
