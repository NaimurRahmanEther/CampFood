package food

import (
	"backend/domain"
	"backend/utils"
	"net/http"
	"strconv"
	"strings"
)

func (h *Handler) CreateFood(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("user").(utils.Payload)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if user.Type != "student_kitchen" && user.Type != "hall_kitchen" && user.Type != "camp_kitchen" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	approved, err := h.service.IsKitchenApproved(user.UserID, user.Type)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	if !approved {
		http.Error(w, "Kitchen not approved", http.StatusForbidden)
		return
	}

	err = r.ParseMultipartForm(10 << 20)
	if err != nil {
		http.Error(w, "Invalid form data", http.StatusBadRequest)
		return
	}

	stock, err := strconv.Atoi(r.FormValue("stock"))
	if err != nil || stock < 0 {
		http.Error(w, "Invalid stock value", http.StatusBadRequest)
		return
	}

	visible := true
	visibleValue := strings.TrimSpace(r.FormValue("visible"))
	if visibleValue != "" {
		parsedVisible, parseErr := strconv.ParseBool(visibleValue)
		if parseErr != nil {
			http.Error(w, "Invalid visible value", http.StatusBadRequest)
			return
		}
		visible = parsedVisible
	}

	priceValue, err := normalizePrice(r.FormValue("price"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	imagePath, err := saveUploadedImageIfProvided(r, "image")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	mealTime, err := normalizeMealTime(r.FormValue("meal_time"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	foodOption, err := normalizeFoodOption(r.FormValue("food_option"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	food := domain.Food{
		UserID:         user.UserID,
		ApplicantEmail: user.Email,
		KitchenType:    user.Type,
		FoodName:       strings.TrimSpace(r.FormValue("food_name")),
		Category:       strings.TrimSpace(r.FormValue("category")),
		Price:          priceValue,
		Stock:          stock,
		Image:          imagePath,
		Visible:        visible,
		ProviderName:   user.FullName,
		ProviderType:   mapProviderType(user.Type),
		HallName:       resolveFoodHallName(user),
		MealTime:       mealTime,
		FoodOption:     foodOption,
		ApprovalStatus: "pending",
	}

	if food.FoodName == "" || food.Category == "" {
		http.Error(w, "food_name and category are required", http.StatusBadRequest)
		return
	}

	createdFood, err := h.service.Store(food)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	utils.SendDataFunc(w, createdFood, http.StatusCreated)
}
