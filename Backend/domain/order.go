package domain

import "time"

type DeliveryRouteMode string

const (
	DeliveryRouteModeFreeFirst DeliveryRouteMode = "free-first"
	DeliveryRouteModePaidOnly  DeliveryRouteMode = "paid-only"
)

type CreateDeliveryOrderItem struct {
	FoodID      int    `json:"foodId"`
	Quantity    int    `json:"quantity"`
	PaymentMode string `json:"paymentMode"`
}

type DeliveryDetails struct {
	RecipientName string `json:"recipientName"`
	Phone         string `json:"phone"`
	HallName      string `json:"hallName"`
	AddressLine   string `json:"addressLine"`
	Landmark      string `json:"landmark,omitempty"`
	Note          string `json:"note,omitempty"`
}

type DeliveryOrderTotals struct {
	Items         int `json:"items"`
	CashSubtotal  int `json:"cashSubtotal"`
	ServiceCharge int `json:"serviceCharge"`
	CashPayable   int `json:"cashPayable"`
	PointsPayable int `json:"pointsPayable"`
}

type DeliveryOrderItem struct {
	ID             string `json:"id,omitempty"`
	FoodID         int    `json:"foodId"`
	FoodName       string `json:"foodName"`
	ProviderName   string `json:"providerName"`
	ProviderType   string `json:"providerType"`
	Quantity       int    `json:"quantity"`
	PaymentMode    string `json:"paymentMode"`
	Subtotal       int    `json:"subtotal"`
	ServiceCharge  int    `json:"serviceCharge"`
	PointsRequired int    `json:"pointsRequired"`
	PayableCash    int    `json:"payableCash"`
}

type DeliveryOrderIncident struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	Message   string    `json:"message"`
	ActorName string    `json:"actorName"`
	ActorRole string    `json:"actorRole"`
	CreatedAt time.Time `json:"createdAt"`
}

type DeliveryOrder struct {
	ID               string                  `json:"id"`
	StudentUserID    string                  `json:"studentUserId"`
	StudentName      string                  `json:"studentName"`
	StudentEmail     string                  `json:"studentEmail"`
	CreatedAt        time.Time               `json:"createdAt"`
	Status           string                  `json:"status"`
	RouteMode        string                  `json:"routeMode"`
	DeliveryDetails  DeliveryDetails         `json:"deliveryDetails"`
	Items            []DeliveryOrderItem     `json:"items"`
	Totals           DeliveryOrderTotals     `json:"totals"`
	Incidents        []DeliveryOrderIncident `json:"incidents"`
	AssignedToUserID string                  `json:"assignedToUserId,omitempty"`
	AssignedToName   string                  `json:"assignedToName,omitempty"`
	AssignedPlan     string                  `json:"assignedPlan,omitempty"`
	AssignedAt       *time.Time              `json:"assignedAt,omitempty"`
	DeliveredAt      *time.Time              `json:"deliveredAt,omitempty"`
}
