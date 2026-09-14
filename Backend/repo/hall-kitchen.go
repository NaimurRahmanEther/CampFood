package repo

import (
	"backend/domain"
	"backend/hallkitchen"

	"github.com/jmoiron/sqlx"
)

type HallKitchenRepository interface {
	hallkitchen.HallKitchenRepository
}

type hallKitchenRepo struct {
	db *sqlx.DB
}

func NewHallKitchenRepo(db *sqlx.DB) HallKitchenRepository {
	repo := &hallKitchenRepo{
		db: db,
	}
	return repo
}

func (r *hallKitchenRepo) RegisterHallKitchen(hallKitchen domain.Hall_kitchen) (*domain.Hall_kitchen, error) {
	query := `INSERT INTO hall_kitchen (kitchen_name, manager_phone, email, password, phone_number, hall_name, subscription)
	          VALUES ($1, $2, $3, $4, $5, $6, $7)
			  RETURNING user_id::text, status, create_at, update_at`

	var userId string
	var status string

	err := r.db.QueryRow(
		query,
		hallKitchen.KitchenName,
		hallKitchen.ManagerPhone,
		hallKitchen.Email,
		hallKitchen.Password,
		hallKitchen.PhoneNumber,
		hallKitchen.HallName,
		hallKitchen.Subscription,
	).Scan(&userId, &status, &hallKitchen.CreatedAt, &hallKitchen.UpdatedAt)
	if err != nil {
		return nil, err
	}

	hallKitchen.UserID = userId
	hallKitchen.Status = status

	if err := notifyAdminKitchenRegistrationRequested(
		r.db,
		"hall_kitchen",
		hallKitchen.KitchenName,
		hallKitchen.UserID,
	); err != nil {
		return nil, err
	}
	if err := notifyKitchenRegistrationSubmitted(r.db, "hall_kitchen", hallKitchen.UserID); err != nil {
		return nil, err
	}

	return &hallKitchen, nil
}

func (r *hallKitchenRepo) LoginHallKitchen(email, password string) (*domain.Hall_kitchen, error) {
	query := `SELECT user_id::text as user_id, kitchen_name, manager_phone, email, password, phone_number, hall_name, subscription, status, create_at, update_at
	          FROM hall_kitchen
			  WHERE email = $1 AND password = $2
			  LIMIT 1`

	var hallKitchen domain.Hall_kitchen
	err := r.db.Get(&hallKitchen, query, email, password)
	if err != nil {
		return nil, err
	}

	return &hallKitchen, nil
}
