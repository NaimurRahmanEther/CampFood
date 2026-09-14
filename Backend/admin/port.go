package admin

import (
	"backend/domain"
	"backend/rest/handle/admin"
)

type Service interface {
	admin.Service
}

type AdminRepository interface {
	LoginAdmin(email, password string) (*domain.Admin, error)
	GetPendingStudentKitchens() ([]domain.Student_kitchen, error)
	GetPendingHallKitchens() ([]domain.Hall_kitchen, error)
	GetPendingCampKitchens() ([]domain.Camp_kitchen, error)
	ListStudentKitchens() ([]domain.Student_kitchen, error)
	ListHallKitchens() ([]domain.Hall_kitchen, error)
	ListCampKitchens() ([]domain.Camp_kitchen, error)
	UpdateStudentKitchenStatus(id, status string) error
	UpdateHallKitchenStatus(id, status string) error
	UpdateCampKitchenStatus(id, status string) error
	IsKitchenApproved(userID, kitchenType string) (bool, error)
	LogKitchenApproval(kitchenType, kitchenUserID, action, adminEmail string) error
	CreateApprovalRequest(requestType, applicantName, applicantEmail string, payload map[string]string) (*domain.ApprovalRequest, error)
	ListApprovalRequests() ([]domain.ApprovalRequest, error)
	FindApprovalRequests(requestType, applicantEmail string) ([]domain.ApprovalRequest, error)
	ReviewApprovalRequest(id, status, reviewNote string) (*domain.ApprovalRequest, error)
	UpdateFoodApprovalStatus(foodID, kitchenUserID, kitchenType, status string) error
	ActivateFreeDeliveryPartnerByEmail(email string) error
}
