package admin

import (
	"backend/domain"
	"fmt"
	"net/mail"
	"sort"
	"strings"
)

type service struct {
	adminRepo AdminRepository
}

func NewService(adminRepo AdminRepository) Service {
	return &service{
		adminRepo: adminRepo,
	}
}

func (svc *service) LoginAdmin(email, password string) (*domain.Admin, error) {
	admin, err := svc.adminRepo.LoginAdmin(email, password)
	if err != nil {
		return nil, err
	}
	return admin, nil
}

func (svc *service) GetPendingKitchens() ([]domain.KitchenApprovalRequest, error) {
	var requests []domain.KitchenApprovalRequest

	studentKitchens, err := svc.adminRepo.GetPendingStudentKitchens()
	if err != nil {
		return nil, err
	}
	for _, k := range studentKitchens {
		requests = append(requests, domain.KitchenApprovalRequest{
			ID:     k.UserID,
			Type:   "student_kitchen",
			Status: k.Status,
		})
	}

	hallKitchens, err := svc.adminRepo.GetPendingHallKitchens()
	if err != nil {
		return nil, err
	}
	for _, k := range hallKitchens {
		requests = append(requests, domain.KitchenApprovalRequest{
			ID:     k.UserID,
			Type:   "hall_kitchen",
			Status: k.Status,
		})
	}

	campKitchens, err := svc.adminRepo.GetPendingCampKitchens()
	if err != nil {
		return nil, err
	}
	for _, k := range campKitchens {
		requests = append(requests, domain.KitchenApprovalRequest{
			ID:     k.UserID,
			Type:   "camp_kitchen",
			Status: k.Status,
		})
	}

	return requests, nil
}

func (svc *service) ApproveKitchen(kitchenType, id, adminEmail string) error {
	switch kitchenType {
	case "student_kitchen":
		if err := svc.adminRepo.UpdateStudentKitchenStatus(id, "approved"); err != nil {
			return err
		}
	case "hall_kitchen":
		if err := svc.adminRepo.UpdateHallKitchenStatus(id, "approved"); err != nil {
			return err
		}
	case "camp_kitchen":
		if err := svc.adminRepo.UpdateCampKitchenStatus(id, "approved"); err != nil {
			return err
		}
	default:
		return fmt.Errorf("invalid kitchen type")
	}

	return svc.adminRepo.LogKitchenApproval(kitchenType, id, "approved", adminEmail)
}

func (svc *service) RejectKitchen(kitchenType, id, adminEmail string) error {
	switch kitchenType {
	case "student_kitchen":
		if err := svc.adminRepo.UpdateStudentKitchenStatus(id, "rejected"); err != nil {
			return err
		}
	case "hall_kitchen":
		if err := svc.adminRepo.UpdateHallKitchenStatus(id, "rejected"); err != nil {
			return err
		}
	case "camp_kitchen":
		if err := svc.adminRepo.UpdateCampKitchenStatus(id, "rejected"); err != nil {
			return err
		}
	default:
		return fmt.Errorf("invalid kitchen type")
	}

	return svc.adminRepo.LogKitchenApproval(kitchenType, id, "rejected", adminEmail)
}

