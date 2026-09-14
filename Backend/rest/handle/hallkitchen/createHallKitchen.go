package hallkitchen

import (
	"backend/domain"
	"backend/utils"
	"encoding/json"
	"net/http"
	"net/mail"
	"strings"
)

type ReqHallKitchen struct {
	KitchenName  string `json:"kitchen_name"`
	ManagerPhone string `json:"manager_phone"`
	Email        string `json:"email"`
	Password     string `json:"password"`
	PhoneNumber  string `json:"phone_number"`
	HallName     string `json:"hall_name"`
	Subscription int    `json:"subscription"`
}

func (h *Handler) CreateHallKitchen(w http.ResponseWriter, r *http.Request) {
	var hallKitchen ReqHallKitchen
	err := json.NewDecoder(r.Body).Decode(&hallKitchen)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	normalized := ReqHallKitchen{
		KitchenName:  strings.TrimSpace(hallKitchen.KitchenName),
		ManagerPhone: strings.TrimSpace(hallKitchen.ManagerPhone),
		Email:        strings.ToLower(strings.TrimSpace(hallKitchen.Email)),
		Password:     strings.TrimSpace(hallKitchen.Password),
		PhoneNumber:  strings.TrimSpace(hallKitchen.PhoneNumber),
		HallName:     strings.TrimSpace(hallKitchen.HallName),
		Subscription: hallKitchen.Subscription,
	}

	if normalized.KitchenName == "" ||
		normalized.ManagerPhone == "" ||
		normalized.Email == "" ||
		normalized.Password == "" ||
		normalized.PhoneNumber == "" ||
		normalized.HallName == "" {
		http.Error(w, "All hall kitchen fields are required", http.StatusBadRequest)
		return
	}

	if _, err := mail.ParseAddress(normalized.Email); err != nil {
		http.Error(w, "Invalid email address", http.StatusBadRequest)
		return
	}

	if len(normalized.Password) < 6 {
		http.Error(w, "Password must be at least 6 characters", http.StatusBadRequest)
		return
	}

	if normalized.Subscription < 0 {
		http.Error(w, "Subscription must be a non-negative number", http.StatusBadRequest)
		return
	}

	newHallKitchen := domain.Hall_kitchen{
		KitchenName:  normalized.KitchenName,
		ManagerPhone: normalized.ManagerPhone,
		Email:        normalized.Email,
		Password:     normalized.Password,
		PhoneNumber:  normalized.PhoneNumber,
		HallName:     normalized.HallName,
		Subscription: normalized.Subscription,
	}

	storedHallKitchen, err := h.Service.RegisterHallKitchen(newHallKitchen)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	utils.SendDataFunc(w, storedHallKitchen, http.StatusCreated)
}
