package repo

import (
	"backend/domain"
	"backend/food"
	"database/sql"
	"fmt"
	"sort"
	"strings"

	"github.com/jmoiron/sqlx"
)

type FoodRepository interface {
	food.FoodRepository
}

type foodRepo struct {
	db *sqlx.DB
}

const (
	defaultFoodCatalogPage  = 1
	defaultFoodCatalogLimit = 8
	maxFoodCatalogLimit     = 48
)

type foodCatalogWhereOptions struct {
	includePriceRange bool
	includeHallName   bool
	includeProvider   bool
	includeMealTime   bool
	includeFoodOption bool
}

func NewFoodRepo(db *sqlx.DB) FoodRepository {
	repo := &foodRepo{
		db: db,
	}

	return repo
}

func (r *foodRepo) Store(f domain.Food) (*domain.Food, error) {
	storedCategory := encodeStoredFoodCategory(f.Category, f.MealTime, f.FoodOption)

	query := `INSERT INTO foods (user_id, kitchen_type, food_name, category, price, stock, image, visible, provider_name, provider_type, approval_status)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			  RETURNING id, create_at, update_at`
	err := r.db.QueryRow(
		query,
		f.UserID,
		f.KitchenType,
		f.FoodName,
		storedCategory,
		f.Price,
		f.Stock,
		f.Image,
		f.Visible,
		f.ProviderName,
		f.ProviderType,
		f.ApprovalStatus,
	).Scan(&f.ID, &f.CreatedAt, &f.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *foodRepo) List(query domain.FoodCatalogQuery) (*domain.FoodCatalogResponse, error) {
	query = normalizeFoodCatalogQuery(query)

	whereClause, args := buildFoodCatalogWhereClause(query, foodCatalogWhereOptions{
		includePriceRange: true,
		includeHallName:   true,
		includeProvider:   true,
		includeMealTime:   true,
		includeFoodOption: true,
	})

	total, err := r.countCatalogItems(whereClause, args)
	if err != nil {
		return nil, err
	}

	boundsWhereClause, boundsArgs := buildFoodCatalogWhereClause(query, foodCatalogWhereOptions{
		includePriceRange: false,
		includeHallName:   true,
		includeProvider:   true,
		includeMealTime:   true,
		includeFoodOption: true,
	})
	minPrice, maxPrice, err := r.selectCatalogPriceBounds(boundsWhereClause, boundsArgs)
	if err != nil {
		return nil, err
	}

	filters, err := r.selectCatalogFilters(query)
	if err != nil {
		return nil, err
	}

	foods, err := r.selectCatalogItems(whereClause, buildFoodCatalogOrderBy(query.SortBy), args, query.Page, query.Limit)
	if err != nil {
		return nil, err
	}

	totalPages := 1
	if total > 0 {
		totalPages = (total + query.Limit - 1) / query.Limit
	}

	return &domain.FoodCatalogResponse{
		Items:             foods,
		Page:              query.Page,
		Limit:             query.Limit,
		Total:             total,
		TotalPages:        totalPages,
		AvailableMinPrice: minPrice,
		AvailableMaxPrice: maxPrice,
		Filters:           filters,
	}, nil
}

func (r *foodRepo) ListByOwner(userID, kitchenType string) ([]*domain.Food, error) {
	var foods []*domain.Food
	query := fmt.Sprintf(
		`SELECT foods.id,
		        foods.user_id,
		        foods.kitchen_type,
		        foods.food_name,
		        %s AS category,
		        foods.price,
		        foods.stock,
		        foods.image,
		        foods.visible,
		        foods.provider_name,
		        foods.provider_type,
		        %s AS hall_name,
		        %s AS meal_time,
		        %s AS food_option,
		        foods.approval_status,
		        foods.create_at,
		        foods.update_at
		   FROM foods%s
		  WHERE foods.user_id = $1 AND foods.kitchen_type = $2
		  ORDER BY foods.update_at DESC, foods.id DESC`,
		foodCategoryExpression(),
		hallNameExpression(),
		mealTimeExpression(),
		foodOptionExpression(),
		foodCatalogSourceJoinClause(),
	)
	err := r.db.Select(&foods, query, userID, kitchenType)
	return foods, err
}

func (r *foodRepo) GetByID(id int) (*domain.Food, error) {
	query := fmt.Sprintf(
		`SELECT foods.id,
		        foods.user_id,
		        foods.kitchen_type,
		        foods.food_name,
		        %s AS category,
		        foods.price,
		        foods.stock,
		        foods.image,
		        foods.visible,
		        foods.provider_name,
		        foods.provider_type,
		        %s AS hall_name,
		        %s AS meal_time,
		        %s AS food_option,
		        foods.approval_status,
		        %s AS rating,
		        %s AS review_count,
		        foods.create_at,
		        foods.update_at
		   FROM foods%s%s
		  WHERE foods.id = $1 AND foods.visible = true AND foods.approval_status = 'approved'`,
		foodCategoryExpression(),
		hallNameExpression(),
		mealTimeExpression(),
		foodOptionExpression(),
		ratingExpression(),
		reviewCountExpression(),
		foodCatalogSourceJoinClause(),
		reviewStatsJoinClause(),
	)

	var f domain.Food
	err := r.db.Get(&f, query, id)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *foodRepo) GetByIDForOwner(id int, userID, kitchenType string) (*domain.Food, error) {
	query := fmt.Sprintf(
		`SELECT foods.id,
		        foods.user_id,
		        foods.kitchen_type,
		        foods.food_name,
		        %s AS category,
		        foods.price,
		        foods.stock,
		        foods.image,
		        foods.visible,
		        foods.provider_name,
		        foods.provider_type,
		        %s AS hall_name,
		        %s AS meal_time,
		        %s AS food_option,
		        foods.approval_status,
		        foods.create_at,
		        foods.update_at
		   FROM foods%s
		  WHERE foods.id = $1 AND foods.user_id = $2 AND foods.kitchen_type = $3`,
		foodCategoryExpression(),
		hallNameExpression(),
		mealTimeExpression(),
		foodOptionExpression(),
		foodCatalogSourceJoinClause(),
	)

	var f domain.Food
	err := r.db.Get(&f, query, id, userID, kitchenType)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *foodRepo) ListReviews(foodID int) (*domain.FoodReviewSummary, error) {
	reviews := make([]domain.FoodReview, 0)
	query := `SELECT id, food_id, user_id, student_name, rating, comment, create_at, update_at
	          FROM food_reviews
			  WHERE food_id = $1
			  ORDER BY update_at DESC, create_at DESC, id DESC`
	if err := r.db.Select(&reviews, query, foodID); err != nil {
		return nil, err
	}

	summary, err := r.selectReviewSummary(foodID)
	if err != nil {
		return nil, err
	}

	summary.Reviews = reviews
	return summary, nil
}

func (r *foodRepo) UpsertReview(input domain.FoodReviewInput) (*domain.FoodReview, error) {
	query := `INSERT INTO food_reviews (food_id, user_id, student_name, rating, comment)
	          VALUES ($1, $2, $3, $4, $5)
			  ON CONFLICT (food_id, user_id) DO UPDATE
			  SET student_name = EXCLUDED.student_name,
			      rating = EXCLUDED.rating,
				  comment = EXCLUDED.comment,
				  update_at = current_timestamp
			  RETURNING id, food_id, user_id, student_name, rating, comment, create_at, update_at`

	var review domain.FoodReview
	if err := r.db.Get(
		&review,
		query,
		input.FoodID,
		input.UserID,
		input.StudentName,
		input.Rating,
		input.Comment,
	); err != nil {
		return nil, err
	}

	return &review, nil
}

func (r *foodRepo) Update(f domain.Food) (*domain.Food, error) {
	storedCategory := encodeStoredFoodCategory(f.Category, f.MealTime, f.FoodOption)

	query := `UPDATE foods
	          SET food_name = $1, category = $2, price = $3, stock = $4, image = $5, visible = $6, provider_name = $7, provider_type = $8, approval_status = $9, update_at = current_timestamp
			  WHERE id = $10 AND user_id = $11 AND kitchen_type = $12
			  RETURNING create_at, update_at`
	err := r.db.QueryRow(
		query,
		f.FoodName,
		storedCategory,
		f.Price,
		f.Stock,
		f.Image,
		f.Visible,
		f.ProviderName,
		f.ProviderType,
		f.ApprovalStatus,
		f.ID,
		f.UserID,
		f.KitchenType,
	).Scan(&f.CreatedAt, &f.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, err
		}
		return nil, err
	}
	return &f, nil
}

