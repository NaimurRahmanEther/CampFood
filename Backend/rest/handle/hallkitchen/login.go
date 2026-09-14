package hallkitchen

import (
	"backend/utils"
	"encoding/json"
	"net/http"
	"strings"
)

type Login struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) LoginHallKitchen(w http.ResponseWriter, r *http.Request) {
	var loginData Login
	err := json.NewDecoder(r.Body).Decode(&loginData)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	loginData.Email = strings.ToLower(strings.TrimSpace(loginData.Email))

	hallKitchen, err := h.Service.LoginHallKitchen(loginData.Email, loginData.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	accessToken, err := utils.CreateJwt(h.cnf.JwtSecret, utils.Payload{
		UserID:      hallKitchen.UserID,
		Type:        "hall_kitchen",
		FullName:    hallKitchen.KitchenName,
		Email:       hallKitchen.Email,
		PhoneNumber: hallKitchen.PhoneNumber,
		HallName:    hallKitchen.HallName,
	})
	if err != nil {
		http.Error(w, "Failed to create JWT", http.StatusInternalServerError)
		return
	}

	utils.SendDataFunc(w, map[string]interface{}{
		"token": accessToken,
		"user": map[string]string{
			"userId": hallKitchen.UserID,
			"role":   "hall-kitchen",
			"email":  hallKitchen.Email,
			"name":   hallKitchen.KitchenName,
			"status": hallKitchen.Status,
		},
	}, http.StatusOK)
}
