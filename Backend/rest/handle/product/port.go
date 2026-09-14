package product

import "backend/domain"

type Service interface {
	Store(p domain.Product) (*domain.Product, error)
	List() ([]*domain.Product, error)
	GetByID(id int) (*domain.Product, error)
	Update(product domain.Product) (*domain.Product, error)
	Delete(id int) error
	IsKitchenApproved(userID, kitchenType string) (bool, error)
}
