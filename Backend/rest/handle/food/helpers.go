package food

import (
	"backend/domain"
	"fmt"
	"strconv"
	"strings"

	"backend/utils"
)

func mapProviderType(kitchenType string) string {
	switch kitchenType {
	case "hall_kitchen":
		return "Hall"
	case "camp_kitchen":
		return "Campus Kitchen"
	default:
		return "Student Homemade"
	}
}

func normalizeMealTime(raw string) (string, error) {
	normalized := strings.ToLower(strings.Join(strings.Fields(strings.TrimSpace(raw)), " "))

	switch normalized {
	case "", "any", "all", "all day", "any time":
		return domain.FoodMealTimeAny, nil
	case "lunch", "launch":
		return domain.FoodMealTimeLunch, nil
	case "dinner":
		return domain.FoodMealTimeDinner, nil
	default:
		return "", fmt.Errorf("invalid meal_time value")
	}
}

func normalizeFoodOption(raw string) (string, error) {
	normalized := strings.ToLower(strings.Join(strings.Fields(strings.TrimSpace(raw)), " "))

	switch normalized {
	case "", "single", "one", "single item":
		return domain.FoodOptionSingle, nil
	case "system", "set", "set menu", "set manu", "set-menu", "package", "combo", "package / set menu", "package/set menu", "full":
		return domain.FoodOptionSystem, nil
	default:
		return "", fmt.Errorf("invalid food_option value")
	}
}

func normalizePrice(raw string) (string, error) {
	normalized := strings.TrimSpace(raw)
	if normalized == "" {
		return "", fmt.Errorf("price is required")
	}

	price, err := strconv.Atoi(normalized)
	if err != nil || price < 0 {
		return "", fmt.Errorf("invalid price value")
	}

	return strconv.Itoa(price), nil
}

func resolveFoodHallName(user utils.Payload) string {
	if user.Type == "hall_kitchen" || user.Type == "student_kitchen" {
		return strings.TrimSpace(user.HallName)
	}

	return ""
}
