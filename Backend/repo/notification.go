package repo

import (
	"backend/domain"
	"backend/notifications"
	"database/sql"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/jmoiron/sqlx"
)

const (
	notificationCategoryOrders    = "orders"
	notificationCategoryPoints    = "points"
	notificationCategoryRewards   = "rewards"
	notificationCategoryApprovals = "approvals"

	notificationRecipientRoleStudent        = "student"
	notificationRecipientRoleAdmin          = "admin"
	notificationRecipientRoleStudentKitchen = "student_kitchen"
	notificationRecipientRoleHallKitchen    = "hall_kitchen"
	notificationRecipientRoleCampKitchen    = "camp_kitchen"
)

type notificationRepo struct {
	db *sqlx.DB
}

type notificationRow struct {
	ID             string `db:"id"`
	UserID         string `db:"user_id"`
	RecipientRole  string `db:"recipient_role"`
	Category       string `db:"category"`
	Title          string `db:"title"`
	Message        string `db:"message"`
	RelatedOrderID string `db:"related_order_id"`
	IsRead         bool   `db:"is_read"`
	CreatedAt      string `db:"created_at"`
}

func NewNotificationRepo(db *sqlx.DB) notifications.NotificationRepository {
	return &notificationRepo{db: db}
}

func (r *notificationRepo) List(userID, userType string, limit int) (*domain.UserNotificationFeed, error) {
	recipientRole := normalizeNotificationRecipientRole(userType)

	var unreadCount int
	if err := r.db.Get(
		&unreadCount,
		`SELECT COUNT(*)
		 FROM user_notifications
		 WHERE user_id = $1
		   AND recipient_role = $2
		   AND is_read = false`,
		userID,
		recipientRole,
	); err != nil {
		return nil, err
	}

	var rows []notificationRow
	if err := r.db.Select(
		&rows,
		`SELECT
			id::text as id,
			user_id,
			recipient_role,
			category,
			title,
			message,
			COALESCE(related_order_id::text, '') as related_order_id,
			is_read,
			created_at::text as created_at
		 FROM user_notifications
		 WHERE user_id = $1
		   AND recipient_role = $2
		 ORDER BY created_at DESC, id DESC
		 LIMIT $3`,
		userID,
		recipientRole,
		limit,
	); err != nil {
		return nil, err
	}

	items := make([]domain.UserNotification, 0, len(rows))
	for _, row := range rows {
		items = append(items, domain.UserNotification{
			ID:             row.ID,
			RecipientRole:  row.RecipientRole,
			Category:       row.Category,
			Title:          row.Title,
			Message:        row.Message,
			RelatedOrderID: row.RelatedOrderID,
			IsRead:         row.IsRead,
			CreatedAt:      parseTimeOrNow(row.CreatedAt),
		})
	}

	return &domain.UserNotificationFeed{
		UnreadCount:   unreadCount,
		Notifications: items,
	}, nil
}

func (r *notificationRepo) MarkAllRead(userID, userType string) error {
	_, err := r.db.Exec(
		`UPDATE user_notifications
		 SET is_read = true
		 WHERE user_id = $1
		   AND recipient_role = $2
		   AND is_read = false`,
		userID,
		normalizeNotificationRecipientRole(userType),
	)
	return err
}

func (r *notificationRepo) MarkRead(userID, userType, notificationID string) error {
	_, err := r.db.Exec(
		`UPDATE user_notifications
		 SET is_read = true
		 WHERE user_id = $1
		   AND recipient_role = $2
		   AND id::text = $3
		   AND is_read = false`,
		userID,
		normalizeNotificationRecipientRole(userType),
		notificationID,
	)
	return err
}

func createUserNotification(
	db *sqlx.DB,
	userID string,
	recipientRole string,
	category string,
	title string,
	message string,
	relatedOrderID string,
) error {
	return insertUserNotification(
		db.Exec,
		userID,
		recipientRole,
		category,
		title,
		message,
		relatedOrderID,
	)
}

func createUserNotificationTx(
	tx *sqlx.Tx,
	userID string,
	recipientRole string,
	category string,
	title string,
	message string,
	relatedOrderID string,
) error {
	return insertUserNotification(
		tx.Exec,
		userID,
		recipientRole,
		category,
		title,
		message,
		relatedOrderID,
	)
}