func (r *foodRepo) Delete(id int, userID, kitchenType string) error {
	query := `DELETE FROM foods WHERE id = $1 AND user_id = $2 AND kitchen_type = $3`
	result, err := r.db.Exec(query, id, userID, kitchenType)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *foodRepo) countCatalogItems(whereClause string, args []interface{}) (int, error) {
	query := "SELECT COUNT(*) FROM foods" + foodCatalogSourceJoinClause() + whereClause
	var total int

	if len(args) == 0 {
		query = r.db.Rebind(query)
		if err := r.db.Get(&total, query); err != nil {
			return 0, err
		}
		return total, nil
	}

	query, expandedArgs, err := sqlx.In(query, args...)
	if err != nil {
		return 0, err
	}

	query = r.db.Rebind(query)

	if err := r.db.Get(&total, query, expandedArgs...); err != nil {
		return 0, err
	}

	return total, nil
}

func (r *foodRepo) selectCatalogItems(whereClause, orderBy string, args []interface{}, page, limit int) ([]domain.FoodCatalogItem, error) {
	query := fmt.Sprintf(
		`SELECT foods.id,
		        foods.food_name,
		        %s AS category,
		        foods.provider_name,
		        foods.provider_type,
		        %s AS hall_name,
		        %s AS meal_time,
		        %s AS food_option,
		        %s AS price_value,
		        foods.stock,
		        foods.image,
		        CASE WHEN foods.provider_type = 'Student Homemade' THEN false ELSE true END AS free_delivery,
		        (%s * 4) AS points_cost,
		        %s AS rating,
		        %s AS popularity,
		        %s AS review_count
		   FROM foods%s%s%s
		  ORDER BY %s
		  LIMIT ? OFFSET ?`,
		foodCategoryExpression(),
		hallNameExpression(),
		mealTimeExpression(),
		foodOptionExpression(),
		priceValueExpression(),
		priceValueExpression(),
		ratingExpression(),
		popularityExpression(),
		reviewCountExpression(),
		foodCatalogSourceJoinClause(),
		reviewStatsJoinClause(),
		whereClause,
		orderBy,
	)

	queryArgs := append([]interface{}{}, args...)
	queryArgs = append(queryArgs, limit, (page-1)*limit)

	query, expandedArgs, err := sqlx.In(query, queryArgs...)
	if err != nil {
		return nil, err
	}

	query = r.db.Rebind(query)

	var foods []domain.FoodCatalogItem
	err = r.db.Select(&foods, query, expandedArgs...)
	return foods, err
}

