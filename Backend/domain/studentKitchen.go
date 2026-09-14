package domain

import "time"

type Student_kitchen struct {
	UserID      string    `db:"user_id" json:"user_id"`
	SellerName  string    `db:"seller_name" json:"seller_name"`
	StudentId   string    `db:"student_id" json:"student_id"`
	Email       string    `db:"email" json:"email"`
	Password    string    `db:"password" json:"password"`
	PhoneNumber string    `db:"phone_number" json:"phone_number"`
	HallName    string    `db:"hall_name" json:"hall_name"`
	Status      string    `db:"status" json:"status"`
	CreatedAt   time.Time `db:"create_at" json:"create_at"`
	UpdatedAt   time.Time `db:"update_at" json:"update_at"`
}
