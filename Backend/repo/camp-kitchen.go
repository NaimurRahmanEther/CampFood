package repo

import (
	"backend/campkitchen"
	"backend/domain"

	"github.com/jmoiron/sqlx"
)

type CampKitchenRepository interface {
	campkitchen.CampKitchenRepository
}

type campKitchenRepo struct {
	db *sqlx.DB
}

func NewCampKitchenRepo(db *sqlx.DB) CampKitchenRepository {
	repo := &campKitchenRepo{
		db: db,
	}
	return repo
}

func (r *campKitchenRepo) RegisterCampKitchen(campKitchen domain.Camp_kitchen) (*domain.Camp_kitchen, error) {
	query := `INSERT INTO camp_kitchen (kitchen_name, location, manager_phone, email, password, phone_number, trade_license, subscription)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			  RETURNING user_id::text, status, create_at, update_at`

	var userId string
	var status string
	err := r.db.QueryRow(
		query,
		campKitchen.KitchenName,
		campKitchen.Location,
		campKitchen.ManagerPhone,
		campKitchen.Email,
		campKitchen.Password,
		campKitchen.PhoneNumber,
		campKitchen.TradeLicense,
		campKitchen.Subscription,
	).Scan(&userId, &status, &campKitchen.CreatedAt, &campKitchen.UpdatedAt)
	if err != nil {
		return nil, err
	}
	campKitchen.UserID = userId
	campKitchen.Status = status

	if err := notifyAdminKitchenRegistrationRequested(
		r.db,
		"camp_kitchen",
		campKitchen.KitchenName,
		campKitchen.UserID,
	); err != nil {
		return nil, err
	}
	if err := notifyKitchenRegistrationSubmitted(r.db, "camp_kitchen", campKitchen.UserID); err != nil {
		return nil, err
	}

	return &campKitchen, nil
}

func (r *campKitchenRepo) LoginCampKitchen(email, password string) (*domain.Camp_kitchen, error) {
	query := `SELECT user_id::text as user_id, kitchen_name, location, manager_phone, email, password, phone_number, trade_license, subscription, status
	          FROM camp_kitchen
			  WHERE email = $1 AND password = $2
			  LIMIT 1`

	var campKitchen domain.Camp_kitchen
	err := r.db.Get(&campKitchen, query, email, password)
	if err != nil {
		return nil, err
	}

	return &campKitchen, nil
}
