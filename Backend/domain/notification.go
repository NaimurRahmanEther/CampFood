package domain

import "time"

type UserNotification struct {
	ID             string    `json:"id"`
	RecipientRole  string    `json:"recipientRole,omitempty"`
	Category       string    `json:"category"`
	Title          string    `json:"title"`
	Message        string    `json:"message"`
	RelatedOrderID string    `json:"relatedOrderId,omitempty"`
	IsRead         bool      `json:"isRead"`
	CreatedAt      time.Time `json:"createdAt"`
}

type UserNotificationFeed struct {
	UnreadCount   int                `json:"unreadCount"`
	Notifications []UserNotification `json:"notifications"`
}
