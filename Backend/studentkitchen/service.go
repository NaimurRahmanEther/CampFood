package studentkitchen

import (
	"backend/domain"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

type service struct {
	studentKitchenRepo StudentKitchenRepository
}

func NewService(studentKitchenRepo StudentKitchenRepository) Service {
	return &service{
		studentKitchenRepo: studentKitchenRepo,
	}
}

func (svc *service) RegisterStudentKitchen(studentKitchen domain.Student_kitchen) (*domain.Student_kitchen, error) {
	studentKitchen.Status = "pending"
	storedStudentKitchen, err := svc.studentKitchenRepo.RegisterStudentKitchen(studentKitchen)
	if err != nil {
		return nil, normalizeStudentKitchenRegistrationError(err)
	}
	return storedStudentKitchen, nil
}

func (svc *service) LoginStudentKitchen(email, password string) (*domain.Student_kitchen, error) {
	studentKitchen, err := svc.studentKitchenRepo.LoginStudentKitchen(email, password)
	if err != nil {
		return nil, normalizeStudentKitchenLoginError(err)
	}
	return studentKitchen, nil
}

func (svc *service) GetStudentKitchenByStudentID(studentID string) (*domain.Student_kitchen, error) {
	studentKitchen, err := svc.studentKitchenRepo.GetStudentKitchenByStudentID(studentID)
	if err != nil {
		return nil, err
	}

	return studentKitchen, nil
}

func normalizeStudentKitchenLoginError(err error) error {
	if errors.Is(err, sql.ErrNoRows) || strings.Contains(strings.ToLower(err.Error()), "no rows in result set") {
		return fmt.Errorf("Invalid kitchen email or password.")
	}

	return fmt.Errorf("Login failed. Please try again.")
}

func normalizeStudentKitchenRegistrationError(err error) error {
	normalizedError := strings.ToLower(err.Error())

	if errors.Is(err, sql.ErrNoRows) || strings.Contains(normalizedError, "no rows in result set") {
		return fmt.Errorf("Student account was not found for this student ID.")
	}

	if strings.Contains(normalizedError, "duplicate key value violates unique constraint") {
		switch {
		case strings.Contains(normalizedError, "student_kitchen_student_id_key"), strings.Contains(normalizedError, "(student_id)="):
			return fmt.Errorf("A student kitchen already exists for this student ID.")
		case strings.Contains(normalizedError, "student_kitchen_email_key"), strings.Contains(normalizedError, "(email)="):
			return fmt.Errorf("This email is already registered.")
		case strings.Contains(normalizedError, "student_kitchen_phone_number_key"), strings.Contains(normalizedError, "(phone_number)="):
			return fmt.Errorf("This phone number is already registered.")
		default:
			return fmt.Errorf("This student kitchen information is already in use.")
		}
	}

	return fmt.Errorf("Could not create student kitchen account right now. Please try again.")
}
