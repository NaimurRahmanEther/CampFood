package studentpoints

import "backend/domain"

type Service interface {
	GetState(userID string) (*domain.StudentPointState, error)
	Transfer(senderUserID, receiverStudentID string, amount int) (*domain.StudentPointState, error)
	AcceptTransfer(receiverUserID, requestID string) (*domain.StudentPointState, error)
	RejectTransfer(receiverUserID, requestID string) (*domain.StudentPointState, error)
	Redeem(userID string, amount int, note string) (*domain.StudentPointState, error)
}
