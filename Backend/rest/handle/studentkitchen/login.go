package studentkitchen

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

func (h *Handler) LoginStudentKitchen(w http.ResponseWriter, r *http.Request) {
	var loginData Login
	err := json.NewDecoder(r.Body).Decode(&loginData)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	loginData.Email = strings.ToLower(strings.TrimSpace(loginData.Email))

	studentKitchen, err := h.Service.LoginStudentKitchen(loginData.Email, loginData.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	if studentKitchen.Status != "approved" {
		utils.SendDataFunc(w, map[string]string{
			"message": "Kitchen registration is pending admin approval.",
			"status":  studentKitchen.Status,
		}, http.StatusForbidden)
		return
	}

	h.sendStudentKitchenAccessResponse(w, studentKitchen)
}