func normalizeFoodCatalogQuery(query domain.FoodCatalogQuery) domain.FoodCatalogQuery {
	query.Search = strings.TrimSpace(query.Search)
	query.ProviderType = strings.TrimSpace(query.ProviderType)
	query.HallName = strings.TrimSpace(query.HallName)
	query.ProviderName = strings.TrimSpace(query.ProviderName)
	query.SortBy = strings.TrimSpace(query.SortBy)

	query.MealTime = strings.TrimSpace(query.MealTime)
	if query.MealTime != "" {
		mealTime, err := normalizeFoodMealTime(query.MealTime)
		if err == nil {
			query.MealTime = mealTime
		} else {
			query.MealTime = ""
		}
	}

	query.FoodOption = strings.TrimSpace(query.FoodOption)
	if query.FoodOption != "" {
		foodOption, err := normalizeFoodOption(query.FoodOption)
		if err == nil {
			query.FoodOption = foodOption
		} else {
			query.FoodOption = ""
		}
	}

	if query.Page <= 0 {
		query.Page = defaultFoodCatalogPage
	}

	if query.Limit <= 0 {
		query.Limit = defaultFoodCatalogLimit
	}

	if len(query.IDs) > 0 && query.Limit < len(query.IDs) {
		query.Limit = len(query.IDs)
	}

	if len(query.IDs) == 0 && query.Limit > maxFoodCatalogLimit {
		query.Limit = maxFoodCatalogLimit
	}

	if query.MinPrice < 0 {
		query.MinPrice = 0
	}

	if query.MaxPrice < 0 {
		query.MaxPrice = 0
	}

	if query.MaxPrice > 0 && query.MinPrice > query.MaxPrice {
		query.MinPrice, query.MaxPrice = query.MaxPrice, query.MinPrice
	}

	return query
}

