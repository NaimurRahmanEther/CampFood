package domain

import "time"

type Hall_kitchen struct {
	UserID       string    `db:"user_id" json:"user_id"`
	KitchenName  string    `db:"kitchen_name" json:"kitchen_name"`
	ManagerPhone string    `db:"manager_phone" json:"manager_phone"`
	Email        string    `db:"email" json:"email"`
	Password     string    `db:"password" json:"password"`
	PhoneNumber  string    `db:"phone_number" json:"phone_number"`
	HallName     string    `db:"hall_name" json:"hall_name"`
	Subscription int       `db:"subscription" json:"subscription"`
	Status       string    `db:"status" json:"status"`
	CreatedAt    time.Time `db:"create_at" json:"create_at"`
	UpdatedAt    time.Time `db:"update_at" json:"update_at"`
}
