package orders

import (
	"backend/domain"
	"backend/utils"
	"encoding/json"
	"net/http"
)

type createOrderRequest struct {
	RouteMode       string                           `json:"routeMode"`
	Items           []domain.CreateDeliveryOrderItem `json:"items"`
	DeliveryDetails domain.DeliveryDetails           `json:"deliveryDetails"`
}

func (h *Handler) CreateOrder(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok || user.Type != "student" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req createOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	order, err := h.service.Create(user, req.RouteMode, req.Items, req.DeliveryDetails)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	utils.SendDataFunc(w, order, http.StatusCreated)
}
