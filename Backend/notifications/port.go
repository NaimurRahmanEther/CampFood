package notifications

import (
	"backend/domain"
	handler "backend/rest/handle/notifications"
)

type Service interface {
	handler.Service
}

type NotificationRepository interface {
	List(userID, userType string, limit int) (*domain.UserNotificationFeed, error)
	MarkRead(userID, userType, notificationID string) error
	MarkAllRead(userID, userType string) error
}