func buildFoodCatalogWhereClause(query domain.FoodCatalogQuery, options foodCatalogWhereOptions) (string, []interface{}) {
	filters := []string{
		"foods.visible = true",
		"foods.approval_status = 'approved'",
		"foods.stock > 0",
	}
	args := make([]interface{}, 0, 14)

	if len(query.IDs) > 0 {
		filters = append(filters, "foods.id IN (?)")
		args = append(args, query.IDs)
	}

	if query.Search != "" {
		searchPattern := "%" + strings.ToLower(strings.TrimSpace(query.Search)) + "%"
		filters = append(
			filters,
			"(LOWER(foods.food_name) LIKE ? OR LOWER(TRIM(COALESCE(foods.provider_name, ''))) LIKE ? OR LOWER("+foodCategoryExpression()+") LIKE ? OR LOWER("+hallNameExpression()+") LIKE ?)",
		)
		args = append(args, searchPattern, searchPattern, searchPattern, searchPattern)
	}

	if query.ProviderType != "" {
		filters = append(filters, "foods.provider_type = ?")
		args = append(args, query.ProviderType)
	}

	if options.includeHallName && query.HallName != "" {
		filters = append(filters, "LOWER("+hallNameExpression()+") = LOWER(?)")
		args = append(args, query.HallName)
	}

	if options.includeProvider && query.ProviderName != "" {
		filters = append(filters, "LOWER(TRIM(COALESCE(foods.provider_name, ''))) = LOWER(?)")
		args = append(args, query.ProviderName)
	}

	if options.includeMealTime && query.MealTime != "" {
		filters = append(filters, "("+mealTimeExpression()+") = ?")
		args = append(args, query.MealTime)
	}

	if options.includeFoodOption && query.FoodOption != "" {
		filters = append(filters, "("+foodOptionExpression()+") = ?")
		args = append(args, query.FoodOption)
	}

	if options.includePriceRange && query.MinPrice > 0 {
		filters = append(filters, priceValueExpression()+" >= ?")
		args = append(args, query.MinPrice)
	}

	if options.includePriceRange && query.MaxPrice > 0 {
		filters = append(filters, priceValueExpression()+" <= ?")
		args = append(args, query.MaxPrice)
	}

	if query.FreeDeliveryOnly {
		filters = append(filters, "foods.provider_type <> 'Student Homemade'")
	}

	if query.PointsOnly {
		filters = append(filters, priceValueExpression()+" > 0")
	}

	whereClause := ""
	if len(filters) > 0 {
		whereClause = " WHERE " + strings.Join(filters, " AND ")
	}

	return whereClause, args
}

func (r *foodRepo) selectCatalogFilters(query domain.FoodCatalogQuery) (domain.FoodCatalogFilters, error) {
	mealTimeWhereClause, mealTimeArgs := buildFoodCatalogWhereClause(query, foodCatalogWhereOptions{
		includePriceRange: false,
		includeHallName:   true,
		includeProvider:   true,
		includeMealTime:   false,
		includeFoodOption: true,
	})

	mealTimes, err := r.selectDistinctCatalogValues(mealTimeExpression(), mealTimeWhereClause, mealTimeArgs)
	if err != nil {
		return domain.FoodCatalogFilters{}, err
	}

	for index, value := range mealTimes {
		normalizedMealTime, normalizeErr := normalizeFoodMealTime(value)
		if normalizeErr != nil {
			mealTimes[index] = domain.FoodMealTimeAny
			continue
		}
		mealTimes[index] = normalizedMealTime
	}
	sortMealTimes(mealTimes)
	if len(mealTimes) == 0 {
		mealTimes = []string{
			domain.FoodMealTimeLunch,
			domain.FoodMealTimeDinner,
			domain.FoodMealTimeAny,
		}
	}

	foodOptionWhereClause, foodOptionArgs := buildFoodCatalogWhereClause(query, foodCatalogWhereOptions{
		includePriceRange: false,
		includeHallName:   true,
		includeProvider:   true,
		includeMealTime:   true,
		includeFoodOption: false,
	})

	foodOptions, err := r.selectDistinctCatalogValues(foodOptionExpression(), foodOptionWhereClause, foodOptionArgs)
	if err != nil {
		return domain.FoodCatalogFilters{}, err
	}

	for index, value := range foodOptions {
		normalizedFoodOption, normalizeErr := normalizeFoodOption(value)
		if normalizeErr != nil {
			foodOptions[index] = domain.FoodOptionSingle
			continue
		}
		foodOptions[index] = normalizedFoodOption
	}
	sortFoodOptions(foodOptions)
	if len(foodOptions) == 0 {
		foodOptions = []string{
			domain.FoodOptionSingle,
			domain.FoodOptionSystem,
		}
	}

	halls, err := r.selectRegisteredHallNames()
	if err != nil {
		return domain.FoodCatalogFilters{}, err
	}

	hallKitchens, err := r.selectRegisteredHallKitchens()
	if err != nil {
		return domain.FoodCatalogFilters{}, err
	}

	campusKitchens, err := r.selectRegisteredCampusKitchens()
	if err != nil {
		return domain.FoodCatalogFilters{}, err
	}

	studentKitchens, err := r.selectRegisteredStudentKitchens()
	if err != nil {
		return domain.FoodCatalogFilters{}, err
	}

	return domain.FoodCatalogFilters{
		MealTimes:       mealTimes,
		FoodOptions:     foodOptions,
		Halls:           halls,
		HallKitchens:    hallKitchens,
		CampusKitchens:  campusKitchens,
		StudentKitchens: studentKitchens,
		Providers:       combineProviderNames(hallKitchens, campusKitchens, studentKitchens),
	}, nil
}

