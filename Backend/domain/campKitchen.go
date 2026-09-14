package domain

import "time"

type Camp_kitchen struct {
	UserID       string    `db:"user_id" json:"user_id"`
	KitchenName  string    `db:"kitchen_name" json:"kitchen_name"`
	Location     string    `db:"location" json:"location"`
	ManagerPhone string    `db:"manager_phone" json:"manager_phone"`
	Email        string    `db:"email" json:"email"`
	Password     string    `db:"password" json:"password"`
	PhoneNumber  string    `db:"phone_number" json:"phone_number"`
	TradeLicense string    `db:"trade_license" json:"trade_license"`
	Subscription int       `db:"subscription" json:"subscription"`
	Status       string    `db:"status" json:"status"`
	CreatedAt    time.Time `db:"create_at" json:"create_at"`
	UpdatedAt    time.Time `db:"update_at" json:"update_at"`
}
