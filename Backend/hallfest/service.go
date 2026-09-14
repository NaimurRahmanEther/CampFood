package hallfest

import "backend/domain"

type service struct {
	repo HallFestRepository
}

func NewService(repo HallFestRepository) Service {
	return &service{repo: repo}
}

func (svc *service) ListByKitchen(kitchenUserID string) ([]domain.HallFest, error) {
	return svc.repo.ListByKitchen(kitchenUserID)
}

func (svc *service) Create(fest domain.HallFest) (*domain.HallFest, error) {
	return svc.repo.Create(fest)
}

func (svc *service) Update(fest domain.HallFest) (*domain.HallFest, error) {
	return svc.repo.Update(fest)
}

func (svc *service) Delete(id, kitchenUserID string) error {
	return svc.repo.Delete(id, kitchenUserID)
}
