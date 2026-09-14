package admin

import (
	"backend/utils"
	"encoding/json"
	"net/http"
)

type CreateApprovalRequest struct {
	Type           string            `json:"type"`
	ApplicantName  string            `json:"applicantName"`
	ApplicantEmail string            `json:"applicantEmail"`
	Payload        map[string]string `json:"payload"`
}

func (h *Handler) CreateApprovalRequest(w http.ResponseWriter, r *http.Request) {
	var req CreateApprovalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	request, err := h.Service.CreateApprovalRequest(req.Type, req.ApplicantName, req.ApplicantEmail, req.Payload)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	utils.SendDataFunc(w, request, http.StatusCreated)
}