func (svc *service) GetApprovalRequests() ([]domain.ApprovalRequest, error) {
	requests, err := svc.adminRepo.ListApprovalRequests()
	if err != nil {
		return nil, err
	}

	studentKitchens, err := svc.adminRepo.ListStudentKitchens()
	if err != nil {
		return nil, err
	}
	for _, kitchen := range studentKitchens {
		requests = append(requests, domain.ApprovalRequest{
			ID:             "kitchen:student_kitchen:" + kitchen.UserID,
			Type:           "kitchen-registration",
			ApplicantName:  kitchen.SellerName,
			ApplicantEmail: kitchen.Email,
			Status:         kitchen.Status,
			SubmittedAt:    kitchen.CreatedAt,
			Payload: map[string]string{
				"kitchenRole":   "student-kitchen",
				"kitchenUserId": kitchen.UserID,
				"phone":         kitchen.PhoneNumber,
				"hallName":      kitchen.HallName,
				"studentId":     kitchen.StudentId,
			},
		})
	}

	hallKitchens, err := svc.adminRepo.ListHallKitchens()
	if err != nil {
		return nil, err
	}
	for _, kitchen := range hallKitchens {
		requests = append(requests, domain.ApprovalRequest{
			ID:             "kitchen:hall_kitchen:" + kitchen.UserID,
			Type:           "kitchen-registration",
			ApplicantName:  kitchen.KitchenName,
			ApplicantEmail: kitchen.Email,
			Status:         kitchen.Status,
			SubmittedAt:    kitchen.CreatedAt,
			Payload: map[string]string{
				"kitchenRole":   "hall-kitchen",
				"kitchenUserId": kitchen.UserID,
				"phone":         kitchen.PhoneNumber,
				"hallName":      kitchen.HallName,
				"managerPhone":  kitchen.ManagerPhone,
				"subscription":  fmt.Sprintf("%d", kitchen.Subscription),
			},
		})
	}

	campKitchens, err := svc.adminRepo.ListCampKitchens()
	if err != nil {
		return nil, err
	}
	for _, kitchen := range campKitchens {
		requests = append(requests, domain.ApprovalRequest{
			ID:             "kitchen:camp_kitchen:" + kitchen.UserID,
			Type:           "kitchen-registration",
			ApplicantName:  kitchen.KitchenName,
			ApplicantEmail: kitchen.Email,
			Status:         kitchen.Status,
			SubmittedAt:    kitchen.CreatedAt,
			Payload: map[string]string{
				"kitchenRole":   "campus-kitchen",
				"kitchenUserId": kitchen.UserID,
				"phone":         kitchen.PhoneNumber,
				"managerPhone":  kitchen.ManagerPhone,
				"location":      kitchen.Location,
				"tradeLicense":  kitchen.TradeLicense,
				"subscription":  fmt.Sprintf("%d", kitchen.Subscription),
			},
		})
	}

	sort.Slice(requests, func(i, j int) bool {
		return requests[i].SubmittedAt.After(requests[j].SubmittedAt)
	})

	return requests, nil
}

func (svc *service) CreateApprovalRequest(requestType, applicantName, applicantEmail string, payload map[string]string) (*domain.ApprovalRequest, error) {
	normalizedType := normalizeApprovalRequestType(requestType)
	normalizedName := strings.TrimSpace(applicantName)
	normalizedEmail, err := normalizeApprovalEmail(applicantEmail)
	if err != nil {
		return nil, err
	}
	if normalizedName == "" {
		return nil, fmt.Errorf("applicantName is required")
	}

	normalizedPayload := normalizeApprovalPayload(payload)
	if err := validateApprovalCreatePayload(normalizedType, normalizedPayload); err != nil {
		return nil, err
	}

	return svc.adminRepo.CreateApprovalRequest(normalizedType, normalizedName, normalizedEmail, normalizedPayload)
}

func (svc *service) GetApprovalStatus(requestType, applicantEmail string, payload map[string]string) (string, error) {
	normalizedType := normalizeApprovalRequestType(requestType)
	normalizedEmail, err := normalizeApprovalEmail(applicantEmail)
	if err != nil {
		return "", err
	}

	normalizedPayload := normalizeApprovalPayload(payload)
	if err := validateApprovalStatusPayload(normalizedType, normalizedPayload); err != nil {
		return "", err
	}

	requests, err := svc.adminRepo.FindApprovalRequests(normalizedType, normalizedEmail)
	if err != nil {
		return "", err
	}

	for _, request := range requests {
		if matchesApprovalPayload(request.Payload, payload) {
			return request.Status, nil
		}
	}

	return "not-submitted", nil
}

