package repo

import (
	"backend/domain"
	"backend/orders"
	"backend/utils"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/jmoiron/sqlx"
)

const (
	standardFreeFirstCashServiceChargeRate       = 0.03
	standardPaidOnlyCashServiceChargeRate        = 0.05
	studentKitchenFreeFirstCashServiceChargeRate = 0.05
	studentKitchenPaidOnlyCashServiceChargeRate  = 0.10
	freeDeliveryCompletionRewardRate             = 0.10
	pointsExchangeRate                           = 4
	freeDeliveryPartnerMaxActiveOrders           = 3
	studentKitchenProviderType                   = "Student Homemade"
	freeDeliveryClaimWindow                      = 5 * time.Minute
	deliveryOrderStatusPending                   = "pending"
	deliveryOrderStatusAccepted                  = "accepted"
	deliveryOrderStatusDelivered                 = "delivered"
	deliveryOrderStatusCanceled                  = "canceled"
	deliveryRouteModeFreeFirst                   = "free-first"
	deliveryRouteModePaidOnly                    = "paid-only"
	incidentTypeForwardedToPaid                  = "forwarded-to-paid"
	incidentTypeCanceled                         = "canceled"
	systemActorName                              = "System"
	systemActorRole                              = "system"
	systemAutoForwardMessage                     = "Order moved to paid delivery service."
)

type OrdersRepository interface {
	orders.OrdersRepository
}

type ordersRepo struct {
	db *sqlx.DB
	mu sync.Mutex
}

type orderRow struct {
	ID                    string `db:"id"`
	StudentUserID         string `db:"student_user_id"`
	StudentName           string `db:"student_name"`
	StudentEmail          string `db:"student_email"`
	Status                string `db:"status"`
	RouteMode             string `db:"route_mode"`
	DeliveryRecipientName string `db:"delivery_recipient_name"`
	DeliveryPhone         string `db:"delivery_phone"`
	DeliveryHall          string `db:"delivery_hall"`
	DeliveryAddress       string `db:"delivery_address"`
	DeliveryLandmark      string `db:"delivery_landmark"`
	DeliveryNote          string `db:"delivery_note"`
	TotalItems            int    `db:"total_items"`
	CashSubtotal          int    `db:"cash_subtotal"`
	ServiceCharge         int    `db:"service_charge"`
	CashPayable           int    `db:"cash_payable"`
	PointsPayable         int    `db:"points_payable"`
	AssignedToUserID      string `db:"assigned_to_user_id"`
	AssignedToName        string `db:"assigned_to_name"`
	AssignedPlan          string `db:"assigned_plan"`
	AssignedAt            string `db:"assigned_at"`
	DeliveredAt           string `db:"delivered_at"`
	CreatedAt             string `db:"created_at"`
}

type orderItemRow struct {
	ID             string `db:"id"`
	OrderID        string `db:"order_id"`
	FoodID         int    `db:"food_id"`
	FoodName       string `db:"food_name"`
	ProviderName   string `db:"provider_name"`
	ProviderType   string `db:"provider_type"`
	Quantity       int    `db:"quantity"`
	PaymentMode    string `db:"payment_mode"`
	Subtotal       int    `db:"subtotal"`
	ServiceCharge  int    `db:"service_charge"`
	PointsRequired int    `db:"points_required"`
	PayableCash    int    `db:"payable_cash"`
}

type incidentRow struct {
	ID        string `db:"id"`
	OrderID   string `db:"order_id"`
	Type      string `db:"incident_type"`
	Message   string `db:"message"`
	ActorName string `db:"actor_name"`
	ActorRole string `db:"actor_role"`
	CreatedAt string `db:"created_at"`
}

type orderFoodRow struct {
	ID             int    `db:"id"`
	FoodName       string `db:"food_name"`
	ProviderName   string `db:"provider_name"`
	ProviderType   string `db:"provider_type"`
	Price          int    `db:"price_value"`
	Stock          int    `db:"stock"`
	Visible        bool   `db:"visible"`
	ApprovalStatus string `db:"approval_status"`
}

func NewOrdersRepo(db *sqlx.DB) OrdersRepository {
	return &ordersRepo{db: db}
}

