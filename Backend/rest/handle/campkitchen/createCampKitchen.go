package campkitchen

import (
	"backend/domain"
	"backend/utils"
	"encoding/json"
	"net/http"
	"net/mail"
	"strings"
)

type ReqCampKitchen struct {
	KitchenName  string `json:"kitchen_name"`
	Location     string `json:"location"`
	ManagerPhone string `json:"manager_phone"`
	Email        string `json:"email"`
	Password     string `json:"password"`
	PhoneNumber  string `json:"phone_number"`
	TradeLicense string `json:"trade_license"`
	Subscription int    `json:"subscription"`
}

func (h *Handler) CreateCampKitchen(w http.ResponseWriter, r *http.Request) {
	var campKitchen ReqCampKitchen
	err := json.NewDecoder(r.Body).Decode(&campKitchen)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	normalized := ReqCampKitchen{
		KitchenName:  strings.TrimSpace(campKitchen.KitchenName),
		Location:     strings.TrimSpace(campKitchen.Location),
		ManagerPhone: strings.TrimSpace(campKitchen.ManagerPhone),
		Email:        strings.ToLower(strings.TrimSpace(campKitchen.Email)),
		Password:     strings.TrimSpace(campKitchen.Password),
		PhoneNumber:  strings.TrimSpace(campKitchen.PhoneNumber),
		TradeLicense: strings.TrimSpace(campKitchen.TradeLicense),
		Subscription: campKitchen.Subscription,
	}

	if normalized.KitchenName == "" ||
		normalized.Location == "" ||
		normalized.ManagerPhone == "" ||
		normalized.Email == "" ||
		normalized.Password == "" ||
		normalized.PhoneNumber == "" {
		http.Error(w, "All campus kitchen fields are required", http.StatusBadRequest)
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

	newCampKitchen := domain.Camp_kitchen{
		KitchenName:  normalized.KitchenName,
		Location:     normalized.Location,
		ManagerPhone: normalized.ManagerPhone,
		Email:        normalized.Email,
		Password:     normalized.Password,
		PhoneNumber:  normalized.PhoneNumber,
		TradeLicense: normalized.TradeLicense,
		Subscription: normalized.Subscription,
	}

	storedCampKitchen, err := h.Service.RegisterCampKitchen(newCampKitchen)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	utils.SendDataFunc(w, storedCampKitchen, http.StatusCreated)
}
