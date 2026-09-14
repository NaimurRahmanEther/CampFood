package admin

import (
	"backend/utils"
	"net/http"
)

func (h *Handler) GetApprovalStatus(w http.ResponseWriter, r *http.Request) {
	requestType := r.URL.Query().Get("type")
	applicantEmail := r.URL.Query().Get("email")
	payload := map[string]string{}

	for key, values := range r.URL.Query() {
		if key == "type" || key == "email" || len(values) == 0 {
			continue
		}
		payload[key] = values[0]
	}

	status, err := h.Service.GetApprovalStatus(requestType, applicantEmail, payload)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	utils.SendDataFunc(w, map[string]string{"status": status}, http.StatusOK)
}