func (r *ordersRepo) Create(
	student utils.Payload,
	routeMode string,
	items []domain.CreateDeliveryOrderItem,
	deliveryDetails domain.DeliveryDetails,
) (*domain.DeliveryOrder, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if len(items) == 0 {
		return nil, fmt.Errorf("order must contain at least one item")
	}

	tx, err := r.db.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	foodsByID, err := r.loadOrderFoods(tx, items)
	if err != nil {
		return nil, err
	}

	orderItems, totals, err := buildOrderItems(items, foodsByID, routeMode)
	if err != nil {
		return nil, err
	}

	if err := r.reserveFoodStock(tx, orderItems); err != nil {
		return nil, err
	}

	var orderIDInt int
	var createdAt string
	err = tx.QueryRow(
		`INSERT INTO delivery_orders (
			 student_user_id,
			 student_name,
			 student_email,
			 status,
			 route_mode,
			 delivery_recipient_name,
			 delivery_phone,
			 delivery_hall,
			 delivery_address,
			 delivery_landmark,
			 delivery_note,
			 total_items,
			 cash_subtotal,
			 service_charge,
			 cash_payable,
			 points_payable
		 )
		 VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		 RETURNING id, created_at::text`,
		student.UserID,
		student.FullName,
		student.Email,
		routeMode,
		deliveryDetails.RecipientName,
		deliveryDetails.Phone,
		deliveryDetails.HallName,
		deliveryDetails.AddressLine,
		deliveryDetails.Landmark,
		deliveryDetails.Note,
		totals.Items,
		totals.CashSubtotal,
		totals.ServiceCharge,
		totals.CashPayable,
		totals.PointsPayable,
	).Scan(&orderIDInt, &createdAt)
	if err != nil {
		return nil, err
	}
	orderID := strconv.Itoa(orderIDInt)

	for _, item := range orderItems {
		if _, err := tx.Exec(
			`INSERT INTO delivery_order_items (order_id, food_id, food_name, provider_name, provider_type, quantity, payment_mode, subtotal, service_charge, points_required, payable_cash)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
			orderIDInt,
			item.FoodID,
			item.FoodName,
			item.ProviderName,
			item.ProviderType,
			item.Quantity,
			item.PaymentMode,
			item.Subtotal,
			item.ServiceCharge,
			item.PointsRequired,
			item.PayableCash,
		); err != nil {
			return nil, err
		}
	}

	if _, err := tx.Exec(
		`INSERT INTO delivery_order_incidents (order_id, incident_type, message, actor_name, actor_role)
		 VALUES ($1, 'created', $2, $3, 'student')`,
		orderIDInt,
		fmt.Sprintf("Order created by %s.", student.FullName),
		student.FullName,
	); err != nil {
		return nil, err
	}

	if totals.PointsPayable > 0 {
		if err := ensureStudentPointStateTx(tx, student.UserID); err != nil {
			return nil, err
		}

		if err := reconcileStudentPointStateTx(tx, student.UserID); err != nil {
			return nil, err
		}

		var availablePoints int
		if err := tx.Get(&availablePoints, `SELECT points FROM student_points WHERE student_user_id = $1 FOR UPDATE`, student.UserID); err != nil {
			return nil, err
		}

		if totals.PointsPayable > availablePoints {
			return nil, fmt.Errorf("not enough points available for this order")
		}

		if err := enforceDailyPointSpendLimitTx(tx, student.UserID, totals.PointsPayable); err != nil {
			return nil, err
		}

		if err := consumeStudentPointsTx(tx, student.UserID, totals.PointsPayable); err != nil {
			return nil, err
		}

		if _, err := tx.Exec(
			`INSERT INTO student_point_transactions (student_user_id, transaction_type, amount, note) VALUES ($1, 'redeem', $2, $3)`,
			student.UserID,
			totals.PointsPayable,
			fmt.Sprintf("Checkout order #%s paid with points", orderID),
		); err != nil {
			return nil, err
		}
	}

	if err := notifyDeliveryPartnersForOrderTx(
		tx,
		orderIDInt,
		routeMode,
		student.UserID,
		student.FullName,
	); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return r.getByID(orderID)
}

func (r *ordersRepo) loadOrderFoods(tx *sqlx.Tx, items []domain.CreateDeliveryOrderItem) (map[int]orderFoodRow, error) {
	ids := make([]int, 0, len(items))
	seen := make(map[int]struct{}, len(items))

	for _, item := range items {
		if item.FoodID <= 0 {
			return nil, fmt.Errorf("invalid food selected for checkout")
		}
		if _, exists := seen[item.FoodID]; exists {
			continue
		}
		seen[item.FoodID] = struct{}{}
		ids = append(ids, item.FoodID)
	}

	query, args, err := sqlx.In(
		`SELECT id,
		        food_name,
		        provider_name,
		        provider_type,
		        COALESCE(NULLIF(regexp_replace(price, '[^0-9]', '', 'g'), ''), '0')::integer AS price_value,
		        stock,
		        visible,
		        approval_status
		   FROM foods
		  WHERE id IN (?)
		  FOR UPDATE`,
		ids,
	)
	if err != nil {
		return nil, err
	}

	query = tx.Rebind(query)

	var rows []orderFoodRow
	if err := tx.Select(&rows, query, args...); err != nil {
		return nil, err
	}

	foodsByID := make(map[int]orderFoodRow, len(rows))
	for _, row := range rows {
		foodsByID[row.ID] = row
	}

	return foodsByID, nil
}

func buildOrderItems(items []domain.CreateDeliveryOrderItem, foodsByID map[int]orderFoodRow, routeMode string) ([]domain.DeliveryOrderItem, domain.DeliveryOrderTotals, error) {
	orderItems := make([]domain.DeliveryOrderItem, 0, len(items))
	totals := domain.DeliveryOrderTotals{}
	requestedStock := make(map[int]int, len(items))

	for _, item := range items {
		if item.Quantity <= 0 {
			return nil, domain.DeliveryOrderTotals{}, fmt.Errorf("order items must have a positive quantity")
		}

		if item.PaymentMode != "cash" && item.PaymentMode != "points" {
			return nil, domain.DeliveryOrderTotals{}, fmt.Errorf("invalid payment mode for one of the order items")
		}

		food, ok := foodsByID[item.FoodID]
		if !ok {
			return nil, domain.DeliveryOrderTotals{}, fmt.Errorf("one or more foods are no longer available")
		}

		if !food.Visible || food.ApprovalStatus != "approved" || food.Stock <= 0 {
			return nil, domain.DeliveryOrderTotals{}, fmt.Errorf("%s is no longer available", food.FoodName)
		}

		requestedStock[item.FoodID] += item.Quantity
		if requestedStock[item.FoodID] > food.Stock {
			return nil, domain.DeliveryOrderTotals{}, fmt.Errorf("only %d portion(s) of %s are available right now", food.Stock, food.FoodName)
		}

		subtotal := food.Price * item.Quantity
		serviceCharge := 0
		pointsRequired := 0
		payableCash := 0

		if item.PaymentMode == "cash" {
			serviceCharge = calculateServiceCharge(subtotal, routeMode, food.ProviderType)
			payableCash = subtotal + serviceCharge
			totals.CashSubtotal += subtotal
			totals.ServiceCharge += serviceCharge
			totals.CashPayable += payableCash
		} else {
			pointsRequired = food.Price * pointsExchangeRate * item.Quantity
			totals.PointsPayable += pointsRequired
		}

		totals.Items += item.Quantity
		orderItems = append(orderItems, domain.DeliveryOrderItem{
			FoodID:         item.FoodID,
			FoodName:       food.FoodName,
			ProviderName:   food.ProviderName,
			ProviderType:   food.ProviderType,
			Quantity:       item.Quantity,
			PaymentMode:    item.PaymentMode,
			Subtotal:       subtotal,
			ServiceCharge:  serviceCharge,
			PointsRequired: pointsRequired,
			PayableCash:    payableCash,
		})
	}

	return orderItems, totals, nil
}

func (r *ordersRepo) reserveFoodStock(tx *sqlx.Tx, items []domain.DeliveryOrderItem) error {
	stockByFoodID := make(map[int]int, len(items))
	for _, item := range items {
		stockByFoodID[item.FoodID] += item.Quantity
	}

	for foodID, quantity := range stockByFoodID {
		result, err := tx.Exec(
			`UPDATE foods
			    SET stock = stock - $1,
			        update_at = current_timestamp
			  WHERE id = $2
			    AND stock >= $1`,
			quantity,
			foodID,
		)
		if err != nil {
			return err
		}

		rowsAffected, err := result.RowsAffected()
		if err != nil {
			return err
		}
		if rowsAffected == 0 {
			return fmt.Errorf("one or more items no longer have enough stock")
		}
	}

	return nil
}

func calculateServiceCharge(subtotal int, routeMode, providerType string) int {
	rate := resolveCashServiceChargeRate(routeMode, providerType)
	return int(math.Round(float64(subtotal) * rate))
}

func calculateFreeDeliveryRewardPoints(items []domain.DeliveryOrderItem) int {
	totalFoodValue := 0
	for _, item := range items {
		if item.Subtotal <= 0 {
			continue
		}
		totalFoodValue += item.Subtotal
	}

	if totalFoodValue <= 0 {
		return 0
	}

	return int(math.Round(float64(totalFoodValue) * freeDeliveryCompletionRewardRate))
}

func resolveCashServiceChargeRate(routeMode, providerType string) float64 {
	isStudentKitchen := strings.EqualFold(strings.TrimSpace(providerType), studentKitchenProviderType)

	if isStudentKitchen {
		if routeMode == string(domain.DeliveryRouteModePaidOnly) {
			return studentKitchenPaidOnlyCashServiceChargeRate
		}

		return studentKitchenFreeFirstCashServiceChargeRate
	}

	if routeMode == string(domain.DeliveryRouteModePaidOnly) {
		return standardPaidOnlyCashServiceChargeRate
	}

	return standardFreeFirstCashServiceChargeRate
}

func (r *ordersRepo) AutoForwardExpiredFreeQueueOrders() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	return r.autoForwardExpiredFreeQueueOrders()
}

func (r *ordersRepo) autoForwardExpiredFreeQueueOrders() error {
	type movedOrderRow struct {
		ID            int    `db:"id"`
		StudentUserID string `db:"student_user_id"`
		StudentName   string `db:"student_name"`
	}

	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var movedOrders []movedOrderRow
	if err := tx.Select(
		&movedOrders,
		`UPDATE delivery_orders
		 SET route_mode = $1
		 WHERE status = $2
		   AND route_mode = $3
		   AND created_at <= current_timestamp - ($4::integer * interval '1 second')
		 RETURNING id, student_user_id, student_name`,
		deliveryRouteModePaidOnly,
		deliveryOrderStatusPending,
		deliveryRouteModeFreeFirst,
		int(freeDeliveryClaimWindow.Seconds()),
	); err != nil {
		return err
	}

	for _, movedOrder := range movedOrders {
		if _, err := tx.Exec(
			`INSERT INTO delivery_order_incidents (order_id, incident_type, message, actor_name, actor_role)
			 VALUES ($1, $2, $3, $4, $5)`,
			movedOrder.ID,
			incidentTypeForwardedToPaid,
			systemAutoForwardMessage,
			systemActorName,
			systemActorRole,
		); err != nil {
			return err
		}

		if err := notifyPaidDeliveryPartnersForForwardedOrderTx(
			tx,
			movedOrder.ID,
			movedOrder.StudentUserID,
			movedOrder.StudentName,
		); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *ordersRepo) List(viewer utils.Payload, scope string) ([]domain.DeliveryOrder, error) {
	if err := r.autoForwardExpiredFreeQueueOrders(); err != nil {
		return nil, err
	}

	var rows []orderRow
	query := `SELECT id::text as id, student_user_id, student_name, student_email, status, route_mode, delivery_recipient_name, delivery_phone, delivery_hall, delivery_address, delivery_landmark, delivery_note, total_items, cash_subtotal, service_charge, cash_payable, points_payable, assigned_to_user_id, assigned_to_name, assigned_plan, COALESCE(assigned_at::text, '') as assigned_at, COALESCE(delivered_at::text, '') as delivered_at, created_at::text as created_at FROM delivery_orders`
	var err error

	switch scope {
	case "mine":
		err = r.db.Select(
			&rows,
			query+` WHERE student_user_id = $1 ORDER BY created_at DESC, id DESC`,
			viewer.UserID,
		)
	case "queue":
		err = r.db.Select(
			&rows,
			query+` WHERE student_user_id <> $1 AND (status = 'pending' OR assigned_to_user_id = $1) ORDER BY created_at DESC, id DESC`,
			viewer.UserID,
		)
	case "all":
		err = r.db.Select(&rows, query+` ORDER BY created_at DESC, id DESC`)
	default:
		return nil, fmt.Errorf("invalid delivery order scope")
	}

	if err != nil {
		return nil, err
	}

	orders, err := r.loadOrders(rows)
	if err != nil {
		return nil, err
	}

	if scope == "queue" {
		applyQueuePreviewRedaction(orders, viewer.UserID)
	}

	return orders, nil
}

func applyQueuePreviewRedaction(orders []domain.DeliveryOrder, viewerUserID string) {
	normalizedViewerUserID := strings.TrimSpace(viewerUserID)

	for index := range orders {
		if strings.TrimSpace(orders[index].AssignedToUserID) == normalizedViewerUserID {
			continue
		}

		redactQueuePreviewOrder(&orders[index])
	}
}

func redactQueuePreviewOrder(order *domain.DeliveryOrder) {
	if order == nil {
		return
	}

	hallName := strings.TrimSpace(order.DeliveryDetails.HallName)

	order.StudentName = ""
	order.StudentEmail = ""
	order.DeliveryDetails = domain.DeliveryDetails{
		HallName: hallName,
	}
	order.Incidents = []domain.DeliveryOrderIncident{}
}

func (r *ordersRepo) HasDeliveryPlanAccess(userID, email, plan string) (bool, error) {
	if plan != "free" && plan != "permanent" {
		return false, fmt.Errorf("invalid delivery plan")
	}

	if plan == "free" {
		var freePartnerFromPoints bool
		err := r.db.Get(
			&freePartnerFromPoints,
			`SELECT is_free_delivery_partner FROM student_points WHERE student_user_id = $1`,
			userID,
		)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return false, err
		}
		if freePartnerFromPoints {
			return true, nil
		}
	}

	var approvedFromRegistration bool
	err := r.db.Get(
		&approvedFromRegistration,
		`SELECT EXISTS (
			SELECT 1
			FROM approval_requests
			WHERE request_type = 'delivery-registration'
			  AND LOWER(applicant_email) = LOWER($1)
			  AND status = 'approved'
			  AND payload->>'plan' = $2
		)`,
		email,
		plan,
	)
	if err != nil {
		return false, err
	}

	return approvedFromRegistration, nil
}

func (r *ordersRepo) Accept(orderID string, courier utils.Payload, plan string) (*domain.DeliveryOrder, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if err := r.autoForwardExpiredFreeQueueOrders(); err != nil {
		return nil, err
	}

	order, err := r.getByID(orderID)
	if err != nil {
		return nil, err
	}

	if order.Status != "pending" {
		return nil, fmt.Errorf("this order is already accepted by another delivery partner")
	}

	if order.StudentUserID == courier.UserID {
		return nil, fmt.Errorf("you cannot accept your own order for delivery")
	}

	if order.RouteMode == "free-first" && plan != "free" {
		return nil, fmt.Errorf("this order is not available for your delivery plan yet")
	}
	if order.RouteMode == "free-first" && isFreeQueueWindowExpired(order.CreatedAt) {
		return nil, fmt.Errorf("this order is no longer available under this delivery plan")
	}

	if order.RouteMode == "paid-only" && plan != "permanent" {
		return nil, fmt.Errorf("this order is available only in paid delivery service")
	}

	tx, err := r.db.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if plan == "free" {
		var activeOrderCount int
		if err := tx.Get(
			&activeOrderCount,
			`SELECT COUNT(1)
			 FROM delivery_orders
			 WHERE status = $1
			   AND assigned_to_user_id = $2
			   AND assigned_plan = $3`,
			deliveryOrderStatusAccepted,
			courier.UserID,
			"free",
		); err != nil {
			return nil, err
		}

		if activeOrderCount >= freeDeliveryPartnerMaxActiveOrders {
			return nil, fmt.Errorf(
				"free delivery partners can keep up to %d active orders at a time",
				freeDeliveryPartnerMaxActiveOrders,
			)
		}
	}

	if _, err := tx.Exec(`UPDATE delivery_orders SET status = 'accepted', assigned_to_user_id = $1, assigned_to_name = $2, assigned_plan = $3, assigned_at = current_timestamp WHERE id::text = $4`, courier.UserID, courier.FullName, plan, orderID); err != nil {
		return nil, err
	}

	actorRole := "paid-partner"
	message := fmt.Sprintf("Order accepted by paid delivery partner %s.", courier.FullName)
	if plan == "free" {
		actorRole = "free-partner"
		message = fmt.Sprintf("Order accepted by free delivery partner %s.", courier.FullName)
	}

	if _, err := tx.Exec(`INSERT INTO delivery_order_incidents (order_id, incident_type, message, actor_name, actor_role) VALUES ($1::integer, 'accepted', $2, $3, $4)`, orderID, message, courier.FullName, actorRole); err != nil {
		return nil, err
	}

	if err := notifyOrderAcceptedToCustomerTx(
		tx,
		order.ID,
		order.StudentUserID,
		courier.FullName,
		plan,
	); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return r.getByID(orderID)
}

func (r *ordersRepo) Complete(orderID string, courier utils.Payload) (*domain.DeliveryOrder, int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	order, err := r.getByID(orderID)
	if err != nil {
		return nil, 0, err
	}

	if order.Status != "accepted" || order.AssignedToUserID != courier.UserID {
		return nil, 0, fmt.Errorf("you can only complete your own accepted order")
	}

	if order.StudentUserID == courier.UserID {
		return nil, 0, fmt.Errorf("you cannot deliver your own order")
	}

	tx, err := r.db.Beginx()
	if err != nil {
		return nil, 0, err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`UPDATE delivery_orders SET status = 'delivered', delivered_at = current_timestamp WHERE id::text = $1`, orderID); err != nil {
		return nil, 0, err
	}

	actorRole := "paid-partner"
	if order.AssignedPlan == "free" {
		actorRole = "free-partner"
	}

	if _, err := tx.Exec(`INSERT INTO delivery_order_incidents (order_id, incident_type, message, actor_name, actor_role) VALUES ($1::integer, 'delivered', $2, $3, $4)`, orderID, fmt.Sprintf("Order delivered by %s. Customer notified that delivery is complete.", courier.FullName), courier.FullName, actorRole); err != nil {
		return nil, 0, err
	}

	rewardPoints := 0
	if order.AssignedPlan == "free" {
		if _, err := tx.Exec(
			`INSERT INTO student_points (student_user_id, points, total_earned, total_transferred, is_free_delivery_partner, updated_at)
			 VALUES ($1, 0, 0, 0, false, current_timestamp)
			 ON CONFLICT (student_user_id) DO NOTHING`,
			courier.UserID,
		); err != nil {
			return nil, 0, err
		}

		if err := reconcileStudentPointStateTx(tx, courier.UserID); err != nil {
			return nil, 0, err
		}

		rewardPoints = calculateFreeDeliveryRewardPoints(order.Items)
		if rewardPoints > 0 {
			note := fmt.Sprintf("Delivery reward for completing order #%s.", order.ID)
			if err := awardStudentBonusTx(tx, courier.UserID, rewardPoints, note, time.Now().UTC()); err != nil {
				return nil, 0, err
			}

			if err := notifyPointsAddedTx(tx, courier.UserID, rewardPoints, note, order.ID); err != nil {
				return nil, 0, err
			}
		}
	}

	if err := notifyOrderDeliveredToCustomerTx(tx, order.ID, order.StudentUserID, courier.FullName); err != nil {
		return nil, 0, err
	}

	if err := tx.Commit(); err != nil {
		return nil, 0, err
	}

	// Safety net: ensure customer sees delivered notification even if an earlier
	// notification write path was skipped in older data or transiently failed.
	r.ensureOrderDeliveredNotification(order.ID, order.StudentUserID, courier.FullName)

	updatedOrder, err := r.getByID(orderID)
	if err != nil {
		return nil, 0, err
	}

	return updatedOrder, rewardPoints, nil
}

func (r *ordersRepo) ensureOrderDeliveredNotification(orderID, customerUserID, courierName string) {
	normalizedCustomerUserID := strings.TrimSpace(customerUserID)
	if normalizedCustomerUserID == "" {
		return
	}

	orderIDInt, err := strconv.Atoi(strings.TrimSpace(orderID))
	if err != nil || orderIDInt <= 0 {
		return
	}

	message := fmt.Sprintf(
		"Order #%s has been delivered by %s.",
		orderID,
		resolveNotificationName(courierName),
	)

	_, _ = r.db.Exec(
		`INSERT INTO user_notifications (user_id, category, title, message, related_order_id)
		 SELECT $1, $2, $3, $4, $5
		 WHERE NOT EXISTS (
			 SELECT 1
			 FROM user_notifications
			 WHERE user_id = $1
			   AND category = $2
			   AND title = $3
			   AND related_order_id = $5
		 )`,
		normalizedCustomerUserID,
		notificationCategoryOrders,
		"Order delivered",
		message,
		orderIDInt,
	)
}

func (r *ordersRepo) SendChatMessage(orderID string, sender utils.Payload, message string) (*domain.DeliveryOrder, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	order, err := r.getByID(orderID)
	if err != nil {
		return nil, err
	}

	if order.AssignedToUserID == "" {
		return nil, fmt.Errorf("delivery partner has not accepted this order yet")
	}

	if order.Status != "accepted" {
		return nil, fmt.Errorf("chat is only available while delivery is in progress")
	}

	isOrderStudent := sender.UserID == order.StudentUserID
	isAssignedCourier := sender.UserID == order.AssignedToUserID
	if !isOrderStudent && !isAssignedCourier {
		return nil, fmt.Errorf("you can only chat on your own delivery orders")
	}

	actorRole := resolveOrderChatActorRole(*order, sender)
	actorName := strings.TrimSpace(sender.FullName)
	if actorName == "" {
		if actorRole == "student" {
			actorName = order.StudentName
		} else {
			actorName = order.AssignedToName
		}
	}
	if actorName == "" {
		actorName = "CampFood user"
	}

	tx, err := r.db.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(
		`INSERT INTO delivery_order_incidents (order_id, incident_type, message, actor_name, actor_role) VALUES ($1::integer, 'chat', $2, $3, $4)`,
		orderID,
		message,
		actorName,
		actorRole,
	); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return r.getByID(orderID)
}

func (r *ordersRepo) ForwardToPaid(orderID, adminName string) (*domain.DeliveryOrder, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	order, err := r.getByID(orderID)
	if err != nil {
		return nil, err
	}

	if order.Status != "pending" {
		return nil, fmt.Errorf("only pending orders can be forwarded to paid delivery")
	}

	if order.RouteMode == "paid-only" {
		return nil, fmt.Errorf("order is already in paid delivery service")
	}
	if order.RouteMode == "free-first" && !isFreeQueueWindowExpired(order.CreatedAt) {
		return nil, fmt.Errorf("this order is still in free delivery service")
	}

	tx, err := r.db.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`UPDATE delivery_orders SET route_mode = 'paid-only' WHERE id::text = $1`, orderID); err != nil {
		return nil, err
	}

	if _, err := tx.Exec(`INSERT INTO delivery_order_incidents (order_id, incident_type, message, actor_name, actor_role) VALUES ($1::integer, 'forwarded-to-paid', $2, $3, 'admin')`, orderID, fmt.Sprintf("Order moved to paid delivery service by %s.", adminName), adminName); err != nil {
		return nil, err
	}

	orderIDInt, err := strconv.Atoi(order.ID)
	if err != nil {
		return nil, fmt.Errorf("invalid order id")
	}

	if err := notifyPaidDeliveryPartnersForForwardedOrderTx(
		tx,
		orderIDInt,
		order.StudentUserID,
		order.StudentName,
	); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return r.getByID(orderID)
}

func (r *ordersRepo) Cancel(orderID, adminName, reason string) (*domain.DeliveryOrder, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	order, err := r.getByID(orderID)
	if err != nil {
		return nil, err
	}

	if order.Status == deliveryOrderStatusDelivered {
		return nil, fmt.Errorf("delivered orders cannot be canceled")
	}

	if order.Status == deliveryOrderStatusCanceled {
		return nil, fmt.Errorf("order is already canceled")
	}

	tx, err := r.db.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(
		`UPDATE delivery_orders
		 SET status = $1,
		     assigned_to_user_id = '',
		     assigned_to_name = '',
		     assigned_plan = '',
		     assigned_at = NULL
		 WHERE id::text = $2`,
		deliveryOrderStatusCanceled,
		orderID,
	); err != nil {
		return nil, err
	}

	if err := restoreOrderStockTx(tx, order.Items); err != nil {
		return nil, err
	}

	if order.Totals.PointsPayable > 0 {
		if err := ensureStudentPointStateTx(tx, order.StudentUserID); err != nil {
			return nil, err
		}

		if err := refundStudentPointsTx(
			tx,
			order.StudentUserID,
			order.Totals.PointsPayable,
			fmt.Sprintf("Order #%s canceled by admin. Points refunded.", order.ID),
		); err != nil {
			return nil, err
		}
	}

	if _, err := tx.Exec(
		`INSERT INTO delivery_order_incidents (order_id, incident_type, message, actor_name, actor_role)
		 VALUES ($1::integer, $2, $3, $4, 'admin')`,
		orderID,
		incidentTypeCanceled,
		fmt.Sprintf("Order canceled by admin %s. Reason: %s", adminName, reason),
		adminName,
	); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return r.getByID(orderID)
}

func restoreOrderStockTx(tx *sqlx.Tx, items []domain.DeliveryOrderItem) error {
	stockByFoodID := make(map[int]int, len(items))
	for _, item := range items {
		if item.Quantity <= 0 {
			continue
		}
		stockByFoodID[item.FoodID] += item.Quantity
	}

	for foodID, quantity := range stockByFoodID {
		if _, err := tx.Exec(
			`UPDATE foods
			    SET stock = stock + $1,
			        update_at = current_timestamp
			  WHERE id = $2`,
			quantity,
			foodID,
		); err != nil {
			return err
		}
	}

	return nil
}

func resolveOrderChatActorRole(order domain.DeliveryOrder, sender utils.Payload) string {
	if sender.UserID == order.StudentUserID {
		return "student"
	}

	if order.AssignedPlan == "free" {
		return "free-partner"
	}

	return "paid-partner"
}

func isFreeQueueWindowExpired(createdAt time.Time) bool {
	if createdAt.IsZero() {
		return false
	}

	return time.Now().UTC().After(createdAt.UTC().Add(freeDeliveryClaimWindow))
}

func (r *ordersRepo) getByID(orderID string) (*domain.DeliveryOrder, error) {
	if err := r.autoForwardExpiredFreeQueueOrders(); err != nil {
		return nil, err
	}

	var rows []orderRow
	err := r.db.Select(&rows, `SELECT id::text as id, student_user_id, student_name, student_email, status, route_mode, delivery_recipient_name, delivery_phone, delivery_hall, delivery_address, delivery_landmark, delivery_note, total_items, cash_subtotal, service_charge, cash_payable, points_payable, assigned_to_user_id, assigned_to_name, assigned_plan, COALESCE(assigned_at::text, '') as assigned_at, COALESCE(delivered_at::text, '') as delivered_at, created_at::text as created_at FROM delivery_orders WHERE id::text = $1`, orderID)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, sql.ErrNoRows
	}

	orders, err := r.loadOrders(rows)
	if err != nil {
		return nil, err
	}

	return &orders[0], nil
}

func (r *ordersRepo) loadOrders(rows []orderRow) ([]domain.DeliveryOrder, error) {
	if len(rows) == 0 {
		return []domain.DeliveryOrder{}, nil
	}

	ids := make([]interface{}, 0, len(rows))
	orderMap := make(map[string]*domain.DeliveryOrder, len(rows))
	orders := make([]domain.DeliveryOrder, 0, len(rows))

	for _, row := range rows {
		order := domain.DeliveryOrder{
			ID:            row.ID,
			StudentUserID: row.StudentUserID,
			StudentName:   row.StudentName,
			StudentEmail:  row.StudentEmail,
			CreatedAt:     parseTimeOrNow(row.CreatedAt),
			Status:        row.Status,
			RouteMode:     row.RouteMode,
			DeliveryDetails: domain.DeliveryDetails{
				RecipientName: row.DeliveryRecipientName,
				Phone:         row.DeliveryPhone,
				HallName:      row.DeliveryHall,
				AddressLine:   row.DeliveryAddress,
				Landmark:      row.DeliveryLandmark,
				Note:          row.DeliveryNote,
			},
			Totals: domain.DeliveryOrderTotals{
				Items:         row.TotalItems,
				CashSubtotal:  row.CashSubtotal,
				ServiceCharge: row.ServiceCharge,
				CashPayable:   row.CashPayable,
				PointsPayable: row.PointsPayable,
			},
			AssignedToUserID: row.AssignedToUserID,
			AssignedToName:   row.AssignedToName,
			AssignedPlan:     row.AssignedPlan,
			Items:            []domain.DeliveryOrderItem{},
			Incidents:        []domain.DeliveryOrderIncident{},
		}

		if row.AssignedAt != "" {
			assignedAt := parseTimeOrNow(row.AssignedAt)
			order.AssignedAt = &assignedAt
		}

		if row.DeliveredAt != "" {
			deliveredAt := parseTimeOrNow(row.DeliveredAt)
			order.DeliveredAt = &deliveredAt
		}

		orders = append(orders, order)
		orderMap[row.ID] = &orders[len(orders)-1]
		ids = append(ids, row.ID)
	}

	itemQuery, itemArgs, err := sqlx.In(`SELECT id::text as id, order_id::text as order_id, food_id, food_name, provider_name, provider_type, quantity, payment_mode, subtotal, service_charge, points_required, payable_cash FROM delivery_order_items WHERE order_id IN (?) ORDER BY id ASC`, ids)
	if err != nil {
		return nil, err
	}
	itemQuery = r.db.Rebind(itemQuery)

	var itemRows []orderItemRow
	if err := r.db.Select(&itemRows, itemQuery, itemArgs...); err != nil {
		return nil, err
	}

	for _, row := range itemRows {
		if order := orderMap[row.OrderID]; order != nil {
			order.Items = append(order.Items, domain.DeliveryOrderItem{
				ID:             row.ID,
				FoodID:         row.FoodID,
				FoodName:       row.FoodName,
				ProviderName:   row.ProviderName,
				ProviderType:   row.ProviderType,
				Quantity:       row.Quantity,
				PaymentMode:    row.PaymentMode,
				Subtotal:       row.Subtotal,
				ServiceCharge:  row.ServiceCharge,
				PointsRequired: row.PointsRequired,
				PayableCash:    row.PayableCash,
			})
		}
	}

	incidentQuery, incidentArgs, err := sqlx.In(`SELECT id::text as id, order_id::text as order_id, incident_type, message, actor_name, actor_role, created_at::text as created_at FROM delivery_order_incidents WHERE order_id IN (?) ORDER BY created_at ASC, id ASC`, ids)
	if err != nil {
		return nil, err
	}
	incidentQuery = r.db.Rebind(incidentQuery)

	var incidentRows []incidentRow
	if err := r.db.Select(&incidentRows, incidentQuery, incidentArgs...); err != nil {
		return nil, err
	}

	for _, row := range incidentRows {
		if order := orderMap[row.OrderID]; order != nil {
			order.Incidents = append(order.Incidents, domain.DeliveryOrderIncident{
				ID:        row.ID,
				Type:      row.Type,
				Message:   row.Message,
				ActorName: row.ActorName,
				ActorRole: row.ActorRole,
				CreatedAt: parseTimeOrNow(row.CreatedAt),
			})
		}
	}

	return orders, nil
}
