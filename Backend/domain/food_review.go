package domain

import "time"

type FoodReview struct {
	ID          int       `db:"id" json:"id"`
	FoodID      int       `db:"food_id" json:"foodId"`
	UserID      string    `db:"user_id" json:"userId,omitempty"`
	StudentName string    `db:"student_name" json:"studentName"`
	Rating      int       `db:"rating" json:"rating"`
	Comment     string    `db:"comment" json:"comment"`
	CreatedAt   time.Time `db:"create_at" json:"createdAt"`
	UpdatedAt   time.Time `db:"update_at" json:"updatedAt"`
	IsOwn       bool      `db:"-" json:"isOwn,omitempty"`
}

type FoodReviewInput struct {
	FoodID      int
	UserID      string
	StudentName string
	Rating      int
	Comment     string
}

type FoodReviewSummary struct {
	FoodID            int          `json:"foodId"`
	AverageRating     float64      `json:"averageRating"`
	ReviewCount       int          `json:"reviewCount"`
	Reviews           []FoodReview `json:"reviews"`
	CurrentUserReview *FoodReview  `json:"currentUserReview,omitempty"`
}
