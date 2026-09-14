package domain

import "time"

type HallFest struct {
	ID            string    `db:"id" json:"id"`
	KitchenUserID string    `db:"kitchen_user_id" json:"kitchenUserId"`
	Title         string    `db:"title" json:"title"`
	FestDate      string    `db:"fest_date" json:"festDate"`
	SpecialMenu   string    `db:"special_menu" json:"specialMenu"`
	Notes         string    `db:"notes" json:"notes"`
	IsActive      bool      `db:"is_active" json:"isActive"`
	UpdatedAt     time.Time `db:"updated_at" json:"updatedAt"`
}