func insertUserNotification(
	exec func(query string, args ...interface{}) (sql.Result, error),
	userID string,
	recipientRole string,
	category string,
	title string,
	message string,
	relatedOrderID string,
) error {
	normalizedUserID := strings.TrimSpace(userID)
	if normalizedUserID == "" {
		return nil
	}

	normalizedRecipientRole := normalizeNotificationRecipientRole(recipientRole)

	normalizedCategory := strings.TrimSpace(category)
	if normalizedCategory == "" {
		normalizedCategory = notificationCategoryOrders
	}

	normalizedTitle := strings.TrimSpace(title)
	if normalizedTitle == "" {
		normalizedTitle = "CampFood update"
	}

	normalizedMessage := strings.TrimSpace(message)
	if normalizedMessage == "" {
		return nil
	}

	normalizedOrderID := strings.TrimSpace(relatedOrderID)

	_, err := exec(
		`INSERT INTO user_notifications (user_id, recipient_role, category, title, message, related_order_id)
		 VALUES ($1, $2, $3, $4, $5, NULLIF($6, '')::integer)`,
		normalizedUserID,
		normalizedRecipientRole,
		normalizedCategory,
		normalizedTitle,
		normalizedMessage,
		normalizedOrderID,
	)
	return err
}

func notifyAdminKitchenRegistrationRequested(
	db *sqlx.DB,
	kitchenType string,
	kitchenName string,
	kitchenUserID string,
) error {
	title := "New kitchen registration request"
	message := fmt.Sprintf(
		"%s submitted a %s registration request (Kitchen ID: %s).",
		resolveNotificationName(kitchenName),
		formatKitchenTypeLabel(kitchenType),
		strings.TrimSpace(kitchenUserID),
	)

	return createUserNotification(
		db,
		"admin",
		notificationRecipientRoleAdmin,
		notificationCategoryApprovals,
		title,
		message,
		"",
	)
}

func notifyKitchenRegistrationSubmitted(
	db *sqlx.DB,
	kitchenType string,
	kitchenUserID string,
) error {
	role := normalizeNotificationRecipientRole(kitchenType)

	return createUserNotification(
		db,
		kitchenUserID,
		role,
		notificationCategoryApprovals,
		"Kitchen registration submitted",
		"Your kitchen registration request was submitted successfully and is now pending admin review.",
		"",
	)
}

func notifyKitchenRegistrationDecision(
	db *sqlx.DB,
	kitchenType string,
	kitchenUserID string,
	status string,
) error {
	normalizedStatus := strings.ToLower(strings.TrimSpace(status))
	if normalizedStatus != "approved" && normalizedStatus != "rejected" {
		return nil
	}

	role := normalizeNotificationRecipientRole(kitchenType)
	title := "Kitchen registration update"
	message := "Your kitchen registration was updated by admin."

	if normalizedStatus == "approved" {
		title = "Kitchen registration approved"
		message = "Your kitchen registration has been approved by admin. You can now access kitchen features."
	} else if normalizedStatus == "rejected" {
		title = "Kitchen registration rejected"
		message = "Your kitchen registration was rejected by admin. Please review your details and contact admin if needed."
	}

	return createUserNotification(
		db,
		kitchenUserID,
		role,
		notificationCategoryApprovals,
		title,
		message,
		"",
	)
}

func notifyAdminApprovalRequestCreatedTx(
	tx *sqlx.Tx,
	requestType string,
	applicantName string,
	payload map[string]string,
) error {
	normalizedType := strings.ToLower(strings.TrimSpace(requestType))
	title := "New approval request"
	message := fmt.Sprintf(
		"%s submitted an approval request.",
		resolveNotificationName(applicantName),
	)

	switch normalizedType {
	case "delivery-registration":
		plan := formatDeliveryPlanLabel(payload["plan"])
		title = "New delivery registration request"
		message = fmt.Sprintf(
			"%s requested %s delivery registration approval.",
			resolveNotificationName(applicantName),
			plan,
		)
	case "food-listing":
		foodName := strings.TrimSpace(payload["foodName"])
		providerName := strings.TrimSpace(payload["providerName"])
		if foodName == "" {
			foodName = "a food item"
		}
		if providerName == "" {
			providerName = resolveNotificationName(applicantName)
		}
		title = "New food approval request"
		message = fmt.Sprintf(
			"%s submitted \"%s\" for admin approval.",
			providerName,
			foodName,
		)
	}

	return createUserNotificationTx(
		tx,
		"admin",
		notificationRecipientRoleAdmin,
		notificationCategoryApprovals,
		title,
		message,
		"",
	)
}

