package products

import (
	"backend/admin"
	"backend/domain"
)

type service struct {
	productRepo ProductRepository
	adminRepo   admin.AdminRepository
}

func NewService(productRepo ProductRepository, adminRepo admin.AdminRepository) Service {
	return &service{
		productRepo: productRepo,
		adminRepo:   adminRepo,
	}
}

func (svc *service) Store(p domain.Product) (*domain.Product, error) {
	product, err := svc.productRepo.Store(p)
	if err != nil {
		return nil, err
	}

	return product, nil

}
func (svc *service) List() ([]*domain.Product, error) {
	product, err := svc.productRepo.List()
	if err != nil {
		return nil, err
	}
	return product, nil
}
func (svc *service) GetByID(id int) (*domain.Product, error) {
	product, err := svc.productRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	return product, nil

}
func (svc *service) Update(p domain.Product) (*domain.Product, error) {
	product, err := svc.productRepo.Update(p)
	if err != nil {
		return nil, err
	}
	return product, nil

}
func (svc *service) Delete(id int) error {
	err := svc.productRepo.Delete(id)
	if err != nil {
		return err
	}
	return nil
}

func (svc *service) IsKitchenApproved(userID, kitchenType string) (bool, error) {
	return svc.adminRepo.IsKitchenApproved(userID, kitchenType)
}
