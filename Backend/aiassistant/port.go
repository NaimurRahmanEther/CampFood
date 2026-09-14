package aiassistant

import (
	"backend/domain"
	"backend/utils"
)

type Service interface {
	Chat(user utils.Payload, message string, history []ChatMessage) (*ChatResponse, error)
}

type FoodService interface {
	List(query domain.FoodCatalogQuery) (*domain.FoodCatalogResponse, error)
}

type OrdersService interface {
	Create(student utils.Payload, routeMode string, items []domain.CreateDeliveryOrderItem, deliveryDetails domain.DeliveryDetails) (*domain.DeliveryOrder, error)
}