func notifyApprovalRequestSubmittedToApplicantTx(
	tx *sqlx.Tx,
	requestType string,
	applicantEmail string,
	payload map[string]string,
) error {
	recipientUserID, recipientRole, found, err := resolveApprovalRecipientTx(
		tx,
		requestType,
		applicantEmail,
		payload,
	)
	if err != nil {
		return err
	}
	if !found {
		return nil
	}

	normalizedType := strings.ToLower(strings.TrimSpace(requestType))
	title := "Approval request submitted"
	message := "Your request was submitted and is waiting for admin review."

	switch normalizedType {
	case "delivery-registration":
		plan := formatDeliveryPlanLabel(payload["plan"])
		title = "Delivery registration submitted"
		message = fmt.Sprintf(
			"Your %s delivery registration request has been submitted and is now pending admin review.",
			strings.ToLower(plan),
		)
	case "food-listing":
		foodName := strings.TrimSpace(payload["foodName"])
		if foodName == "" {
			foodName = "your food item"
		}
		title = "Food listing submitted for review"
		message = fmt.Sprintf(
			"\"%s\" has been submitted and is waiting for admin approval.",
			foodName,
		)
	}

	return createUserNotificationTx(
		tx,
		recipientUserID,
		recipientRole,
		notificationCategoryApprovals,
		title,
		message,
		"",
	)
}

func notifyApprovalRequestReviewedToApplicantTx(tx *sqlx.Tx, request domain.ApprovalRequest) error {
	recipientUserID, recipientRole, found, err := resolveApprovalRecipientTx(
		tx,
		request.Type,
		request.ApplicantEmail,
		request.Payload,
	)
	if err != nil {
		return err
	}
	if !found {
		return nil
	}

	normalizedType := strings.ToLower(strings.TrimSpace(request.Type))
	normalizedStatus := strings.ToLower(strings.TrimSpace(request.Status))

	title := "Approval request reviewed"
	message := fmt.Sprintf("Your request was %s by admin.", normalizedStatus)

	switch normalizedType {
	case "delivery-registration":
		plan := formatDeliveryPlanLabel(request.Payload["plan"])
		if normalizedStatus == "approved" {
			title = "Delivery registration approved"
			message = fmt.Sprintf("Your %s delivery registration request was approved by admin.", strings.ToLower(plan))
		} else if normalizedStatus == "rejected" {
			title = "Delivery registration rejected"
			message = fmt.Sprintf("Your %s delivery registration request was rejected by admin.", strings.ToLower(plan))
		}
	case "food-listing":
		foodName := strings.TrimSpace(request.Payload["foodName"])
		if foodName == "" {
			foodName = "your food item"
		}
		if normalizedStatus == "approved" {
			title = "Food listing approved"
			message = fmt.Sprintf("Your food listing \"%s\" was approved by admin.", foodName)
		} else if normalizedStatus == "rejected" {
			title = "Food listing rejected"
			message = fmt.Sprintf("Your food listing \"%s\" was rejected by admin.", foodName)
		}
	}

	if note := strings.TrimSpace(request.ReviewNote); note != "" {
		message = fmt.Sprintf("%s Note: %s", message, note)
	}

	return createUserNotificationTx(
		tx,
		recipientUserID,
		recipientRole,
		notificationCategoryApprovals,
		title,
		message,
		"",
	)
}

func resolveApprovalRecipientTx(
	tx *sqlx.Tx,
	requestType string,
	applicantEmail string,
	payload map[string]string,
) (string, string, bool, error) {
	switch strings.ToLower(strings.TrimSpace(requestType)) {
	case "delivery-registration":
		userID, found, err := loadStudentUserIDByEmailTx(tx, applicantEmail)
		if err != nil {
			return "", "", false, err
		}
		if !found {
			return "", "", false, nil
		}
		return userID, notificationRecipientRoleStudent, true, nil
	case "food-listing":
		if kitchenUserID := strings.TrimSpace(payload["kitchenUserId"]); kitchenUserID != "" {
			if role := normalizeKitchenNotificationRole(payload["kitchenRole"]); role != "" {
				return kitchenUserID, role, true, nil
			}
		}
		return resolveKitchenRecipientByEmailTx(tx, applicantEmail)
	default:
		return "", "", false, nil
	}
}

func loadStudentUserIDByEmailTx(tx *sqlx.Tx, email string) (string, bool, error) {
	normalizedEmail := strings.TrimSpace(email)
	if normalizedEmail == "" {
		return "", false, nil
	}

	var userID string
	if err := tx.Get(
		&userID,
		`SELECT user_id::text FROM student WHERE LOWER(email) = LOWER($1) LIMIT 1`,
		normalizedEmail,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", false, nil
		}
		return "", false, err
	}

	return strings.TrimSpace(userID), true, nil
}

