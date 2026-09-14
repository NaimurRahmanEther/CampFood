package aiassistant

import (
	"backend/config"
	"backend/domain"
	"backend/utils"
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

const (
	maxCatalogCandidates    = 80
	maxRecommendationResult = 5
	defaultLowBudgetCap     = 120
	maxAutoOrderQuantity    = 20
)

var (
	foodIDPattern               = regexp.MustCompile(`(?:food\s*)?id\s*#?\s*(\d{1,6})|#(\d{1,6})`)
	budgetPattern               = regexp.MustCompile(`(?:under|below|within|less than|max(?:imum)?|budget(?:\s+is|\s+around|\s+about)?)\s*(?:bdt|tk|taka)?\s*(\d{2,4})`)
	orderQuantityKeywordPattern = regexp.MustCompile(`(?:quantity|qty|qnty)\s*[:=]?\s*(\d{1,2})`)
	orderQuantityXPattern       = regexp.MustCompile(`\bx\s*(\d{1,2})\b|\b(\d{1,2})\s*x\b`)
	orderQuantityUnitPattern    = regexp.MustCompile(`\b(\d{1,2})\s*(?:pcs?|pieces?|plates?|items?|servings?)\b`)
	tokenPattern                = regexp.MustCompile(`[a-z0-9]+`)
)

var stopWords = map[string]struct{}{
	"i":          {},
	"me":         {},
	"my":         {},
	"want":       {},
	"would":      {},
	"like":       {},
	"need":       {},
	"please":     {},
	"show":       {},
	"suggest":    {},
	"find":       {},
	"give":       {},
	"food":       {},
	"foods":      {},
	"meal":       {},
	"meals":      {},
	"order":      {},
	"buy":        {},
	"checkout":   {},
	"place":      {},
	"now":        {},
	"spicy":      {},
	"hot":        {},
	"chili":      {},
	"chilli":     {},
	"jhal":       {},
	"budget":     {},
	"friendly":   {},
	"low":        {},
	"cheap":      {},
	"affordable": {},
	"under":      {},
	"below":      {},
	"within":     {},
	"less":       {},
	"than":       {},
	"point":      {},
	"points":     {},
	"cash":       {},
	"id":         {},
	"all":        {},
	"any":        {},
	"everything": {},
	"menu":       {},
	"menus":      {},
	"option":     {},
	"options":    {},
	"list":       {},
}

type service struct {
	cnf           *config.Config
	foodService   FoodService
	ordersService OrdersService
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRecommendation struct {
	FoodID       int     `json:"foodId"`
	Name         string  `json:"name"`
	Category     string  `json:"category"`
	Price        int     `json:"price"`
	Rating       float64 `json:"rating"`
	ReviewCount  int     `json:"reviewCount"`
	ProviderName string  `json:"providerName"`
	ProviderType string  `json:"providerType"`
	HallName     string  `json:"hallName,omitempty"`
	PointsCost   int     `json:"pointsCost"`
	FreeDelivery bool    `json:"freeDelivery"`
}

type ChatResponse struct {
	Reply           string                `json:"reply"`
	Recommendations []ChatRecommendation  `json:"recommendations"`
	OrderPlaced     *domain.DeliveryOrder `json:"orderPlaced,omitempty"`
}

type chatIntent struct {
	raw            string
	normalized     string
	searchTerms    []string
	wantsSpicy     bool
	maxBudget      int
	wantsOrder     bool
	wantsPoints    bool
	orderQuantity  int
	explicitFoodID int
}

func NewService(cnf *config.Config, foodService FoodService, ordersService OrdersService) Service {
	return &service{
		cnf:           cnf,
		foodService:   foodService,
		ordersService: ordersService,
	}
}

func (svc *service) Chat(user utils.Payload, message string, history []ChatMessage) (*ChatResponse, error) {
	trimmedMessage := strings.TrimSpace(message)
	if trimmedMessage == "" {
		return nil, fmt.Errorf("message is required")
	}

	intent := parseIntent(trimmedMessage)
	enrichIntentFromHistory(&intent, history)

	catalog, err := svc.loadCatalogCandidates(intent)
	if err != nil {
		return nil, err
	}
	if len(catalog) == 0 {
		return &ChatResponse{
			Reply:           "Not Found. No available food items right now.",
			Recommendations: []ChatRecommendation{},
		}, nil
	}

	exactMatches := filterCatalog(catalog, intent, true)
	hasExactMatches := len(exactMatches) > 0

	workingSet := exactMatches
	if len(workingSet) == 0 {
		workingSet = filterCatalog(catalog, intent, false)
	}
	if len(workingSet) == 0 {
		workingSet = catalog
	}

	ranked := rankCatalog(workingSet, intent)
	recommendations := mapRecommendations(ranked, maxRecommendationResult)

	response := &ChatResponse{
		Recommendations: recommendations,
	}

	response.Reply = buildSuggestionReply(intent, hasExactMatches, len(exactMatches), len(recommendations))
	return response, nil
}

func (svc *service) loadCatalogCandidates(intent chatIntent) ([]domain.FoodCatalogItem, error) {
	searchText := resolveSearchText(intent)

	allKitchenItems := make([][]domain.FoodCatalogItem, 0, 6)

	baseQuery := domain.FoodCatalogQuery{
		SortBy: "rating",
		Page:   1,
		Limit:  48,
	}
	if intent.maxBudget > 0 {
		baseQuery.MaxPrice = intent.maxBudget
	}
	if intent.explicitFoodID > 0 {
		baseQuery.IDs = []int{intent.explicitFoodID}
	} else if searchText != "" {
		baseQuery.Search = searchText
	}

	baseResult, err := svc.foodService.List(baseQuery)
	if err != nil {
		return nil, err
	}
	allKitchenItems = append(allKitchenItems, baseResult.Items)

	providerTypes := []string{"Hall", "Campus Kitchen", "Student Homemade"}
	for _, providerType := range providerTypes {
		providerQuery := domain.FoodCatalogQuery{
			ProviderType: providerType,
			SortBy:       "rating",
			Page:         1,
			Limit:        24,
		}
		if intent.maxBudget > 0 {
			providerQuery.MaxPrice = intent.maxBudget
		}
		if searchText != "" {
			providerQuery.Search = searchText
		}

		providerResult, providerErr := svc.foodService.List(providerQuery)
		if providerErr != nil {
			return nil, providerErr
		}
		allKitchenItems = append(allKitchenItems, providerResult.Items)
	}

	combined := mergeCatalogItems(allKitchenItems...)
	if len(combined) > maxCatalogCandidates {
		combined = combined[:maxCatalogCandidates]
	}

	return combined, nil
}

func mergeCatalogItems(groups ...[]domain.FoodCatalogItem) []domain.FoodCatalogItem {
	merged := make([]domain.FoodCatalogItem, 0, maxCatalogCandidates)
	seen := make(map[int]struct{}, maxCatalogCandidates)

	for _, group := range groups {
		for _, item := range group {
			if _, exists := seen[item.ID]; exists {
				continue
			}
			seen[item.ID] = struct{}{}
			merged = append(merged, item)
		}
	}

	return merged
}

func filterCatalog(items []domain.FoodCatalogItem, intent chatIntent, strict bool) []domain.FoodCatalogItem {
	filtered := make([]domain.FoodCatalogItem, 0, len(items))

	for _, item := range items {
		if intent.maxBudget > 0 && item.Price > intent.maxBudget {
			continue
		}

		if intent.wantsPoints && item.PointsCost <= 0 {
			continue
		}

		if strict {
			if intent.wantsSpicy && !isSpicyItem(item) {
				continue
			}

			if len(intent.searchTerms) > 0 && !matchesAnySearchTerm(item, intent.searchTerms) {
				continue
			}
		}

		filtered = append(filtered, item)
	}

	return filtered
}

func rankCatalog(items []domain.FoodCatalogItem, intent chatIntent) []domain.FoodCatalogItem {
	scored := make([]domain.FoodCatalogItem, len(items))
	copy(scored, items)

	sort.Slice(scored, func(i, j int) bool {
		leftScore := scoreItem(scored[i], intent)
		rightScore := scoreItem(scored[j], intent)

		if leftScore != rightScore {
			return leftScore > rightScore
		}

		if scored[i].Rating != scored[j].Rating {
			return scored[i].Rating > scored[j].Rating
		}

		if scored[i].Price != scored[j].Price {
			return scored[i].Price < scored[j].Price
		}

		if scored[i].ReviewCount != scored[j].ReviewCount {
			return scored[i].ReviewCount > scored[j].ReviewCount
		}

		return scored[i].ID < scored[j].ID
	})

	return scored
}

func scoreItem(item domain.FoodCatalogItem, intent chatIntent) int {
	score := int(item.Rating*100) + min(item.ReviewCount, 200)*2
	score += max(0, 300-item.Price)

	if intent.wantsSpicy && isSpicyItem(item) {
		score += 80
	}

	if intent.maxBudget > 0 {
		if item.Price <= intent.maxBudget {
			score += 30 + min(40, (intent.maxBudget-item.Price)/2)
		} else {
			score -= 100
		}
	}

	if intent.wantsPoints && item.PointsCost > 0 {
		score += 40
	}

	score += countSearchTermMatches(item, intent.searchTerms) * 70

	return score
}

func mapRecommendations(items []domain.FoodCatalogItem, limit int) []ChatRecommendation {
	if limit <= 0 {
		return []ChatRecommendation{}
	}

	selectedItems := diversifyByKitchen(items, limit)
	recommendations := make([]ChatRecommendation, 0, len(selectedItems))

	for _, item := range selectedItems {
		recommendations = append(recommendations, ChatRecommendation{
			FoodID:       item.ID,
			Name:         item.FoodName,
			Category:     item.Category,
			Price:        item.Price,
			Rating:       item.Rating,
			ReviewCount:  item.ReviewCount,
			ProviderName: item.ProviderName,
			ProviderType: item.ProviderType,
			HallName:     item.HallName,
			PointsCost:   item.PointsCost,
			FreeDelivery: item.FreeDelivery,
		})
	}

	return recommendations
}

func diversifyByKitchen(items []domain.FoodCatalogItem, limit int) []domain.FoodCatalogItem {
	if len(items) == 0 || limit <= 0 {
		return []domain.FoodCatalogItem{}
	}

	selected := make([]domain.FoodCatalogItem, 0, min(len(items), limit))
	seen := make(map[int]struct{}, limit)

	providerPriority := []string{"Hall", "Campus Kitchen", "Student Homemade"}
	for _, providerType := range providerPriority {
		if len(selected) >= limit {
			break
		}
		for _, item := range items {
			if item.ProviderType != providerType {
				continue
			}
			if _, exists := seen[item.ID]; exists {
				continue
			}
			seen[item.ID] = struct{}{}
			selected = append(selected, item)
			break
		}
	}

	for _, item := range items {
		if len(selected) >= limit {
			break
		}
		if _, exists := seen[item.ID]; exists {
			continue
		}
		seen[item.ID] = struct{}{}
		selected = append(selected, item)
	}

	return selected
}

func pickOrderTarget(intent chatIntent, ranked []domain.FoodCatalogItem, catalog []domain.FoodCatalogItem) *domain.FoodCatalogItem {
	if intent.explicitFoodID > 0 {
		if match := findFoodByID(ranked, intent.explicitFoodID); match != nil {
			return match
		}
		if match := findFoodByID(catalog, intent.explicitFoodID); match != nil {
			return match
		}
	}

	if len(ranked) == 0 {
		return nil
	}

	selected := ranked[0]
	return &selected
}

func findFoodByID(items []domain.FoodCatalogItem, foodID int) *domain.FoodCatalogItem {
	for index := range items {
		if items[index].ID == foodID {
			selected := items[index]
			return &selected
		}
	}

	return nil
}

func buildSuggestionReply(intent chatIntent, hasExact bool, exactCount int, recommendationCount int) string {
	if recommendationCount == 0 {
		return "Not Found. No matching foods are available right now. Try: `show all food` or `budget friendly`."
	}

	requestSummary := describeRequest(intent)
	if hasExact {
		return fmt.Sprintf("Found %d matched item(s) for %s across all kitchens.", exactCount, requestSummary)
	}

	return fmt.Sprintf(
		"No exact match for %s. Showing the closest available options from all kitchens. You can also try: `budget friendly`, `spicy under 120`, or `show all food`.",
		requestSummary,
	)
}

func describeRequest(intent chatIntent) string {
	parts := make([]string, 0, 4)

	if intent.wantsSpicy {
		parts = append(parts, "spicy food")
	}
	if intent.maxBudget > 0 {
		parts = append(parts, fmt.Sprintf("budget under %d BDT", intent.maxBudget))
	}
	if len(intent.searchTerms) > 0 {
		parts = append(parts, fmt.Sprintf("keywords: %s", strings.Join(intent.searchTerms, ", ")))
	}
	if intent.wantsPoints {
		parts = append(parts, "points payment")
	}

	if len(parts) == 0 {
		return "your request"
	}

	return strings.Join(parts, " + ")
}

func parseIntent(message string) chatIntent {
	normalized := strings.ToLower(strings.TrimSpace(message))

	intent := chatIntent{
		raw:        message,
		normalized: normalized,
	}

	intent.wantsOrder = containsAny(normalized, []string{
		"order", "buy", "checkout", "place order", "place it",
	})
	intent.wantsPoints = strings.Contains(normalized, "point")
	intent.wantsSpicy = containsAny(normalized, []string{"spicy", "hot", "chili", "chilli", "jhal"})
	intent.orderQuantity = parseOrderQuantity(normalized)

	intent.explicitFoodID = parseFoodID(normalized)
	intent.maxBudget = parseBudgetLimit(normalized)

	if intent.maxBudget == 0 && containsAny(normalized, []string{
		"low budget", "budget friendly", "bugget friendly", "buggest friendly", "cheap", "affordable", "low cost", "low-cost",
	}) {
		intent.maxBudget = defaultLowBudgetCap
	}

	intent.searchTerms = extractSearchTerms(normalized)

	return intent
}

func enrichIntentFromHistory(intent *chatIntent, history []ChatMessage) {
	if intent == nil || len(history) == 0 {
		return
	}

	if intent.explicitFoodID > 0 || intent.maxBudget > 0 || intent.wantsSpicy || len(intent.searchTerms) > 0 {
		return
	}

	for index := len(history) - 1; index >= 0; index-- {
		if normalizeHistoryRole(history[index].Role) != "user" {
			continue
		}

		previousMessage := strings.TrimSpace(history[index].Content)
		if previousMessage == "" || strings.EqualFold(previousMessage, intent.raw) {
			continue
		}

		previousIntent := parseIntent(previousMessage)
		if previousIntent.explicitFoodID > 0 {
			intent.explicitFoodID = previousIntent.explicitFoodID
		}
		if intent.maxBudget == 0 {
			intent.maxBudget = previousIntent.maxBudget
		}
		if !intent.wantsSpicy {
			intent.wantsSpicy = previousIntent.wantsSpicy
		}
		if len(intent.searchTerms) == 0 {
			intent.searchTerms = previousIntent.searchTerms
		}
		if previousIntent.wantsPoints {
			intent.wantsPoints = true
		}

		break
	}
}

func normalizeHistoryRole(role string) string {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "bot", "assistant":
		return "assistant"
	default:
		return "user"
	}
}

func parseFoodID(normalized string) int {
	matches := foodIDPattern.FindStringSubmatch(normalized)
	if len(matches) == 0 {
		return 0
	}

	for _, part := range matches[1:] {
		if strings.TrimSpace(part) == "" {
			continue
		}
		value, err := strconv.Atoi(part)
		if err == nil && value > 0 {
			return value
		}
	}

	return 0
}

func parseBudgetLimit(normalized string) int {
	matches := budgetPattern.FindAllStringSubmatch(normalized, -1)
	if len(matches) == 0 {
		return 0
	}

	limit := 0
	for _, match := range matches {
		if len(match) < 2 {
			continue
		}
		value, err := strconv.Atoi(match[1])
		if err != nil || value <= 0 {
			continue
		}
		if limit == 0 || value < limit {
			limit = value
		}
	}

	return limit
}

func parseOrderQuantity(normalized string) int {
	candidates := []string{
		findFirstNumberFromPattern(orderQuantityKeywordPattern, normalized),
		findFirstNumberFromPattern(orderQuantityXPattern, normalized),
		findFirstNumberFromPattern(orderQuantityUnitPattern, normalized),
	}

	for _, raw := range candidates {
		if strings.TrimSpace(raw) == "" {
			continue
		}

		value, err := strconv.Atoi(raw)
		if err != nil {
			continue
		}
		if value <= 0 {
			continue
		}
		if value > maxAutoOrderQuantity {
			return maxAutoOrderQuantity
		}
		return value
	}

	return 0
}

func findFirstNumberFromPattern(pattern *regexp.Regexp, text string) string {
	matches := pattern.FindStringSubmatch(text)
	if len(matches) == 0 {
		return ""
	}

	for _, match := range matches[1:] {
		if strings.TrimSpace(match) != "" {
			return match
		}
	}

	return ""
}

func extractSearchTerms(normalized string) []string {
	tokens := tokenPattern.FindAllString(normalized, -1)
	if len(tokens) == 0 {
		return []string{}
	}

	terms := make([]string, 0, 8)
	seen := make(map[string]struct{}, 8)

	for _, token := range tokens {
		if _, err := strconv.Atoi(token); err == nil {
			continue
		}

		if len(token) < 3 {
			continue
		}

		if _, isStopWord := stopWords[token]; isStopWord {
			continue
		}

		if _, exists := seen[token]; exists {
			continue
		}
		seen[token] = struct{}{}
		terms = append(terms, token)

		if len(terms) >= 8 {
			break
		}
	}

	return terms
}

func matchesAnySearchTerm(item domain.FoodCatalogItem, terms []string) bool {
	if len(terms) == 0 {
		return true
	}

	searchBase := strings.ToLower(strings.Join([]string{
		item.FoodName,
		item.Category,
		item.ProviderName,
		item.ProviderType,
		item.HallName,
	}, " "))

	for _, term := range terms {
		if strings.Contains(searchBase, strings.ToLower(term)) {
			return true
		}
	}

	return false
}

func countSearchTermMatches(item domain.FoodCatalogItem, terms []string) int {
	if len(terms) == 0 {
		return 0
	}

	searchBase := strings.ToLower(strings.Join([]string{
		item.FoodName,
		item.Category,
		item.ProviderName,
		item.ProviderType,
		item.HallName,
	}, " "))

	matches := 0
	for _, term := range terms {
		if strings.Contains(searchBase, strings.ToLower(term)) {
			matches++
		}
	}

	return matches
}

func isSpicyItem(item domain.FoodCatalogItem) bool {
	searchBase := strings.ToLower(item.FoodName + " " + item.Category)
	return containsAny(searchBase, []string{"spicy", "hot", "chili", "chilli", "jhal"})
}

func resolveSearchText(intent chatIntent) string {
	if len(intent.searchTerms) > 0 {
		return strings.Join(intent.searchTerms, " ")
	}
	if intent.wantsSpicy {
		return "spicy"
	}
	return ""
}

func containsAny(value string, patterns []string) bool {
	for _, pattern := range patterns {
		if strings.Contains(value, pattern) {
			return true
		}
	}

	return false
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