func (r *foodRepo) selectRegisteredHallNames() ([]string, error) {
	query := `SELECT value
	          FROM (
			    SELECT DISTINCT TRIM(COALESCE(hall_name, '')) AS value
	            FROM hall_kitchen
			    WHERE status = 'approved' AND TRIM(COALESCE(hall_name, '')) <> ''
			  ) AS registered_halls
			  ORDER BY LOWER(value) ASC, value ASC`

	values := make([]string, 0)
	if err := r.db.Select(&values, query); err != nil {
		return nil, err
	}

	return values, nil
}

func (r *foodRepo) selectRegisteredHallKitchens() ([]domain.FoodProviderOption, error) {
	query := `SELECT name, hall_name
	          FROM (
			    SELECT DISTINCT TRIM(COALESCE(kitchen_name, '')) AS name,
	                   TRIM(COALESCE(hall_name, '')) AS hall_name
	            FROM hall_kitchen
			    WHERE status = 'approved'
			      AND TRIM(COALESCE(kitchen_name, '')) <> ''
			  ) AS registered_hall_kitchens
			  ORDER BY LOWER(name) ASC, LOWER(hall_name) ASC, name ASC, hall_name ASC`

	return r.selectProviderOptionsFromRows(query, true)
}

func (r *foodRepo) selectRegisteredCampusKitchens() ([]domain.FoodProviderOption, error) {
	query := `SELECT name, hall_name
	          FROM (
			    SELECT DISTINCT TRIM(COALESCE(kitchen_name, '')) AS name,
	                   '' AS hall_name
	            FROM camp_kitchen
			    WHERE status = 'approved'
			      AND TRIM(COALESCE(kitchen_name, '')) <> ''
			  ) AS registered_campus_kitchens
			  ORDER BY LOWER(name) ASC, name ASC`

	return r.selectProviderOptionsFromRows(query, false)
}

func (r *foodRepo) selectRegisteredStudentKitchens() ([]domain.FoodProviderOption, error) {
	query := `SELECT name, hall_name
	          FROM (
			    SELECT DISTINCT TRIM(COALESCE(seller_name, '')) AS name,
	                   TRIM(COALESCE(hall_name, '')) AS hall_name
	            FROM student_kitchen
			    WHERE status = 'approved'
			      AND TRIM(COALESCE(seller_name, '')) <> ''
			  ) AS registered_student_kitchens
			  ORDER BY LOWER(name) ASC, LOWER(hall_name) ASC, name ASC, hall_name ASC`

	return r.selectProviderOptionsFromRows(query, false)
}

func (r *foodRepo) selectProviderOptionsFromRows(query string, includeHallName bool) ([]domain.FoodProviderOption, error) {
	type providerOptionRow struct {
		Name     string `db:"name"`
		HallName string `db:"hall_name"`
	}

	rows := make([]providerOptionRow, 0)
	if err := r.db.Select(&rows, query); err != nil {
		return nil, err
	}

	options := make([]domain.FoodProviderOption, 0, len(rows))
	seen := make(map[string]struct{}, len(rows))

	for _, row := range rows {
		name := strings.TrimSpace(row.Name)
		hallName := strings.TrimSpace(row.HallName)

		if name == "" {
			continue
		}

		if !includeHallName {
			hallName = ""
		}

		key := strings.ToLower(name) + "\x00" + strings.ToLower(hallName)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}

		options = append(options, domain.FoodProviderOption{
			Name:     name,
			HallName: hallName,
		})
	}

	return options, nil
}

func (r *foodRepo) selectCatalogPriceBounds(whereClause string, args []interface{}) (int, int, error) {
	query := fmt.Sprintf(
		"SELECT COALESCE(MIN(%s), 0) AS min_price, COALESCE(MAX(%s), 0) AS max_price FROM foods%s%s",
		priceValueExpression(),
		priceValueExpression(),
		foodCatalogSourceJoinClause(),
		whereClause,
	)

	type priceBoundsRow struct {
		MinPrice int `db:"min_price"`
		MaxPrice int `db:"max_price"`
	}

	var bounds priceBoundsRow

	if len(args) == 0 {
		query = r.db.Rebind(query)
		if err := r.db.Get(&bounds, query); err != nil {
			return 0, 0, err
		}
		return bounds.MinPrice, bounds.MaxPrice, nil
	}

	query, expandedArgs, err := sqlx.In(query, args...)
	if err != nil {
		return 0, 0, err
	}

	query = r.db.Rebind(query)
	if err := r.db.Get(&bounds, query, expandedArgs...); err != nil {
		return 0, 0, err
	}

	return bounds.MinPrice, bounds.MaxPrice, nil
}