func (svc *service) ReviewApprovalRequest(id, status, reviewNote, adminEmail string) error {
	if status != "approved" && status != "rejected" {
		return fmt.Errorf("invalid approval status")
	}

	if strings.HasPrefix(id, "kitchen:") {
		parts := strings.Split(id, ":")
		if len(parts) != 3 {
			return fmt.Errorf("invalid kitchen approval request id")
		}

		if status == "approved" {
			return svc.ApproveKitchen(parts[1], parts[2], adminEmail)
		}

		return svc.RejectKitchen(parts[1], parts[2], adminEmail)
	}

	request, err := svc.adminRepo.ReviewApprovalRequest(id, status, reviewNote)
	if err != nil {
		return err
	}

	if request.Type == "food-listing" {
		kitchenRoleDB, mapErr := mapKitchenRoleToDB(request.Payload["kitchenRole"])
		if mapErr != nil {
			return mapErr
		}

		if err := svc.adminRepo.UpdateFoodApprovalStatus(
			request.Payload["foodId"],
			request.Payload["kitchenUserId"],
			kitchenRoleDB,
			status,
		); err != nil {
			return err
		}
	}

	if request.Type == "delivery-registration" && status == "approved" && request.Payload["plan"] == "free" {
		if err := svc.adminRepo.ActivateFreeDeliveryPartnerByEmail(request.ApplicantEmail); err != nil {
			return err
		}
	}

	return nil
}

func matchesApprovalPayload(payload, filters map[string]string) bool {
	for key, value := range filters {
		if value == "" {
			continue
		}
		if payload[key] != value {
			return false
		}
	}
	return true
}

func normalizeApprovalRequestType(requestType string) string {
	return strings.ToLower(strings.TrimSpace(requestType))
}

func normalizeApprovalEmail(applicantEmail string) (string, error) {
	email := strings.ToLower(strings.TrimSpace(applicantEmail))
	if email == "" {
		return "", fmt.Errorf("applicantEmail is required")
	}
	if _, err := mail.ParseAddress(email); err != nil {
		return "", fmt.Errorf("applicantEmail must be a valid email")
	}

	return email, nil
}

func normalizeApprovalPayload(payload map[string]string) map[string]string {
	if payload == nil {
		return map[string]string{}
	}

	normalized := make(map[string]string, len(payload))
	for key, value := range payload {
		trimmedKey := strings.TrimSpace(key)
		if trimmedKey == "" {
			continue
		}
		normalized[trimmedKey] = strings.TrimSpace(value)
	}

	return normalized
}

func validateApprovalCreatePayload(requestType string, payload map[string]string) error {
	switch requestType {
	case "delivery-registration":
		plan := strings.ToLower(strings.TrimSpace(payload["plan"]))
		if plan != "free" && plan != "permanent" {
			return fmt.Errorf("delivery registration plan must be free or permanent")
		}
		payload["plan"] = plan
		return nil
	case "food-listing":
		if strings.TrimSpace(payload["foodId"]) == "" {
			return fmt.Errorf("foodId is required for food listing approval")
		}
		if strings.TrimSpace(payload["kitchenUserId"]) == "" {
			return fmt.Errorf("kitchenUserId is required for food listing approval")
		}
		if _, err := mapKitchenRoleToDB(payload["kitchenRole"]); err != nil {
			return err
		}
		return nil
	default:
		return fmt.Errorf("invalid approval request type")
	}
}

func validateApprovalStatusPayload(requestType string, payload map[string]string) error {
	switch requestType {
	case "delivery-registration":
		plan := strings.ToLower(strings.TrimSpace(payload["plan"]))
		if plan != "free" && plan != "permanent" {
			return fmt.Errorf("delivery registration plan must be free or permanent")
		}
		payload["plan"] = plan
		return nil
	case "food-listing":
		return nil
	default:
		return fmt.Errorf("invalid approval request type")
	}
}

func mapKitchenRoleToDB(role string) (string, error) {
	switch strings.TrimSpace(role) {
	case "hall-kitchen", "hall_kitchen":
		return "hall_kitchen", nil
	case "campus-kitchen", "camp_kitchen":
		return "camp_kitchen", nil
	case "student-kitchen", "student_kitchen":
		return "student_kitchen", nil
	default:
		return "", fmt.Errorf("invalid kitchen role")
	}
}