func resolveKitchenRecipientByEmailTx(tx *sqlx.Tx, email string) (string, string, bool, error) {
	normalizedEmail := strings.TrimSpace(email)
	if normalizedEmail == "" {
		return "", "", false, nil
	}

	type lookup struct {
		query string
		role  string
	}

	lookups := []lookup{
		{
			query: `SELECT user_id::text FROM student_kitchen WHERE LOWER(email) = LOWER($1) LIMIT 1`,
			role:  notificationRecipientRoleStudentKitchen,
		},
		{
			query: `SELECT user_id::text FROM hall_kitchen WHERE LOWER(email) = LOWER($1) LIMIT 1`,
			role:  notificationRecipientRoleHallKitchen,
		},
		{
			query: `SELECT user_id::text FROM camp_kitchen WHERE LOWER(email) = LOWER($1) LIMIT 1`,
			role:  notificationRecipientRoleCampKitchen,
		},
	}

	for _, item := range lookups {
		var userID string
		err := tx.Get(&userID, item.query, normalizedEmail)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				continue
			}
			return "", "", false, err
		}

		return strings.TrimSpace(userID), item.role, true, nil
	}

	return "", "", false, nil
}

func notifyDeliveryPartnersForOrderTx(
	tx *sqlx.Tx,
	orderID int,
	routeMode string,
	customerUserID string,
	customerName string,
) error {
	normalizedRouteMode := strings.TrimSpace(routeMode)
	plan := "free"
	title := "New delivery request"
	serviceLabel := "Free Delivery Service"
	if normalizedRouteMode == deliveryRouteModePaidOnly {
		plan = "permanent"
		serviceLabel = "Paid Delivery Service"
	}

	partnerIDs, err := loadEligibleDeliveryPartnerUserIDsTx(tx, plan, customerUserID)
	if err != nil {
		return err
	}

	orderIDText := strconv.Itoa(orderID)
	for _, partnerID := range partnerIDs {
		if err := createUserNotificationTx(
			tx,
			partnerID,
			notificationRecipientRoleStudent,
			notificationCategoryOrders,
			title,
			fmt.Sprintf(
				"Order #%s from %s is now available in %s.",
				orderIDText,
				resolveNotificationName(customerName),
				serviceLabel,
			),
			orderIDText,
		); err != nil {
			return err
		}
	}

	return nil
}

func notifyPaidDeliveryPartnersForForwardedOrderTx(
	tx *sqlx.Tx,
	orderID int,
	customerUserID string,
	customerName string,
) error {
	partnerIDs, err := loadEligibleDeliveryPartnerUserIDsTx(tx, "permanent", customerUserID)
	if err != nil {
		return err
	}

	orderIDText := strconv.Itoa(orderID)
	for _, partnerID := range partnerIDs {
		if err := createUserNotificationTx(
			tx,
			partnerID,
			notificationRecipientRoleStudent,
			notificationCategoryOrders,
			"Order moved to paid delivery service",
			fmt.Sprintf(
				"Order #%s from %s is now available in Paid Delivery Service.",
				orderIDText,
				resolveNotificationName(customerName),
			),
			orderIDText,
		); err != nil {
			return err
		}
	}

	return nil
}

func notifyOrderDeliveredToCustomerTx(
	tx *sqlx.Tx,
	orderID string,
	customerUserID string,
	courierName string,
) error {
	return createUserNotificationTx(
		tx,
		customerUserID,
		notificationRecipientRoleStudent,
		notificationCategoryOrders,
		"Order delivered",
		fmt.Sprintf(
			"Order #%s has been delivered by %s.",
			orderID,
			resolveNotificationName(courierName),
		),
		orderID,
	)
}

func notifyOrderAcceptedToCustomerTx(
	tx *sqlx.Tx,
	orderID string,
	customerUserID string,
	courierName string,
	courierPlan string,
) error {
	planLabel := "delivery partner"
	switch strings.ToLower(strings.TrimSpace(courierPlan)) {
	case "free":
		planLabel = "free delivery partner"
	case "permanent":
		planLabel = "paid delivery partner"
	}

	return createUserNotificationTx(
		tx,
		customerUserID,
		notificationRecipientRoleStudent,
		notificationCategoryOrders,
		"Order accepted",
		fmt.Sprintf(
			"Order #%s was accepted by %s (%s).",
			orderID,
			resolveNotificationName(courierName),
			planLabel,
		),
		orderID,
	)
}

