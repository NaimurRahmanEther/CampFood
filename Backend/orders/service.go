package orders

import (
	"backend/domain"
	"backend/utils"
	"fmt"
	"regexp"
	"strings"
)

const maxDeliveryChatMessageLength = 500
const maxOrderCancelReasonLength = 500
const (
	maxDeliveryRecipientNameLength = 120
	maxDeliveryPhoneLength         = 32
	maxDeliveryHallNameLength      = 120
	maxDeliveryAddressLength       = 500
	maxDeliveryLandmarkLength      = 180
	maxDeliveryNoteLength          = 300
)

var deliveryPhonePattern = regexp.MustCompile(`^[0-9+()\-\s]{7,32}$`)

type service struct {
	repo OrdersRepository
}

func NewService(repo OrdersRepository) Service {
	return &service{
		repo: repo,
	}
}

func (svc *service) Create(
	student utils.Payload,
	routeMode string,
	items []domain.CreateDeliveryOrderItem,
	deliveryDetails domain.DeliveryDetails,
) (*domain.DeliveryOrder, error) {
	normalizedRouteMode, err := resolveCreateRouteMode(routeMode)
	if err != nil {
		return nil, err
	}

	normalizedDeliveryDetails, err := normalizeDeliveryDetails(deliveryDetails)
	if err != nil {
		return nil, err
	}

	return svc.repo.Create(student, normalizedRouteMode, items, normalizedDeliveryDetails)
}

func (svc *service) List(viewer utils.Payload, scope string) ([]domain.DeliveryOrder, error) {
	resolvedScope, err := resolveOrderListScope(viewer, scope)
	if err != nil {
		return nil, err
	}

	if resolvedScope == "queue" {
		freePlanApproved, err := svc.repo.HasDeliveryPlanAccess(viewer.UserID, viewer.Email, "free")
		if err != nil {
			return nil, err
		}

		permanentPlanApproved, err := svc.repo.HasDeliveryPlanAccess(viewer.UserID, viewer.Email, "permanent")
		if err != nil {
			return nil, err
		}

		if !freePlanApproved && !permanentPlanApproved {
			return nil, fmt.Errorf("delivery queue access is not approved yet")
		}
	}

	return svc.repo.List(viewer, resolvedScope)
}

func (svc *service) RunAutoForwardSweep() error {
	return svc.repo.AutoForwardExpiredFreeQueueOrders()
}

func (svc *service) Accept(orderID string, courier utils.Payload, plan string) (*domain.DeliveryOrder, error) {
	normalizedPlan := strings.ToLower(strings.TrimSpace(plan))
	if normalizedPlan != "free" && normalizedPlan != "permanent" {
		return nil, fmt.Errorf("delivery plan must be free or permanent")
	}

	hasAccess, err := svc.repo.HasDeliveryPlanAccess(courier.UserID, courier.Email, normalizedPlan)
	if err != nil {
		return nil, err
	}
	if !hasAccess {
		return nil, fmt.Errorf("%s delivery plan is not approved for your account", normalizedPlan)
	}

	return svc.repo.Accept(orderID, courier, normalizedPlan)
}

func (svc *service) Complete(orderID string, courier utils.Payload) (*domain.DeliveryOrder, int, error) {
	order, reward, err := svc.repo.Complete(orderID, courier)
	if err != nil {
		return nil, 0, err
	}

	return order, reward, nil
}

func (svc *service) SendChatMessage(orderID string, sender utils.Payload, message string) (*domain.DeliveryOrder, error) {
	trimmedMessage := strings.TrimSpace(message)
	if trimmedMessage == "" {
		return nil, fmt.Errorf("message is required")
	}

	if len([]rune(trimmedMessage)) > maxDeliveryChatMessageLength {
		return nil, fmt.Errorf("message is too long")
	}

	return svc.repo.SendChatMessage(orderID, sender, trimmedMessage)
}

func (svc *service) ForwardToPaid(orderID, adminName string) (*domain.DeliveryOrder, error) {
	return svc.repo.ForwardToPaid(orderID, adminName)
}

