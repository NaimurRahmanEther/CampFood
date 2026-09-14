package notifications

import (
	"backend/domain"
	"fmt"
	"strconv"
	"strings"
)

const (
	defaultNotificationLimit = 20
	maxNotificationLimit     = 100
)

type service struct {
	repo NotificationRepository
}

func NewService(repo NotificationRepository) Service {
	return &service{repo: repo}
}

func (svc *service) List(userID, userType string, limit int) (*domain.UserNotificationFeed, error) {
	trimmedUserID := strings.TrimSpace(userID)
	if trimmedUserID == "" {
		return &domain.UserNotificationFeed{
			UnreadCount:   0,
			Notifications: []domain.UserNotification{},
		}, nil
	}
	trimmedUserType := strings.TrimSpace(userType)
	if trimmedUserType == "" {
		return &domain.UserNotificationFeed{
			UnreadCount:   0,
			Notifications: []domain.UserNotification{},
		}, nil
	}

	resolvedLimit := limit
	if resolvedLimit <= 0 {
		resolvedLimit = defaultNotificationLimit
	}
	if resolvedLimit > maxNotificationLimit {
		resolvedLimit = maxNotificationLimit
	}

	return svc.repo.List(trimmedUserID, trimmedUserType, resolvedLimit)
}

func (svc *service) MarkAllRead(userID, userType string) error {
	trimmedUserID := strings.TrimSpace(userID)
	if trimmedUserID == "" {
		return nil
	}
	trimmedUserType := strings.TrimSpace(userType)
	if trimmedUserType == "" {
		return nil
	}

	return svc.repo.MarkAllRead(trimmedUserID, trimmedUserType)
}

func (svc *service) MarkRead(userID, userType, notificationID string) error {
	trimmedUserID := strings.TrimSpace(userID)
	if trimmedUserID == "" {
		return nil
	}
	trimmedUserType := strings.TrimSpace(userType)
	if trimmedUserType == "" {
		return nil
	}

	trimmedNotificationID := strings.TrimSpace(notificationID)
	if trimmedNotificationID == "" {
		return fmt.Errorf("notification id is required")
	}

	if _, err := strconv.Atoi(trimmedNotificationID); err != nil {
		return fmt.Errorf("invalid notification id")
	}

	return svc.repo.MarkRead(trimmedUserID, trimmedUserType, trimmedNotificationID)
}