func notifyPointsAddedTx(
	tx *sqlx.Tx,
	userID string,
	points int,
	note string,
	relatedOrderID string,
) error {
	if points <= 0 {
		return nil
	}

	description := fmt.Sprintf("+%d points added to your account.", points)
	if trimmedNote := strings.TrimSpace(note); trimmedNote != "" {
		description = fmt.Sprintf("%s %s", description, trimmedNote)
	}

	return createUserNotificationTx(
		tx,
		userID,
		notificationRecipientRoleStudent,
		notificationCategoryPoints,
		"Points added",
		description,
		relatedOrderID,
	)
}

func notifyMonthlyRewardTx(tx *sqlx.Tx, userID string, points int, note string) error {
	if points <= 0 {
		return nil
	}

	trimmedNote := strings.TrimSpace(note)
	if trimmedNote == "" {
		trimmedNote = "Monthly reward points added to your account."
	}

	return createUserNotificationTx(
		tx,
		userID,
		notificationRecipientRoleStudent,
		notificationCategoryRewards,
		"Monthly reward added",
		fmt.Sprintf("+%d points added. %s", points, trimmedNote),
		"",
	)
}

func loadEligibleDeliveryPartnerUserIDsTx(
	tx *sqlx.Tx,
	plan string,
	excludedUserID string,
) ([]string, error) {
	normalizedPlan := strings.ToLower(strings.TrimSpace(plan))
	normalizedExcludedUserID := strings.TrimSpace(excludedUserID)

	var ids []string
	switch normalizedPlan {
	case "free":
		if err := tx.Select(
			&ids,
			`SELECT DISTINCT partner.user_id
			 FROM (
				SELECT student_user_id::text as user_id
				FROM student_points
				WHERE is_free_delivery_partner = true
				UNION
				SELECT s.user_id::text as user_id
				FROM approval_requests ar
				JOIN student s
				  ON LOWER(s.email) = LOWER(ar.applicant_email)
				WHERE ar.request_type = 'delivery-registration'
				  AND ar.status = 'approved'
				  AND ar.payload->>'plan' = 'free'
			 ) partner
			 WHERE partner.user_id <> $1`,
			normalizedExcludedUserID,
		); err != nil {
			return nil, err
		}
	case "permanent":
		if err := tx.Select(
			&ids,
			`SELECT DISTINCT s.user_id::text
			 FROM approval_requests ar
			 JOIN student s
			   ON LOWER(s.email) = LOWER(ar.applicant_email)
			 WHERE ar.request_type = 'delivery-registration'
			   AND ar.status = 'approved'
			   AND ar.payload->>'plan' = 'permanent'
			   AND s.user_id::text <> $1`,
			normalizedExcludedUserID,
		); err != nil {
			return nil, err
		}
	default:
		return []string{}, nil
	}

	return ids, nil
}

func resolveNotificationName(name string) string {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return "a student"
	}

	return trimmed
}

func normalizeNotificationRecipientRole(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "student":
		return notificationRecipientRoleStudent
	case "admin":
		return notificationRecipientRoleAdmin
	case "student_kitchen", "student-kitchen":
		return notificationRecipientRoleStudentKitchen
	case "hall_kitchen", "hall-kitchen":
		return notificationRecipientRoleHallKitchen
	case "camp_kitchen", "camp-kitchen", "campus_kitchen", "campus-kitchen":
		return notificationRecipientRoleCampKitchen
	default:
		return notificationRecipientRoleStudent
	}
}

func normalizeKitchenNotificationRole(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "student_kitchen", "student-kitchen":
		return notificationRecipientRoleStudentKitchen
	case "hall_kitchen", "hall-kitchen":
		return notificationRecipientRoleHallKitchen
	case "camp_kitchen", "camp-kitchen", "campus-kitchen", "campus_kitchen":
		return notificationRecipientRoleCampKitchen
	default:
		return ""
	}
}

func formatKitchenTypeLabel(value string) string {
	switch normalizeKitchenNotificationRole(value) {
	case notificationRecipientRoleStudentKitchen:
		return "student kitchen"
	case notificationRecipientRoleHallKitchen:
		return "hall kitchen"
	case notificationRecipientRoleCampKitchen:
		return "campus kitchen"
	default:
		return "kitchen"
	}
}

func formatDeliveryPlanLabel(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "free":
		return "Free"
	case "permanent":
		return "Permanent"
	default:
		return "Delivery"
	}
}
