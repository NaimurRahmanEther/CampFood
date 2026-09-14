package hallkitchen

import (
	"backend/domain"
	"backend/rest/handle/hallkitchen"
)

type Service interface {
	hallkitchen.Service
}

type HallKitchenRepository interface {
	RegisterHallKitchen(hallKitchen domain.Hall_kitchen) (*domain.Hall_kitchen, error)
	LoginHallKitchen(email, password string) (*domain.Hall_kitchen, error)
}
