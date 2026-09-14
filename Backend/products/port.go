package products

import (
	"backend/domain"
	"backend/rest/handle/product"
)

type Service interface {
	product.Service
	IsKitchenApproved(userID, kitchenType string) (bool, error)
}

type ProductRepository interface {
	Store(p domain.Product) (*domain.Product, error)
	List() ([]*domain.Product, error)
	GetByID(id int) (*domain.Product, error)
	Update(product domain.Product) (*domain.Product, error)
	Delete(id int) error
}
