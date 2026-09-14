package orders

import (
	"backend/domain"
	"backend/utils"
)

type Service interface {
	Create(student utils.Payload, routeMode string, items []domain.CreateDeliveryOrderItem, deliveryDetails domain.DeliveryDetails) (*domain.DeliveryOrder, error)
	List(viewer utils.Payload, scope string) ([]domain.DeliveryOrder, error)
	Accept(orderID string, courier utils.Payload, plan string) (*domain.DeliveryOrder, error)
	Complete(orderID string, courier utils.Payload) (*domain.DeliveryOrder, int, error)
	SendChatMessage(orderID string, sender utils.Payload, message string) (*domain.DeliveryOrder, error)
	ForwardToPaid(orderID, adminName string) (*domain.DeliveryOrder, error)
	Cancel(orderID, adminName, reason string) (*domain.DeliveryOrder, error)
}
