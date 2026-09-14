package product

import (
	"backend/utils"
	"net/http"
	"strconv"
)

func (h *Handler) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	ProductID := r.PathValue("id")
	PID, err := strconv.Atoi(ProductID)
	if err != nil {
		http.Error(w, "Bad Request", 400)
		return
	}
	err = h.service.Delete(PID)
	if err != nil {
		http.Error(w, "Internal Server Error", 500)
		return
	}
	utils.SendDataFunc(w, "Deleted Successfully", 200)
}