func (r *foodRepo) selectDistinctCatalogValues(expression, whereClause string, args []interface{}) ([]string, error) {
	valueExpr := fmt.Sprintf("TRIM(COALESCE(%s, ''))", expression)
	baseQuery := fmt.Sprintf("SELECT DISTINCT %s AS value FROM foods%s%s", valueExpr, foodCatalogSourceJoinClause(), whereClause)

	if whereClause == "" {
		baseQuery += " WHERE " + valueExpr + " <> ''"
	} else {
		baseQuery += " AND " + valueExpr + " <> ''"
	}

	query := "SELECT value FROM (" + baseQuery + ") AS distinct_values ORDER BY LOWER(value) ASC, value ASC"

	if len(args) > 0 {
		var err error
		query, args, err = sqlx.In(query, args...)
		if err != nil {
			return nil, err
		}
	}

	query = r.db.Rebind(query)

	var values []string
	if err := r.db.Select(&values, query, args...); err != nil {
		return nil, err
	}

	return values, nil
}

func (r *foodRepo) selectDistinctProviderOptions(whereClause string, args []interface{}, includeHallName bool) ([]domain.FoodProviderOption, error) {
	hallExpr := "''"
	if includeHallName {
		hallExpr = hallNameExpression()
	}

	baseQuery := fmt.Sprintf(
		`SELECT DISTINCT TRIM(COALESCE(foods.provider_name, '')) AS name,
		        TRIM(COALESCE(%s, '')) AS hall_name
		   FROM foods%s%s`,
		hallExpr,
		foodCatalogSourceJoinClause(),
		whereClause,
	)

	if whereClause == "" {
		baseQuery += " WHERE TRIM(COALESCE(foods.provider_name, '')) <> ''"
	} else {
		baseQuery += " AND TRIM(COALESCE(foods.provider_name, '')) <> ''"
	}

	query := "SELECT name, hall_name FROM (" + baseQuery + ") AS provider_values ORDER BY LOWER(name) ASC, LOWER(COALESCE(hall_name, '')) ASC, name ASC, hall_name ASC"

	if len(args) > 0 {
		var err error
		query, args, err = sqlx.In(query, args...)
		if err != nil {
			return nil, err
		}
	}

	query = r.db.Rebind(query)

	type providerOptionRow struct {
		Name     string `db:"name"`
		HallName string `db:"hall_name"`
	}

	rows := make([]providerOptionRow, 0)
	if err := r.db.Select(&rows, query, args...); err != nil {
		return nil, err
	}

	options := make([]domain.FoodProviderOption, 0, len(rows))
	seen := make(map[string]struct{}, len(rows))

	for _, row := range rows {
		name := strings.TrimSpace(row.Name)
		hallName := strings.TrimSpace(row.HallName)

		if name == "" {
			continue
		}

		if !includeHallName {
			hallName = ""
		}

		key := strings.ToLower(name) + "\x00" + strings.ToLower(hallName)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}

		options = append(options, domain.FoodProviderOption{
			Name:     name,
			HallName: hallName,
		})
	}

	return options, nil
}

func (r *foodRepo) selectReviewSummary(foodID int) (*domain.FoodReviewSummary, error) {
	query := `SELECT $1::integer AS food_id,
	                 COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::float8 AS average_rating,
					 COUNT(*)::integer AS review_count
	          FROM food_reviews
			  WHERE food_id = $1`

	type reviewSummaryRow struct {
		FoodID        int     `db:"food_id"`
		AverageRating float64 `db:"average_rating"`
		ReviewCount   int     `db:"review_count"`
	}

	var row reviewSummaryRow
	if err := r.db.Get(&row, query, foodID); err != nil {
		return nil, err
	}

	return &domain.FoodReviewSummary{
		FoodID:        row.FoodID,
		AverageRating: row.AverageRating,
		ReviewCount:   row.ReviewCount,
		Reviews:       []domain.FoodReview{},
	}, nil
}

func priceValueExpression() string {
	return "COALESCE(NULLIF(regexp_replace(foods.price, '[^0-9]', '', 'g'), ''), '0')::integer"
}

func ratingExpression() string {
	return "COALESCE(review_stats.average_rating, 0)"
}

func reviewCountExpression() string {
	return "COALESCE(review_stats.review_count, 0)"
}

func popularityExpression() string {
	return "(COALESCE(review_stats.review_count, 0) * 10 + foods.stock)"
}

