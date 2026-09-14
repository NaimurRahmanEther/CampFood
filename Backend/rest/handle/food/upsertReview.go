package food

import (
	"backend/domain"
	"backend/utils"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
)

type upsertFoodReviewRequest struct {
	Rating  int    `json:"rating"`
	Comment string `json:"comment"`
}

func (h *Handler) UpsertFoodReview(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok || user.Type != "student" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	foodID := r.PathValue("id")
	fid, err := strconv.Atoi(foodID)
	if err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	var req upsertFoodReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	summary, err := h.service.UpsertReview(domain.FoodReviewInput{
		FoodID:      fid,
		UserID:      user.UserID,
		StudentName: user.FullName,
		Rating:      req.Rating,
		Comment:     req.Comment,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "Food not found", http.StatusNotFound)
			return
		}
		if err.Error() == "rating must be between 1 and 5" {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err.Error() == "comment is required" {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	markCurrentUserReview(summary, user.UserID)
	utils.SendDataFunc(w, summary, http.StatusOK)
}

func markCurrentUserReview(summary *domain.FoodReviewSummary, userID string) {
	if summary == nil || userID == "" {
		return
	}

	for index := range summary.Reviews {
		if summary.Reviews[index].UserID != userID {
			continue
		}

		summary.Reviews[index].IsOwn = true
		review := summary.Reviews[index]
		summary.CurrentUserReview = &review
		return
	}
}
