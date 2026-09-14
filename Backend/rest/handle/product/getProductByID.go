package product

import (
	"backend/utils"
	"net/http"
	"strconv"
)

func (h *Handler) GetProductByID(w http.ResponseWriter, r *http.Request) {
	ProductID := r.PathValue("id")
	PID, err := strconv.Atoi(ProductID)
	if err != nil {
		http.Error(w, "Bad Request", 400)
		return
	}

	Product, err := h.service.GetByID(PID)
	if err != nil {
		http.Error(w, "Internal Server Error", 500)
		return
	}
	utils.SendDataFunc(w, Product, 200)
}
