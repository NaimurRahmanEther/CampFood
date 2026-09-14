package repo

import (
	"backend/domain"
	"backend/hallfest"
	"database/sql"

	"github.com/jmoiron/sqlx"
)

type HallFestRepository interface {
	hallfest.HallFestRepository
}

type hallFestRepo struct {
	db *sqlx.DB
}

type hallFestRow struct {
	ID            string `db:"id"`
	KitchenUserID string `db:"kitchen_user_id"`
	Title         string `db:"title"`
	FestDate      string `db:"fest_date"`
	SpecialMenu   string `db:"special_menu"`
	Notes         string `db:"notes"`
	IsActive      bool   `db:"is_active"`
	UpdatedAt     string `db:"updated_at"`
}

func NewHallFestRepo(db *sqlx.DB) HallFestRepository {
	return &hallFestRepo{db: db}
}

func (r *hallFestRepo) ListByKitchen(kitchenUserID string) ([]domain.HallFest, error) {
	var rows []hallFestRow
	if err := r.db.Select(&rows, `SELECT id::text as id, kitchen_user_id, title, fest_date, special_menu, notes, is_active, updated_at::text as updated_at FROM hall_fests WHERE kitchen_user_id = $1 ORDER BY updated_at DESC, id DESC`, kitchenUserID); err != nil {
		return nil, err
	}

	fests := make([]domain.HallFest, 0, len(rows))
	for _, row := range rows {
		fests = append(fests, domain.HallFest{
			ID:            row.ID,
			KitchenUserID: row.KitchenUserID,
			Title:         row.Title,
			FestDate:      row.FestDate,
			SpecialMenu:   row.SpecialMenu,
			Notes:         row.Notes,
			IsActive:      row.IsActive,
			UpdatedAt:     parseTimeOrNow(row.UpdatedAt),
		})
	}

	return fests, nil
}

func (r *hallFestRepo) Create(fest domain.HallFest) (*domain.HallFest, error) {
	var updatedAt string
	if err := r.db.QueryRow(
		`INSERT INTO hall_fests (kitchen_user_id, title, fest_date, special_menu, notes, is_active)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id::text, updated_at::text`,
		fest.KitchenUserID,
		fest.Title,
		fest.FestDate,
		fest.SpecialMenu,
		fest.Notes,
		fest.IsActive,
	).Scan(&fest.ID, &updatedAt); err != nil {
		return nil, err
	}

	fest.UpdatedAt = parseTimeOrNow(updatedAt)
	return &fest, nil
}

func (r *hallFestRepo) Update(fest domain.HallFest) (*domain.HallFest, error) {
	var updatedAt string
	if err := r.db.QueryRow(
		`UPDATE hall_fests
		 SET title = $1, fest_date = $2, special_menu = $3, notes = $4, is_active = $5, updated_at = current_timestamp
		 WHERE id::text = $6 AND kitchen_user_id = $7
		 RETURNING updated_at::text`,
		fest.Title,
		fest.FestDate,
		fest.SpecialMenu,
		fest.Notes,
		fest.IsActive,
		fest.ID,
		fest.KitchenUserID,
	).Scan(&updatedAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, err
		}
		return nil, err
	}

	fest.UpdatedAt = parseTimeOrNow(updatedAt)
	return &fest, nil
}

func (r *hallFestRepo) Delete(id, kitchenUserID string) error {
	result, err := r.db.Exec(`DELETE FROM hall_fests WHERE id::text = $1 AND kitchen_user_id = $2`, id, kitchenUserID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}
