package campkitchen

import (
	"backend/domain"
	"backend/rest/handle/campkitchen"
)

type Service interface {
	campkitchen.Service
}

type CampKitchenRepository interface {
	RegisterCampKitchen(campKitchen domain.Camp_kitchen) (*domain.Camp_kitchen, error)
	LoginCampKitchen(email, password string) (*domain.Camp_kitchen, error)
}
