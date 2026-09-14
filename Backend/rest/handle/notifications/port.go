package notifications

import "backend/domain"

type Service interface {
	List(userID, userType string, limit int) (*domain.UserNotificationFeed, error)
	MarkRead(userID, userType, notificationID string) error
	MarkAllRead(userID, userType string) error
}
