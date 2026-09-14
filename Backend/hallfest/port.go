package hallfest

import (
	"backend/domain"
	handler "backend/rest/handle/hallfest"
)

type Service interface {
	handler.Service
}

type HallFestRepository interface {
	ListByKitchen(kitchenUserID string) ([]domain.HallFest, error)
	Create(fest domain.HallFest) (*domain.HallFest, error)
	Update(fest domain.HallFest) (*domain.HallFest, error)
	Delete(id, kitchenUserID string) error
}
