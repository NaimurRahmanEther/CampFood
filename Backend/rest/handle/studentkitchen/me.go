package studentkitchen

import (
	"backend/domain"
	"backend/utils"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"
)

type createMyStudentKitchenRequest struct {
	SellerName string `json:"seller_name"`
}

type studentKitchenResponse struct {
	UserID      string    `json:"user_id"`
	SellerName  string    `json:"seller_name"`
	StudentId   string    `json:"student_id"`
	Email       string    `json:"email"`
	PhoneNumber string    `json:"phone_number"`
	HallName    string    `json:"hall_name"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"create_at"`
	UpdatedAt   time.Time `json:"update_at"`
}

func (h *Handler) GetMyStudentKitchen(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok || user.Type != "student" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	studentKitchen, err := h.Service.GetStudentKitchenByStudentID(user.StudentId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "Student kitchen not found", http.StatusNotFound)
			return
		}

		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	utils.SendDataFunc(w, buildStudentKitchenResponse(studentKitchen), http.StatusOK)
}

func (h *Handler) CreateMyStudentKitchen(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok || user.Type != "student" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	existing, err := h.Service.GetStudentKitchenByStudentID(user.StudentId)
	if err == nil {
		utils.SendDataFunc(w, buildStudentKitchenResponse(existing), http.StatusConflict)
		return
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	var req createMyStudentKitchenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && !errors.Is(err, io.EOF) {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	sellerName := strings.TrimSpace(req.SellerName)
	if sellerName == "" {
		sellerName = strings.TrimSpace(user.FullName)
	}
	if sellerName == "" {
		http.Error(w, "seller_name is required", http.StatusBadRequest)
		return
	}

	studentKitchen, err := h.Service.RegisterStudentKitchen(domain.Student_kitchen{
		SellerName:  sellerName,
		StudentId:   user.StudentId,
		Email:       user.Email,
		Password:    "",
		PhoneNumber: user.PhoneNumber,
		HallName:    user.HallName,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	utils.SendDataFunc(w, buildStudentKitchenResponse(studentKitchen), http.StatusCreated)
}

func (h *Handler) CreateMyStudentKitchenAccessSession(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok || user.Type != "student" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	studentKitchen, err := h.Service.GetStudentKitchenByStudentID(user.StudentId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "Student kitchen not found", http.StatusNotFound)
			return
		}

		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
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

func buildStudentKitchenResponse(studentKitchen *domain.Student_kitchen) studentKitchenResponse {
	return studentKitchenResponse{
		UserID:      studentKitchen.UserID,
		SellerName:  studentKitchen.SellerName,
		StudentId:   studentKitchen.StudentId,
		Email:       studentKitchen.Email,
		PhoneNumber: studentKitchen.PhoneNumber,
		HallName:    studentKitchen.HallName,
		Status:      studentKitchen.Status,
		CreatedAt:   studentKitchen.CreatedAt,
		UpdatedAt:   studentKitchen.UpdatedAt,
	}
}

func (h *Handler) sendStudentKitchenAccessResponse(w http.ResponseWriter, studentKitchen *domain.Student_kitchen) {
	accessToken, err := utils.CreateJwt(h.cnf.JwtSecret, utils.Payload{
		UserID:      studentKitchen.UserID,
		Type:        "student_kitchen",
		FullName:    studentKitchen.SellerName,
		StudentId:   studentKitchen.StudentId,
		Email:       studentKitchen.Email,
		PhoneNumber: studentKitchen.PhoneNumber,
		HallName:    studentKitchen.HallName,
	})
	if err != nil {
		http.Error(w, "Failed to create JWT", http.StatusInternalServerError)
		return
	}

	utils.SendDataFunc(w, map[string]interface{}{
		"token": accessToken,
		"user": map[string]string{
			"userId": studentKitchen.UserID,
			"role":   "student-kitchen",
			"email":  studentKitchen.Email,
			"name":   studentKitchen.SellerName,
			"status": studentKitchen.Status,
		},
	}, http.StatusOK)
}
