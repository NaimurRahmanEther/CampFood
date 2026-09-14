package food

import (
	"backend/utils"
	"database/sql"
	"errors"
	"net/http"
	"strconv"
)

func (h *Handler) ListFoodReviews(w http.ResponseWriter, r *http.Request) {
	foodID := r.PathValue("id")
	fid, err := strconv.Atoi(foodID)
	if err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	summary, err := h.service.ListReviews(fid)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "Food not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	utils.SendDataFunc(w, summary, http.StatusOK)
}
