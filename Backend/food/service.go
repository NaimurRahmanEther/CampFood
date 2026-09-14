package food

import (
	"backend/admin"
	"backend/domain"
	"fmt"
	"strings"
)

type service struct {
	foodRepo  FoodRepository
	adminRepo admin.AdminRepository
}

func NewService(foodRepo FoodRepository, adminRepo admin.AdminRepository) Service {
	return &service{
		foodRepo:  foodRepo,
		adminRepo: adminRepo,
	}
}

func (svc *service) Store(f domain.Food) (*domain.Food, error) {
	food, err := svc.foodRepo.Store(f)
	if err != nil {
		return nil, err
	}

	if err := svc.enqueueFoodApproval(*food); err != nil {
		cleanupErr := svc.foodRepo.Delete(food.ID, food.UserID, food.KitchenType)
		if cleanupErr != nil {
			return nil, fmt.Errorf("create approval request: %w (cleanup failed: %v)", err, cleanupErr)
		}
		return nil, fmt.Errorf("create approval request: %w", err)
	}

	return food, nil
}

func (svc *service) List(query domain.FoodCatalogQuery) (*domain.FoodCatalogResponse, error) {
	food, err := svc.foodRepo.List(query)
	if err != nil {
		return nil, err
	}
	return food, nil
}

func (svc *service) ListByOwner(userID, kitchenType string) ([]*domain.Food, error) {
	food, err := svc.foodRepo.ListByOwner(userID, kitchenType)
	if err != nil {
		return nil, err
	}
	return food, nil
}

func (svc *service) GetByID(id int) (*domain.Food, error) {
	food, err := svc.foodRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	return food, nil
}

func (svc *service) GetByIDForOwner(id int, userID, kitchenType string) (*domain.Food, error) {
	food, err := svc.foodRepo.GetByIDForOwner(id, userID, kitchenType)
	if err != nil {
		return nil, err
	}
	return food, nil
}

func (svc *service) ListReviews(foodID int) (*domain.FoodReviewSummary, error) {
	_, err := svc.foodRepo.GetByID(foodID)
	if err != nil {
		return nil, err
	}

	return svc.foodRepo.ListReviews(foodID)
}

func (svc *service) UpsertReview(input domain.FoodReviewInput) (*domain.FoodReviewSummary, error) {
	if input.Rating < 1 || input.Rating > 5 {
		return nil, fmt.Errorf("rating must be between 1 and 5")
	}

	input.Comment = strings.TrimSpace(input.Comment)
	if input.Comment == "" {
		return nil, fmt.Errorf("comment is required")
	}

	input.StudentName = strings.TrimSpace(input.StudentName)
	if input.StudentName == "" {
		input.StudentName = "Student User"
	}

	_, err := svc.foodRepo.GetByID(input.FoodID)
	if err != nil {
		return nil, err
	}

	if _, err := svc.foodRepo.UpsertReview(input); err != nil {
		return nil, err
	}

	return svc.foodRepo.ListReviews(input.FoodID)
}

func (svc *service) Update(f domain.Food) (*domain.Food, error) {
	food, err := svc.foodRepo.Update(f)
	if err != nil {
		return nil, err
	}

	if err := svc.enqueueFoodApproval(*food); err != nil {
		return nil, fmt.Errorf("create approval request: %w", err)
	}

	return food, nil
}

func (svc *service) Delete(id int, userID, kitchenType string) error {
	err := svc.foodRepo.Delete(id, userID, kitchenType)
	if err != nil {
		return err
	}
	return nil
}

func (svc *service) IsKitchenApproved(userID, kitchenType string) (bool, error) {
	return svc.adminRepo.IsKitchenApproved(userID, kitchenType)
}

func (svc *service) enqueueFoodApproval(food domain.Food) error {
	if food.ApplicantEmail == "" {
		return fmt.Errorf("applicant email is required")
	}

	_, err := svc.adminRepo.CreateApprovalRequest(
		"food-listing",
		food.ProviderName,
		food.ApplicantEmail,
		mapFoodApprovalPayload(food),
	)
	return err
}

func mapFoodApprovalPayload(food domain.Food) map[string]string {
	return map[string]string{
		"foodId":         fmt.Sprintf("%d", food.ID),
		"foodName":       food.FoodName,
		"category":       food.Category,
		"mealTime":       food.MealTime,
		"foodOption":     food.FoodOption,
		"hallName":       food.HallName,
		"price":          food.Price,
		"stock":          fmt.Sprintf("%d", food.Stock),
		"visible":        fmt.Sprintf("%t", food.Visible),
		"kitchenUserId":  food.UserID,
		"kitchenRole":    mapKitchenRole(food.KitchenType),
		"providerName":   food.ProviderName,
		"providerType":   food.ProviderType,
		"approvalStatus": food.ApprovalStatus,
	}
}

func mapKitchenRole(kitchenType string) string {
	switch kitchenType {
	case "hall_kitchen":
		return "hall-kitchen"
	case "camp_kitchen":
		return "campus-kitchen"
	default:
		return "student-kitchen"
	}
}
