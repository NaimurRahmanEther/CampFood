package product

import (
	"backend/utils"
	"net/http"
)

func (h *Handler) GetAllProducts(w http.ResponseWriter, r *http.Request) {
	productList, error := h.service.List()
	if error != nil {
		http.Error(w, "Internal Server Error", 500)
		return
	}
	utils.SendDataFunc(w, productList, 200)
}
