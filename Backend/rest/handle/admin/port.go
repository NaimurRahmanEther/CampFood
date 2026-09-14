package admin

import "backend/domain"

type Service interface {
	LoginAdmin(email, password string) (*domain.Admin, error)
	GetPendingKitchens() ([]domain.KitchenApprovalRequest, error)
	ApproveKitchen(kitchenType, id, adminEmail string) error
	RejectKitchen(kitchenType, id, adminEmail string) error
	GetApprovalRequests() ([]domain.ApprovalRequest, error)
	CreateApprovalRequest(requestType, applicantName, applicantEmail string, payload map[string]string) (*domain.ApprovalRequest, error)
	GetApprovalStatus(requestType, applicantEmail string, payload map[string]string) (string, error)
	ReviewApprovalRequest(id, status, reviewNote, adminEmail string) error
}
