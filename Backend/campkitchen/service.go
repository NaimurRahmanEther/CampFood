package campkitchen

import (
	"backend/domain"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

type service struct {
	campKitchenRepo CampKitchenRepository
}

func NewService(campKitchenRepo CampKitchenRepository) Service {
	return &service{
		campKitchenRepo: campKitchenRepo,
	}
}

func (svc *service) RegisterCampKitchen(campKitchen domain.Camp_kitchen) (*domain.Camp_kitchen, error) {
	campKitchen.Status = "pending"
	storedCampKitchen, err := svc.campKitchenRepo.RegisterCampKitchen(campKitchen)
	if err != nil {
		return nil, normalizeCampKitchenRegistrationError(err)
	}
	return storedCampKitchen, nil
}

func (svc *service) LoginCampKitchen(email, password string) (*domain.Camp_kitchen, error) {
	campKitchen, err := svc.campKitchenRepo.LoginCampKitchen(email, password)
	if err != nil {
		return nil, normalizeCampKitchenLoginError(err)
	}
	return campKitchen, nil
}

func normalizeCampKitchenLoginError(err error) error {
	if errors.Is(err, sql.ErrNoRows) || strings.Contains(strings.ToLower(err.Error()), "no rows in result set") {
		return fmt.Errorf("Invalid kitchen email or password.")
	}

	return fmt.Errorf("Login failed. Please try again.")
}

func normalizeCampKitchenRegistrationError(err error) error {
	normalizedError := strings.ToLower(err.Error())
	if strings.Contains(normalizedError, "duplicate key value violates unique constraint") {
		switch {
		case strings.Contains(normalizedError, "camp_kitchen_email_key"), strings.Contains(normalizedError, "(email)="):
			return fmt.Errorf("This email is already registered.")
		case strings.Contains(normalizedError, "camp_kitchen_phone_number_key"), strings.Contains(normalizedError, "(phone_number)="):
			return fmt.Errorf("This phone number is already registered.")
		case strings.Contains(normalizedError, "camp_kitchen_manager_phone_key"), strings.Contains(normalizedError, "(manager_phone)="):
			return fmt.Errorf("This manager phone number is already registered.")
		case strings.Contains(normalizedError, "camp_kitchen_trade_license_key"), strings.Contains(normalizedError, "(trade_license)="):
			return fmt.Errorf("This trade license is already registered.")
		default:
			return fmt.Errorf("This campus kitchen information is already in use.")
		}
	}

	return fmt.Errorf("Could not create campus kitchen account right now. Please try again.")
}
