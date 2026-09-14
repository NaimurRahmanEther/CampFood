package studentpoints

import "backend/domain"

type service struct {
	repo StudentPointsRepository
}

func NewService(repo StudentPointsRepository) Service {
	return &service{repo: repo}
}

func (svc *service) GetState(userID string) (*domain.StudentPointState, error) {
	return svc.repo.GetState(userID)
}

func (svc *service) Transfer(senderUserID, receiverStudentID string, amount int) (*domain.StudentPointState, error) {
	return svc.repo.Transfer(senderUserID, receiverStudentID, amount)
}

func (svc *service) AcceptTransfer(receiverUserID, requestID string) (*domain.StudentPointState, error) {
	return svc.repo.AcceptTransfer(receiverUserID, requestID)
}

func (svc *service) RejectTransfer(receiverUserID, requestID string) (*domain.StudentPointState, error) {
	return svc.repo.RejectTransfer(receiverUserID, requestID)
}

func (svc *service) Redeem(userID string, amount int, note string) (*domain.StudentPointState, error) {
	return svc.repo.Redeem(userID, amount, note)
}

func (svc *service) AddBonus(userID string, amount int, note string) (*domain.StudentPointState, error) {
	return svc.repo.AddBonus(userID, amount, note)
}

func (svc *service) ActivateFreeDeliveryPartnerByEmail(email string) error {
	return svc.repo.ActivateFreeDeliveryPartnerByEmail(email)
}
