package food

import "backend/domain"

type Service interface {
	Store(f domain.Food) (*domain.Food, error)
	List(query domain.FoodCatalogQuery) (*domain.FoodCatalogResponse, error)
	ListByOwner(userID, kitchenType string) ([]*domain.Food, error)
	GetByID(id int) (*domain.Food, error)
	GetByIDForOwner(id int, userID, kitchenType string) (*domain.Food, error)
	ListReviews(foodID int) (*domain.FoodReviewSummary, error)
	UpsertReview(input domain.FoodReviewInput) (*domain.FoodReviewSummary, error)
	Update(food domain.Food) (*domain.Food, error)
	Delete(id int, userID, kitchenType string) error
	IsKitchenApproved(userID, kitchenType string) (bool, error)
}
