package repo

import (
	"backend/domain"
	"backend/studentkitchen"
	"fmt"
	"strings"

	"github.com/jmoiron/sqlx"
)

type StudentKitchenRepository interface {
	studentkitchen.StudentKitchenRepository
}

type studentKitchenRepo struct {
	db *sqlx.DB
}

func NewStudentKitchenRepo(db *sqlx.DB) StudentKitchenRepository {
	repo := &studentKitchenRepo{
		db: db,
	}
	return repo
}

func (r *studentKitchenRepo) RegisterStudentKitchen(studentKitchen domain.Student_kitchen) (*domain.Student_kitchen, error) {
	if strings.TrimSpace(studentKitchen.Password) == "" && strings.TrimSpace(studentKitchen.StudentId) != "" {
		var studentPassword string
		if err := r.db.Get(&studentPassword, `SELECT password FROM student WHERE student_id = $1`, studentKitchen.StudentId); err != nil {
			return nil, err
		}
		studentKitchen.Password = strings.TrimSpace(studentPassword)
	}

	if strings.TrimSpace(studentKitchen.Password) == "" {
		return nil, fmt.Errorf("password is required")
	}

	query := `INSERT INTO student_kitchen (seller_name, student_id, email, password, phone_number, hall_name)
	          VALUES ($1, $2, $3, $4, $5, $6)
		  RETURNING user_id::text, status, create_at, update_at`

	var userId string
	var status string

	err := r.db.QueryRow(
		query,
		studentKitchen.SellerName,
		studentKitchen.StudentId,
		studentKitchen.Email,
		studentKitchen.Password,
		studentKitchen.PhoneNumber,
		studentKitchen.HallName,
	).Scan(&userId, &status, &studentKitchen.CreatedAt, &studentKitchen.UpdatedAt)
	if err != nil {
		return nil, err
	}
	studentKitchen.UserID = userId
	studentKitchen.Status = status

	if err := notifyAdminKitchenRegistrationRequested(
		r.db,
		"student_kitchen",
		studentKitchen.SellerName,
		studentKitchen.UserID,
	); err != nil {
		return nil, err
	}
	if err := notifyKitchenRegistrationSubmitted(r.db, "student_kitchen", studentKitchen.UserID); err != nil {
		return nil, err
	}

	return &studentKitchen, nil
}

func (r *studentKitchenRepo) LoginStudentKitchen(email, password string) (*domain.Student_kitchen, error) {
	query := `SELECT user_id::text as user_id, seller_name, student_id, email, password, phone_number, hall_name, status, create_at, update_at
	          FROM student_kitchen
			  WHERE email = $1 AND password = $2
			  LIMIT 1`

	var studentKitchen domain.Student_kitchen
	err := r.db.Get(&studentKitchen, query, email, password)
	if err != nil {
		return nil, err
	}

	return &studentKitchen, nil
}

func (r *studentKitchenRepo) GetStudentKitchenByStudentID(studentID string) (*domain.Student_kitchen, error) {
	query := `SELECT user_id::text as user_id, seller_name, student_id, email, password, phone_number, hall_name, status, create_at, update_at
	          FROM student_kitchen
			  WHERE student_id = $1
			  LIMIT 1`

	var studentKitchen domain.Student_kitchen
	err := r.db.Get(&studentKitchen, query, studentID)
	if err != nil {
		return nil, err
	}

	return &studentKitchen, nil
}
