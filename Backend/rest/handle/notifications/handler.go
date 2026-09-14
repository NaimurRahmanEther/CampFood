package notifications

import (
	"backend/middlewares"
	"backend/utils"
	"net/http"
	"strings"
)

type Handler struct {
	middlewares *middlewares.Middlewares
	service     Service
}

func NewHandler(middlewares *middlewares.Middlewares, service Service) *Handler {
	return &Handler{
		middlewares: middlewares,
		service:     service,
	}
}

func resolveNotificationUser(r *http.Request) (string, string, bool) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok {
		return "", "", false
	}

	userID := strings.TrimSpace(user.UserID)
	userType := strings.TrimSpace(user.Type)
	if userID == "" || userType == "" {
		return "", "", false
	}

	switch userType {
	case "student", "admin", "student_kitchen", "hall_kitchen", "camp_kitchen":
		return userID, userType, true
	default:
		return "", "", false
	}
}
