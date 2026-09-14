package food

import (
	"backend/domain"
	"backend/utils"
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

func (h *Handler) GetAllFood(w http.ResponseWriter, r *http.Request) {
	query, err := buildFoodCatalogQuery(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	foodList, err := h.service.List(query)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	utils.SendDataFunc(w, foodList, http.StatusOK)
}

func buildFoodCatalogQuery(r *http.Request) (domain.FoodCatalogQuery, error) {
	values := r.URL.Query()
	query := domain.FoodCatalogQuery{
		Search:       strings.TrimSpace(values.Get("search")),
		ProviderType: strings.TrimSpace(values.Get("providerType")),
		HallName:     strings.TrimSpace(values.Get("hallName")),
		ProviderName: strings.TrimSpace(values.Get("providerName")),
		MealTime:     strings.TrimSpace(values.Get("mealTime")),
		FoodOption:   strings.TrimSpace(values.Get("foodOption")),
		SortBy:       strings.TrimSpace(values.Get("sortBy")),
	}

	var err error
	if query.Page, err = parseOptionalPositiveInt(values.Get("page")); err != nil {
		return domain.FoodCatalogQuery{}, err
	}

	if query.Limit, err = parseOptionalPositiveInt(values.Get("limit")); err != nil {
		return domain.FoodCatalogQuery{}, err
	}

	if query.MinPrice, err = parseOptionalPositiveInt(values.Get("minPrice")); err != nil {
		return domain.FoodCatalogQuery{}, err
	}

	if query.MaxPrice, err = parseOptionalPositiveInt(values.Get("maxPrice")); err != nil {
		return domain.FoodCatalogQuery{}, err
	}

	if query.FreeDeliveryOnly, err = parseOptionalBool(values.Get("freeDelivery")); err != nil {
		return domain.FoodCatalogQuery{}, err
	}

	if query.PointsOnly, err = parseOptionalBool(values.Get("pointsOnly")); err != nil {
		return domain.FoodCatalogQuery{}, err
	}

	if query.IDs, err = parseFoodIDs(values.Get("ids")); err != nil {
		return domain.FoodCatalogQuery{}, err
	}

	return query, nil
}

func parseOptionalPositiveInt(raw string) (int, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0, nil
	}

	value, err := strconv.Atoi(raw)
	if err != nil || value < 0 {
		return 0, fmt.Errorf("invalid numeric query value: %s", raw)
	}

	return value, nil
}

func parseOptionalBool(raw string) (bool, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return false, nil
	}

	value, err := strconv.ParseBool(raw)
	if err != nil {
		return false, fmt.Errorf("invalid boolean query value: %s", raw)
	}

	return value, nil
}

func parseFoodIDs(raw string) ([]int, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}

	parts := strings.Split(raw, ",")
	ids := make([]int, 0, len(parts))
	seen := make(map[int]struct{}, len(parts))

	for _, part := range parts {
		value, err := strconv.Atoi(strings.TrimSpace(part))
		if err != nil || value <= 0 {
			return nil, fmt.Errorf("invalid ids query value: %s", raw)
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		ids = append(ids, value)
	}

	return ids, nil
}
