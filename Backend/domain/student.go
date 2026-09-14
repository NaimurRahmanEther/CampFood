package domain

import "time"

type Student struct {
	UserID      string    `db:"user_id" json:"user_id"`
	FullName    string    `db:"full_name" json:"full_name"`
	StudentId   string    `db:"student_id" json:"student_id"`
	Email       string    `db:"email" json:"email"`
	Password    string    `db:"password" json:"password"`
	PhoneNumber string    `db:"phone_number" json:"phone_number"`
	HallName    string    `db:"hall_name" json:"hall_name"`
	Department  string    `db:"department" json:"department"`
	CreatedAt   time.Time `db:"create_at" json:"create_at"`
	UpdatedAt   time.Time `db:"update_at" json:"update_at"`
}
