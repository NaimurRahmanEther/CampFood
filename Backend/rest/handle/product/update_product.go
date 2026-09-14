package product

import (
	"backend/domain"
	"backend/utils"
	"encoding/json"
	"net/http"
	"strconv"
)

type Product struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Price       string `json:"price"`
	ImageUrl    string `json:"imageUrl"`
}

func (h *Handler) UpdateProduct(w http.ResponseWriter, r *http.Request) {
	ProductID := r.PathValue("id")
	PID, err := strconv.Atoi(ProductID)
	if err != nil {
		http.Error(w, "Bad Request", 400)
		return
	}
	var UpdatedProduct Product
	decoder := json.NewDecoder(r.Body)
	err = decoder.Decode(&UpdatedProduct)
	if err != nil {
		http.Error(w, "Bad Request", 400)
		return
	}
	newProduct := domain.Product{
		ID:          PID,
		Title:       UpdatedProduct.Title,
		Description: UpdatedProduct.Description,
		Price:       UpdatedProduct.Price,
		ImageUrl:    UpdatedProduct.ImageUrl,
	}

	NewProduct, err := h.service.Update(newProduct)
	if err != nil {
		http.Error(w, "Internal Server Error", 500)
		return
	}
	utils.SendDataFunc(w, NewProduct, 200)
}
