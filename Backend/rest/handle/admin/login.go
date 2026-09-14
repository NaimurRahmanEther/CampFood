package admin

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

func (h *Handler) LoginAdmin(w http.ResponseWriter, r *http.Request) {
	var loginData Login
	err := json.NewDecoder(r.Body).Decode(&loginData)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	loginData.Email = strings.ToLower(strings.TrimSpace(loginData.Email))

	admin, err := h.Service.LoginAdmin(loginData.Email, loginData.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	accessToken, err := utils.CreateJwt(h.cnf.JwtSecret, utils.Payload{
		Type:     "admin",
		FullName: "admin",
		Email:    admin.Email,
	})
	if err != nil {
		http.Error(w, "Failed to create JWT", http.StatusInternalServerError)
		return
	}

	utils.SendDataFunc(w, map[string]interface{}{
		"token": accessToken,
		"user": map[string]string{
			"userId": "admin",
			"role":   "admin",
			"email":  admin.Email,
			"name":   "Admin",
		},
	}, http.StatusOK)
}
