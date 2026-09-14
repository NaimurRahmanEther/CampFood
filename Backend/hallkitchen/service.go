package hallkitchen

import (
	"backend/domain"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

type service struct {
	hallKitchenRepo HallKitchenRepository
}

func NewService(hallKitchenRepo HallKitchenRepository) Service {
	return &service{
		hallKitchenRepo: hallKitchenRepo,
	}
}

func (svc *service) RegisterHallKitchen(hallKitchen domain.Hall_kitchen) (*domain.Hall_kitchen, error) {
	hallKitchen.Status = "pending"
	storedHallKitchen, err := svc.hallKitchenRepo.RegisterHallKitchen(hallKitchen)
	if err != nil {
		return nil, normalizeHallKitchenRegistrationError(err)
	}
	return storedHallKitchen, nil
}

func (svc *service) LoginHallKitchen(email, password string) (*domain.Hall_kitchen, error) {
	hallKitchen, err := svc.hallKitchenRepo.LoginHallKitchen(email, password)
	if err != nil {
		return nil, normalizeHallKitchenLoginError(err)
	}
	return hallKitchen, nil
}

func normalizeHallKitchenLoginError(err error) error {
	if errors.Is(err, sql.ErrNoRows) || strings.Contains(strings.ToLower(err.Error()), "no rows in result set") {
		return fmt.Errorf("Invalid kitchen email or password.")
	}

	return fmt.Errorf("Login failed. Please try again.")
}

func normalizeHallKitchenRegistrationError(err error) error {
	normalizedError := strings.ToLower(err.Error())
	if strings.Contains(normalizedError, "duplicate key value violates unique constraint") {
		switch {
		case strings.Contains(normalizedError, "hall_kitchen_email_key"), strings.Contains(normalizedError, "(email)="):
			return fmt.Errorf("This email is already registered.")
		case strings.Contains(normalizedError, "hall_kitchen_phone_number_key"), strings.Contains(normalizedError, "(phone_number)="):
			return fmt.Errorf("This phone number is already registered.")
		case strings.Contains(normalizedError, "hall_kitchen_manager_phone_key"), strings.Contains(normalizedError, "(manager_phone)="):
			return fmt.Errorf("This manager phone number is already registered.")
		default:
			return fmt.Errorf("This hall kitchen information is already in use.")
		}
	}

	return fmt.Errorf("Could not create hall kitchen account right now. Please try again.")
}
