package campkitchen

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

func (h *Handler) LoginCampKitchen(w http.ResponseWriter, r *http.Request) {
	var loginData Login
	err := json.NewDecoder(r.Body).Decode(&loginData)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	loginData.Email = strings.ToLower(strings.TrimSpace(loginData.Email))

	campKitchen, err := h.Service.LoginCampKitchen(loginData.Email, loginData.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	accessToken, err := utils.CreateJwt(h.cnf.JwtSecret, utils.Payload{
		UserID:      campKitchen.UserID,
		Type:        "camp_kitchen",
		FullName:    campKitchen.KitchenName,
		Email:       campKitchen.Email,
		PhoneNumber: campKitchen.PhoneNumber,
	})
	if err != nil {
		http.Error(w, "Failed to create JWT", http.StatusInternalServerError)
		return
	}

	utils.SendDataFunc(w, map[string]interface{}{
		"token": accessToken,
		"user": map[string]string{
			"userId": campKitchen.UserID,
			"role":   "campus-kitchen",
			"email":  campKitchen.Email,
			"name":   campKitchen.KitchenName,
			"status": campKitchen.Status,
		},
	}, http.StatusOK)
}
