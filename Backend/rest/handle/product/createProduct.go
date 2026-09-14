package product

import (
	"backend/domain"
	"backend/utils"
	"encoding/json"
	"net/http"
)

type ReqProduct struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Price       string `json:"price"`
	ImageUrl    string `json:"imageUrl"`
}

func (h *Handler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if user.Type != "student_kitchen" && user.Type != "hall_kitchen" && user.Type != "camp_kitchen" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Check if kitchen is approved
	approved, err := h.service.IsKitchenApproved(user.UserID, user.Type)
	if err != nil {
		http.Error(w, "Internal Server Error", 500)
		return
	}
	if !approved {
		http.Error(w, "Kitchen not approved", http.StatusForbidden)
		return
	}

	var NewProduct ReqProduct
	decoder := json.NewDecoder(r.Body)
	err = decoder.Decode(&NewProduct)
	if err != nil {
		http.Error(w, "Bad Request", 400)
		return
	}
	Product := domain.Product{
		UserID:      user.UserID,
		Title:       NewProduct.Title,
		Description: NewProduct.Description,
		Price:       NewProduct.Price,
		ImageUrl:    NewProduct.ImageUrl,
	}

	createdProduct, err := h.service.Store(Product)
	if err != nil {
		http.Error(w, "Internal Server Error", 500)
		return
	}

	utils.SendDataFunc(w, createdProduct, 200)
}
