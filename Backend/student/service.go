package student

import (
	"backend/domain"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

type service struct {
	studentRepo StudentRepository
}

func NewService(studentRepo StudentRepository) Service {
	return &service{
		studentRepo: studentRepo,
	}
}

func (svc *service) RegisterStudent(student domain.Student) (*domain.Student, error) {
	storedStudent, err := svc.studentRepo.RegisterStudent(student)
	if err != nil {
		return nil, normalizeStudentRegistrationError(err)
	}
	return storedStudent, nil
}

func (svc *service) LoginStudent(studentId, email, password string) (*domain.Student, error) {
	student, err := svc.studentRepo.LoginStudent(studentId, email, password)
	if err != nil {
		return nil, normalizeStudentLoginError(err)
	}
	return student, nil
}

func (svc *service) UpdateStudentProfile(userID, fullName string) (*domain.Student, error) {
	student, err := svc.studentRepo.UpdateStudentProfile(userID, fullName)
	if err != nil {
		return nil, err
	}
	return student, nil
}

func normalizeStudentLoginError(err error) error {
	if errors.Is(err, sql.ErrNoRows) || strings.Contains(strings.ToLower(err.Error()), "no rows in result set") {
		return fmt.Errorf("Invalid student ID, email, or password.")
	}

	return fmt.Errorf("Login failed. Please try again.")
}

func normalizeStudentRegistrationError(err error) error {
	normalizedError := strings.ToLower(err.Error())
	if strings.Contains(normalizedError, "duplicate key value violates unique constraint") {
		switch {
		case strings.Contains(normalizedError, "student_student_id_key"), strings.Contains(normalizedError, "(student_id)="):
			return fmt.Errorf("This student ID is already registered.")
		case strings.Contains(normalizedError, "student_email_key"), strings.Contains(normalizedError, "(email)="):
			return fmt.Errorf("This email is already registered.")
		case strings.Contains(normalizedError, "student_phone_number_key"), strings.Contains(normalizedError, "(phone_number)="):
			return fmt.Errorf("This phone number is already registered.")
		default:
			return fmt.Errorf("This student account information is already in use.")
		}
	}

	return fmt.Errorf("Could not create student account right now. Please try again.")
}
