package repo

import (
	"backend/domain"
	"backend/student"
	"time"

	"github.com/jmoiron/sqlx"
)

type StudentRepository interface {
	student.StudentRepository
}

type studentRepo struct {
	db *sqlx.DB
}

func NewStudentRepo(db *sqlx.DB) StudentRepository {
	repo := &studentRepo{
		db: db,
	}
	return repo
}

func (r *studentRepo) RegisterStudent(student domain.Student) (*domain.Student, error) {
	tx, err := r.db.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	query := `INSERT INTO student (full_name, student_id, email, password, phone_number, hall_name, department)
	          VALUES ($1, $2, $3, $4, $5, $6, $7)
			  RETURNING user_id::text`
	var userID string
	err = tx.QueryRow(
		query,
		student.FullName,
		student.StudentId,
		student.Email,
		student.Password,
		student.PhoneNumber,
		student.HallName,
		student.Department,
	).Scan(&userID)
	if err != nil {
		return nil, err
	}
	student.UserID = userID

	if _, err := tx.Exec(
		`INSERT INTO student_points (student_user_id, points, total_earned, total_transferred, is_free_delivery_partner, updated_at)
		 VALUES ($1, 0, 0, 0, false, current_timestamp)
		 ON CONFLICT (student_user_id) DO NOTHING`,
		userID,
	); err != nil {
		return nil, err
	}

	if err := awardStudentBonusTx(tx, userID, registrationBonusPoints, registrationBonusNote, time.Now().UTC()); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return &student, nil
}

func (r *studentRepo) LoginStudent(studentId, email, password string) (*domain.Student, error) {
	query := `SELECT user_id::text as user_id, full_name, student_id, email, password, phone_number, hall_name, department, create_at, update_at
	          FROM student
			  WHERE student_id = $1 AND email = $2 AND password = $3`

	var student domain.Student
	err := r.db.Get(&student, query, studentId, email, password)
	if err != nil {
		return nil, err
	}
	return &student, nil

}

func (r *studentRepo) UpdateStudentProfile(userID, fullName string) (*domain.Student, error) {
	query := `UPDATE student
	          SET full_name = $1, update_at = current_timestamp
			  WHERE user_id = $2
			  RETURNING user_id::text as user_id, full_name, student_id, email, password, phone_number, hall_name, department, create_at, update_at`

	var student domain.Student
	err := r.db.Get(&student, query, fullName, userID)
	if err != nil {
		return nil, err
	}

	return &student, nil
}