func reviewStatsJoinClause() string {
	return ` LEFT JOIN (
		SELECT food_id,
		       COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::float8 AS average_rating,
			   COUNT(*)::integer AS review_count
		  FROM food_reviews
		 GROUP BY food_id
	) AS review_stats ON review_stats.food_id = foods.id`
}

func foodCatalogSourceJoinClause() string {
	return ` LEFT JOIN hall_kitchen ON hall_kitchen.user_id::text = foods.user_id AND foods.kitchen_type = 'hall_kitchen'
	LEFT JOIN student_kitchen ON student_kitchen.user_id::text = foods.user_id AND foods.kitchen_type = 'student_kitchen'`
}

func hallNameExpression() string {
	return `CASE
		WHEN foods.kitchen_type = 'hall_kitchen' THEN COALESCE(hall_kitchen.hall_name, '')
		WHEN foods.kitchen_type = 'student_kitchen' THEN COALESCE(student_kitchen.hall_name, '')
		ELSE ''
	END`
}

func foodCategoryExpression() string {
	return `COALESCE(
		NULLIF(
			TRIM(
				REGEXP_REPLACE(
					REGEXP_REPLACE(foods.category, '^\[(Lunch|Dinner|Any Time|Single|System|Package|Set Menu|Set Manu|Combo)\][[:space:]]*', '', 'i'),
					'^\[(Lunch|Dinner|Any Time|Single|System|Package|Set Menu|Set Manu|Combo)\][[:space:]]*',
					'',
					'i'
				)
			),
			''
		),
		TRIM(COALESCE(foods.category, ''))
	)`
}

func mealTimeExpression() string {
	return `CASE
		WHEN foods.category ~* '^\[Lunch\][[:space:]]*' THEN 'Lunch'
		WHEN foods.category ~* '^\[Dinner\][[:space:]]*' THEN 'Dinner'
		WHEN foods.category ~* '^\[Any Time\][[:space:]]*' THEN 'Any Time'
		WHEN LOWER(foods.category) LIKE '%lunch%' OR LOWER(foods.category) LIKE '%launch%' THEN 'Lunch'
		WHEN LOWER(foods.category) LIKE '%dinner%' THEN 'Dinner'
		ELSE 'Any Time'
	END`
}

func foodOptionExpression() string {
	return `CASE
		WHEN foods.category ~* '^\[(Lunch|Dinner|Any Time)\][[:space:]]*\[(System|Package|Set Menu|Set Manu|Combo)\][[:space:]]*' THEN 'System'
		WHEN foods.category ~* '^\[(Lunch|Dinner|Any Time)\][[:space:]]*\[Single\][[:space:]]*' THEN 'Single'
		WHEN foods.category ~* '^\[(System|Package|Set Menu|Set Manu|Combo)\][[:space:]]*' THEN 'System'
		WHEN foods.category ~* '^\[Single\][[:space:]]*' THEN 'Single'
		WHEN LOWER(foods.category) LIKE '%system%'
		  OR LOWER(foods.category) LIKE '%set menu%'
		  OR LOWER(foods.category) LIKE '%set manu%'
		  OR LOWER(foods.category) LIKE '%package%'
		  OR LOWER(foods.category) LIKE '%combo%' THEN 'System'
		WHEN LOWER(foods.category) LIKE '%single%' THEN 'Single'
		ELSE 'Single'
	END`
}

func buildFoodCatalogOrderBy(sortBy string) string {
	switch sortBy {
	case "rating":
		return ratingExpression() + " DESC, " + reviewCountExpression() + " DESC, " + popularityExpression() + " DESC, foods.update_at DESC, foods.id DESC"
	case "price":
		return priceValueExpression() + " ASC, " + popularityExpression() + " DESC, foods.update_at DESC, foods.id DESC"
	default:
		return popularityExpression() + " DESC, " + ratingExpression() + " DESC, " + reviewCountExpression() + " DESC, foods.update_at DESC, foods.id DESC"
	}
}

func normalizeFoodMealTime(raw string) (string, error) {
	switch strings.ToLower(strings.Join(strings.Fields(strings.TrimSpace(raw)), " ")) {
	case "", "any", "all", "all day", "any time":
		return domain.FoodMealTimeAny, nil
	case "lunch", "launch":
		return domain.FoodMealTimeLunch, nil
	case "dinner":
		return domain.FoodMealTimeDinner, nil
	default:
		return "", fmt.Errorf("invalid meal time")
	}
}

func normalizeFoodOption(raw string) (string, error) {
	switch strings.ToLower(strings.Join(strings.Fields(strings.TrimSpace(raw)), " ")) {
	case "", "single", "one", "single item":
		return domain.FoodOptionSingle, nil
	case "system", "set", "set menu", "set manu", "set-menu", "package", "combo", "package / set menu", "package/set menu", "full":
		return domain.FoodOptionSystem, nil
	default:
		return "", fmt.Errorf("invalid food option")
	}
}

