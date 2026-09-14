package student

import (
	"backend/utils"
	"encoding/json"
	"net/http"
	"strings"
)

type Login struct {
	StudentID string `json:"student_id"`
	Email     string `json:"email"`
	Password  string `json:"password"`
}

func (h *Handler) LoginUser(w http.ResponseWriter, r *http.Request) {
	var loginData Login
	err := json.NewDecoder(r.Body).Decode(&loginData)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	loginData.StudentID = strings.TrimSpace(loginData.StudentID)
	loginData.Email = strings.ToLower(strings.TrimSpace(loginData.Email))

	if h.handleAdminLogin(w, loginData) {
		return
	}

	student, err := h.Service.LoginStudent(loginData.StudentID, loginData.Email, loginData.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	accessToken, err := utils.CreateJwt(h.cnf.JwtSecret, utils.Payload{
		UserID:      student.UserID,
		Type:        "student",
		FullName:    student.FullName,
		StudentId:   student.StudentId,
		Email:       student.Email,
		PhoneNumber: student.PhoneNumber,
		HallName:    student.HallName,
		Department:  student.Department,
	})
	if err != nil {
		http.Error(w, "Failed to create JWT", http.StatusInternalServerError)
		return
	}

	utils.SendDataFunc(w, map[string]interface{}{
		"token": accessToken,
		"user": map[string]string{
			"userId": student.UserID,
			"role":   "student",
			"email":  student.Email,
			"name":   student.FullName,
		},
	}, http.StatusOK)
}

func (h *Handler) handleAdminLogin(w http.ResponseWriter, loginData Login) bool {
	if loginData.StudentID != h.cnf.AdminLoginID {
		return false
	}

	if loginData.Email != h.cnf.AdminEmail || loginData.Password != h.cnf.AdminPassword {
		http.Error(w, "invalid admin credentials", http.StatusUnauthorized)
		return true
	}

	accessToken, err := utils.CreateJwt(h.cnf.JwtSecret, utils.Payload{
		UserID:    "admin",
		Type:      "admin",
		FullName:  "Admin",
		StudentId: h.cnf.AdminLoginID,
		Email:     h.cnf.AdminEmail,
	})
	if err != nil {
		http.Error(w, "Failed to create JWT", http.StatusInternalServerError)
		return true
	}

	utils.SendDataFunc(w, map[string]interface{}{
		"token": accessToken,
		"user": map[string]string{
			"userId": "admin",
			"role":   "admin",
			"email":  h.cnf.AdminEmail,
			"name":   "Admin",
		},
	}, http.StatusOK)

	return true
}