func (svc *service) Cancel(orderID, adminName, reason string) (*domain.DeliveryOrder, error) {
	trimmedReason := strings.TrimSpace(reason)
	if trimmedReason == "" {
		return nil, fmt.Errorf("cancel reason is required")
	}

	if len([]rune(trimmedReason)) > maxOrderCancelReasonLength {
		return nil, fmt.Errorf("cancel reason is too long")
	}

	return svc.repo.Cancel(orderID, adminName, trimmedReason)
}

func resolveOrderListScope(viewer utils.Payload, scope string) (string, error) {
	normalizedScope := strings.ToLower(strings.TrimSpace(scope))

	if normalizedScope == "" {
		if viewer.Type == "admin" {
			return "all", nil
		}

		if viewer.Type == "student" {
			return "mine", nil
		}

		return "", fmt.Errorf("delivery orders are only available for admin and student accounts")
	}

	switch normalizedScope {
	case "mine":
		if viewer.Type == "admin" || viewer.Type == "student" {
			return normalizedScope, nil
		}
		return "", fmt.Errorf("delivery orders are only available for admin and student accounts")
	case "queue":
		if viewer.Type != "student" {
			return "", fmt.Errorf("only student delivery partners can open the delivery queue")
		}
		return normalizedScope, nil
	case "all":
		if viewer.Type != "admin" {
			return "", fmt.Errorf("admin access is required to view all delivery orders")
		}
		return normalizedScope, nil
	default:
		return "", fmt.Errorf("invalid delivery order scope")
	}
}

func resolveCreateRouteMode(routeMode string) (string, error) {
	normalizedRouteMode := strings.ToLower(strings.TrimSpace(routeMode))
	if normalizedRouteMode == "" {
		return string(domain.DeliveryRouteModeFreeFirst), nil
	}

	if normalizedRouteMode == string(domain.DeliveryRouteModeFreeFirst) || normalizedRouteMode == string(domain.DeliveryRouteModePaidOnly) {
		return normalizedRouteMode, nil
	}

	return "", fmt.Errorf("delivery route must be free-first or paid-only")
}

func normalizeDeliveryDetails(input domain.DeliveryDetails) (domain.DeliveryDetails, error) {
	normalized := domain.DeliveryDetails{
		RecipientName: strings.TrimSpace(input.RecipientName),
		Phone:         strings.TrimSpace(input.Phone),
		HallName:      strings.TrimSpace(input.HallName),
		AddressLine:   strings.TrimSpace(input.AddressLine),
		Landmark:      strings.TrimSpace(input.Landmark),
		Note:          strings.TrimSpace(input.Note),
	}

	if normalized.RecipientName == "" {
		return domain.DeliveryDetails{}, fmt.Errorf("recipient name is required")
	}
	if len([]rune(normalized.RecipientName)) > maxDeliveryRecipientNameLength {
		return domain.DeliveryDetails{}, fmt.Errorf("recipient name is too long")
	}

	if normalized.Phone == "" {
		return domain.DeliveryDetails{}, fmt.Errorf("phone number is required")
	}
	if len([]rune(normalized.Phone)) > maxDeliveryPhoneLength {
		return domain.DeliveryDetails{}, fmt.Errorf("phone number is too long")
	}
	if !deliveryPhonePattern.MatchString(normalized.Phone) {
		return domain.DeliveryDetails{}, fmt.Errorf("phone number format is invalid")
	}

	if normalized.HallName == "" {
		return domain.DeliveryDetails{}, fmt.Errorf("delivery hall/zone is required")
	}
	if len([]rune(normalized.HallName)) > maxDeliveryHallNameLength {
		return domain.DeliveryDetails{}, fmt.Errorf("delivery hall/zone is too long")
	}

	if normalized.AddressLine == "" {
		return domain.DeliveryDetails{}, fmt.Errorf("delivery address is required")
	}
	if len([]rune(normalized.AddressLine)) > maxDeliveryAddressLength {
		return domain.DeliveryDetails{}, fmt.Errorf("delivery address is too long")
	}

	if len([]rune(normalized.Landmark)) > maxDeliveryLandmarkLength {
		return domain.DeliveryDetails{}, fmt.Errorf("landmark is too long")
	}
	if len([]rune(normalized.Note)) > maxDeliveryNoteLength {
		return domain.DeliveryDetails{}, fmt.Errorf("delivery note is too long")
	}

	return normalized, nil
}