func sortMealTimes(values []string) {
	order := map[string]int{
		domain.FoodMealTimeLunch:  1,
		domain.FoodMealTimeDinner: 2,
		domain.FoodMealTimeAny:    3,
	}

	sort.Slice(values, func(i, j int) bool {
		leftOrder, leftKnown := order[values[i]]
		rightOrder, rightKnown := order[values[j]]

		if leftKnown && rightKnown && leftOrder != rightOrder {
			return leftOrder < rightOrder
		}

		if leftKnown != rightKnown {
			return leftKnown
		}

		return strings.ToLower(values[i]) < strings.ToLower(values[j])
	})
}

func sortFoodOptions(values []string) {
	order := map[string]int{
		domain.FoodOptionSingle: 1,
		domain.FoodOptionSystem: 2,
	}

	sort.Slice(values, func(i, j int) bool {
		leftOrder, leftKnown := order[values[i]]
		rightOrder, rightKnown := order[values[j]]

		if leftKnown && rightKnown && leftOrder != rightOrder {
			return leftOrder < rightOrder
		}

		if leftKnown != rightKnown {
			return leftKnown
		}

		return strings.ToLower(values[i]) < strings.ToLower(values[j])
	})
}

func combineProviderNames(groups ...[]domain.FoodProviderOption) []string {
	seen := make(map[string]string)

	for _, group := range groups {
		for _, option := range group {
			name := strings.TrimSpace(option.Name)
			if name == "" {
				continue
			}

			key := strings.ToLower(name)
			if _, exists := seen[key]; exists {
				continue
			}

			seen[key] = name
		}
	}

	names := make([]string, 0, len(seen))
	for _, name := range seen {
		names = append(names, name)
	}

	sort.Slice(names, func(i, j int) bool {
		return strings.ToLower(names[i]) < strings.ToLower(names[j])
	})

	return names
}

func encodeStoredFoodCategory(category, mealTime, foodOption string) string {
	cleanCategory := stripStoredMealTimePrefix(category)
	if cleanCategory == "" {
		return ""
	}

	normalizedMealTime, err := normalizeFoodMealTime(mealTime)
	if err != nil {
		normalizedMealTime = domain.FoodMealTimeAny
	}

	normalizedFoodOption, optionErr := normalizeFoodOption(foodOption)
	if optionErr != nil {
		normalizedFoodOption = domain.FoodOptionSingle
	}

	prefixes := make([]string, 0, 2)
	if normalizedMealTime != domain.FoodMealTimeAny {
		prefixes = append(prefixes, fmt.Sprintf("[%s]", normalizedMealTime))
	}
	if normalizedFoodOption != "" {
		prefixes = append(prefixes, fmt.Sprintf("[%s]", normalizedFoodOption))
	}

	if len(prefixes) == 0 {
		return cleanCategory
	}

	return strings.Join(prefixes, "") + " " + cleanCategory
}

func stripStoredMealTimePrefix(category string) string {
	remaining := strings.TrimSpace(category)

	for {
		switch {
		case strings.HasPrefix(strings.ToLower(remaining), "[lunch]"):
			remaining = strings.TrimSpace(remaining[len("[lunch]"):])
		case strings.HasPrefix(strings.ToLower(remaining), "[dinner]"):
			remaining = strings.TrimSpace(remaining[len("[dinner]"):])
		case strings.HasPrefix(strings.ToLower(remaining), "[any time]"):
			remaining = strings.TrimSpace(remaining[len("[any time]"):])
		case strings.HasPrefix(strings.ToLower(remaining), "[single]"):
			remaining = strings.TrimSpace(remaining[len("[single]"):])
		case strings.HasPrefix(strings.ToLower(remaining), "[system]"):
			remaining = strings.TrimSpace(remaining[len("[system]"):])
		case strings.HasPrefix(strings.ToLower(remaining), "[package]"):
			remaining = strings.TrimSpace(remaining[len("[package]"):])
		case strings.HasPrefix(strings.ToLower(remaining), "[set menu]"):
			remaining = strings.TrimSpace(remaining[len("[set menu]"):])
		case strings.HasPrefix(strings.ToLower(remaining), "[set manu]"):
			remaining = strings.TrimSpace(remaining[len("[set manu]"):])
		case strings.HasPrefix(strings.ToLower(remaining), "[combo]"):
			remaining = strings.TrimSpace(remaining[len("[combo]"):])
		default:
			return remaining
		}
	}
}
