package student

import (
	"backend/utils"
	"encoding/json"
	"net/http"
	"strings"
)

type updateProfileRequest struct {
	Name string `json:"name"`
}

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok || user.Type != "student" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req updateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}

	student, err := h.Service.UpdateStudentProfile(user.UserID, name)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	utils.SendDataFunc(w, map[string]string{
		"userId": student.UserID,
		"role":   "student",
		"email":  student.Email,
		"name":   student.FullName,
	}, http.StatusOK)
}
