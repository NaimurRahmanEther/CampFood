package campkitchen

import "backend/domain"

type Service interface {
	RegisterCampKitchen(campKitchen domain.Camp_kitchen) (*domain.Camp_kitchen, error)
	LoginCampKitchen(email, password string) (*domain.Camp_kitchen, error)
}
