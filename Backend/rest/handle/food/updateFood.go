package food

import (
	"backend/domain"
	"backend/utils"
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"
)

func (h *Handler) UpdateFood(w http.ResponseWriter, r *http.Request) {
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

	foodID := r.PathValue("id")
	fid, err := strconv.Atoi(foodID)
	if err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	existingFood, err := h.service.GetByIDForOwner(fid, user.UserID, user.Type)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "Food not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	err = r.ParseMultipartForm(10 << 20)
	if err != nil {
		http.Error(w, "Invalid form data", http.StatusBadRequest)
		return
	}

	updatedFood := *existingFood

	foodNameValue := strings.TrimSpace(r.FormValue("food_name"))
	if foodNameValue != "" {
		updatedFood.FoodName = foodNameValue
	}

	categoryValue := strings.TrimSpace(r.FormValue("category"))
	if categoryValue != "" {
		updatedFood.Category = categoryValue
	}

	mealTimeValue := strings.TrimSpace(r.FormValue("meal_time"))
	if mealTimeValue != "" {
		mealTime, mealTimeErr := normalizeMealTime(mealTimeValue)
		if mealTimeErr != nil {
			http.Error(w, mealTimeErr.Error(), http.StatusBadRequest)
			return
		}
		updatedFood.MealTime = mealTime
	}

	foodOptionValue := strings.TrimSpace(r.FormValue("food_option"))
	if foodOptionValue != "" {
		foodOption, foodOptionErr := normalizeFoodOption(foodOptionValue)
		if foodOptionErr != nil {
			http.Error(w, foodOptionErr.Error(), http.StatusBadRequest)
			return
		}
		updatedFood.FoodOption = foodOption
	}

	priceValue := strings.TrimSpace(r.FormValue("price"))
	if priceValue != "" {
		normalizedPrice, priceErr := normalizePrice(priceValue)
		if priceErr != nil {
			http.Error(w, priceErr.Error(), http.StatusBadRequest)
			return
		}
		updatedFood.Price = normalizedPrice
	}

	stockValue := strings.TrimSpace(r.FormValue("stock"))
	if stockValue != "" {
		stock, stockErr := strconv.Atoi(stockValue)
		if stockErr != nil || stock < 0 {
			http.Error(w, "Invalid stock value", http.StatusBadRequest)
			return
		}
		updatedFood.Stock = stock
	}

	visibleValue := r.FormValue("visible")
	if visibleValue != "" {
		parsedVisible, parseErr := strconv.ParseBool(visibleValue)
		if parseErr != nil {
			http.Error(w, "Invalid visible value", http.StatusBadRequest)
			return
		}
		updatedFood.Visible = parsedVisible
	}

	imagePath, err := saveUploadedImageIfProvided(r, "image")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if imagePath != "" {
		updatedFood.Image = imagePath
	}

	if strings.TrimSpace(updatedFood.MealTime) == "" {
		updatedFood.MealTime = domain.FoodMealTimeAny
	}

	if strings.TrimSpace(updatedFood.FoodOption) == "" {
		updatedFood.FoodOption = domain.FoodOptionSingle
	}

	newFood := domain.Food{
		ID:             updatedFood.ID,
		UserID:         updatedFood.UserID,
		ApplicantEmail: user.Email,
		KitchenType:    user.Type,
		FoodName:       updatedFood.FoodName,
		Category:       updatedFood.Category,
		Price:          updatedFood.Price,
		Stock:          updatedFood.Stock,
		Image:          updatedFood.Image,
		Visible:        updatedFood.Visible,
		ProviderName:   user.FullName,
		ProviderType:   mapProviderType(user.Type),
		HallName:       resolveFoodHallName(user),
		MealTime:       updatedFood.MealTime,
		FoodOption:     updatedFood.FoodOption,
		ApprovalStatus: "pending",
	}

	if newFood.FoodName == "" || newFood.Category == "" || newFood.Price == "" {
		http.Error(w, "food_name, category and price are required", http.StatusBadRequest)
		return
	}

	food, err := h.service.Update(newFood)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "Food not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	utils.SendDataFunc(w, food, http.StatusOK)
}
