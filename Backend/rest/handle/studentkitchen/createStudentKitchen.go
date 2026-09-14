package studentkitchen

import (
	"backend/domain"
	"backend/utils"
	"encoding/json"
	"net/http"
	"net/mail"
	"strings"
)

type ReqStudentKitchen struct {
	SellerName  string `json:"seller_name"`
	StudentId   string `json:"student_id"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	PhoneNumber string `json:"phone_number"`
	HallName    string `json:"hall_name"`
}

func (h *Handler) CreateStudentKitchen(w http.ResponseWriter, r *http.Request) {
	var studentKitchen ReqStudentKitchen
	err := json.NewDecoder(r.Body).Decode(&studentKitchen)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	normalized := ReqStudentKitchen{
		SellerName:  strings.TrimSpace(studentKitchen.SellerName),
		StudentId:   strings.TrimSpace(studentKitchen.StudentId),
		Email:       strings.ToLower(strings.TrimSpace(studentKitchen.Email)),
		Password:    strings.TrimSpace(studentKitchen.Password),
		PhoneNumber: strings.TrimSpace(studentKitchen.PhoneNumber),
		HallName:    strings.TrimSpace(studentKitchen.HallName),
	}

	if normalized.SellerName == "" ||
		normalized.StudentId == "" ||
		normalized.Email == "" ||
		normalized.Password == "" ||
		normalized.PhoneNumber == "" ||
		normalized.HallName == "" {
		http.Error(w, "All student kitchen fields are required", http.StatusBadRequest)
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

	newStudentKitchen := domain.Student_kitchen{
		SellerName:  normalized.SellerName,
		StudentId:   normalized.StudentId,
		Email:       normalized.Email,
		Password:    normalized.Password,
		PhoneNumber: normalized.PhoneNumber,
		HallName:    normalized.HallName,
	}

	storedStudentKitchen, err := h.Service.RegisterStudentKitchen(newStudentKitchen)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	utils.SendDataFunc(w, storedStudentKitchen, http.StatusCreated)
}
