package hallkitchen

import "backend/domain"

type Service interface {
	RegisterHallKitchen(hallKitchen domain.Hall_kitchen) (*domain.Hall_kitchen, error)
	LoginHallKitchen(email, password string) (*domain.Hall_kitchen, error)
}
