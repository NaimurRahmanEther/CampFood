package domain

import "time"

const (
	FoodMealTimeAny    = "Any Time"
	FoodMealTimeLunch  = "Lunch"
	FoodMealTimeDinner = "Dinner"
	FoodOptionSingle   = "Single"
	FoodOptionSystem   = "System"
)

type Food struct {
	ID             int       `db:"id" json:"id"`
	UserID         string    `db:"user_id" json:"user_id"`
	ApplicantEmail string    `db:"-" json:"-"`
	KitchenType    string    `db:"kitchen_type" json:"kitchen_type"`
	FoodName       string    `db:"food_name" json:"food_name"`
	Category       string    `db:"category" json:"category"`
	Price          string    `db:"price" json:"price"`
	Stock          int       `db:"stock" json:"stock"`
	Image          string    `db:"image" json:"image"`
	Visible        bool      `db:"visible" json:"visible"`
	ProviderName   string    `db:"provider_name" json:"provider_name"`
	ProviderType   string    `db:"provider_type" json:"provider_type"`
	HallName       string    `db:"hall_name" json:"hall_name,omitempty"`
	MealTime       string    `db:"meal_time" json:"meal_time"`
	FoodOption     string    `db:"food_option" json:"food_option"`
	ApprovalStatus string    `db:"approval_status" json:"approval_status"`
	Rating         float64   `db:"rating" json:"rating,omitempty"`
	ReviewCount    int       `db:"review_count" json:"review_count,omitempty"`
	CreatedAt      time.Time `db:"create_at" json:"create_at"`
	UpdatedAt      time.Time `db:"update_at" json:"update_at"`
}

type FoodCatalogQuery struct {
	Search           string
	ProviderType     string
	HallName         string
	ProviderName     string
	MealTime         string
	FoodOption       string
	MinPrice         int
	MaxPrice         int
	SortBy           string
	FreeDeliveryOnly bool
	PointsOnly       bool
	Page             int
	Limit            int
	IDs              []int
}

type FoodCatalogItem struct {
	ID           int     `db:"id" json:"id"`
	FoodName     string  `db:"food_name" json:"food_name"`
	Category     string  `db:"category" json:"category"`
	ProviderName string  `db:"provider_name" json:"provider_name"`
	ProviderType string  `db:"provider_type" json:"provider_type"`
	HallName     string  `db:"hall_name" json:"hall_name,omitempty"`
	MealTime     string  `db:"meal_time" json:"meal_time"`
	FoodOption   string  `db:"food_option" json:"food_option"`
	Price        int     `db:"price_value" json:"price"`
	Stock        int     `db:"stock" json:"stock"`
	Image        string  `db:"image" json:"image"`
	FreeDelivery bool    `db:"free_delivery" json:"free_delivery"`
	PointsCost   int     `db:"points_cost" json:"points_cost"`
	Rating       float64 `db:"rating" json:"rating"`
	Popularity   int     `db:"popularity" json:"popularity"`
	ReviewCount  int     `db:"review_count" json:"review_count"`
}

type FoodCatalogResponse struct {
	Items             []FoodCatalogItem  `json:"items"`
	Page              int                `json:"page"`
	Limit             int                `json:"limit"`
	Total             int                `json:"total"`
	TotalPages        int                `json:"totalPages"`
	AvailableMinPrice int                `json:"availableMinPrice"`
	AvailableMaxPrice int                `json:"availableMaxPrice"`
	Filters           FoodCatalogFilters `json:"filters"`
}

type FoodProviderOption struct {
	Name     string `json:"name"`
	HallName string `json:"hallName,omitempty"`
}

type FoodCatalogFilters struct {
	MealTimes       []string             `json:"mealTimes"`
	FoodOptions     []string             `json:"foodOptions"`
	Halls           []string             `json:"halls"`
	HallKitchens    []FoodProviderOption `json:"hallKitchens"`
	CampusKitchens  []FoodProviderOption `json:"campusKitchens"`
	StudentKitchens []FoodProviderOption `json:"studentKitchens"`
	Providers       []string             `json:"providers,omitempty"`
}
