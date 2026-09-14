package hallfest

import "backend/domain"

type Service interface {
	ListByKitchen(kitchenUserID string) ([]domain.HallFest, error)
	Create(fest domain.HallFest) (*domain.HallFest, error)
	Update(fest domain.HallFest) (*domain.HallFest, error)
	Delete(id, kitchenUserID string) error
}
