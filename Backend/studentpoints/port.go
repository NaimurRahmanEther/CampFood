package studentpoints

import (
	"backend/domain"
	handler "backend/rest/handle/studentpoints"
)

type Service interface {
	handler.Service
	AddBonus(userID string, amount int, note string) (*domain.StudentPointState, error)
	ActivateFreeDeliveryPartnerByEmail(email string) error
}

type StudentPointsRepository interface {
	GetState(userID string) (*domain.StudentPointState, error)
	Transfer(senderUserID, receiverStudentID string, amount int) (*domain.StudentPointState, error)
	AcceptTransfer(receiverUserID, requestID string) (*domain.StudentPointState, error)
	RejectTransfer(receiverUserID, requestID string) (*domain.StudentPointState, error)
	Redeem(userID string, amount int, note string) (*domain.StudentPointState, error)
	AddBonus(userID string, amount int, note string) (*domain.StudentPointState, error)
	ActivateFreeDeliveryPartnerByEmail(email string) error
}
