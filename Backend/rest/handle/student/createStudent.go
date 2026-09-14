package student

import (
	"backend/domain"

	"backend/utils"
	"encoding/json"
	"net/http"
	"net/mail"
	"regexp"
	"strings"
)

type ReqStudent struct {
	FullName    string `json:"full_name"`
	StudentId   string `json:"student_id"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	PhoneNumber string `json:"phone_number"`
	HallName    string `json:"hall_name"`
	Department  string `json:"department"`
}

var studentIDPattern = regexp.MustCompile(`^\d{10}$`)

func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var student ReqStudent
	err := json.NewDecoder(r.Body).Decode(&student)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	normalized := ReqStudent{
		FullName:    strings.TrimSpace(student.FullName),
		StudentId:   strings.TrimSpace(student.StudentId),
		Email:       strings.ToLower(strings.TrimSpace(student.Email)),
		Password:    strings.TrimSpace(student.Password),
		PhoneNumber: strings.TrimSpace(student.PhoneNumber),
		HallName:    strings.TrimSpace(student.HallName),
		Department:  strings.TrimSpace(student.Department),
	}

	if normalized.FullName == "" ||
		normalized.StudentId == "" ||
		normalized.Email == "" ||
		normalized.Password == "" ||
		normalized.PhoneNumber == "" ||
		normalized.HallName == "" ||
		normalized.Department == "" {
		http.Error(w, "All student fields are required", http.StatusBadRequest)
		return
	}

	if !studentIDPattern.MatchString(normalized.StudentId) {
		http.Error(w, "Student ID must be exactly 10 digits", http.StatusBadRequest)
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

	newUser := domain.Student{
		FullName:    normalized.FullName,
		StudentId:   normalized.StudentId,
		Email:       normalized.Email,
		Password:    normalized.Password,
		PhoneNumber: normalized.PhoneNumber,
		HallName:    normalized.HallName,
		Department:  normalized.Department,
	}

	storedUser, err := h.Service.RegisterStudent(newUser)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	utils.SendDataFunc(w, storedUser, http.StatusCreated)
}
