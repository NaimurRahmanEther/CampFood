package repo

import (
	"backend/admin"
	"backend/config"
	"backend/domain"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jmoiron/sqlx"
)

type AdminRepository interface {
	admin.AdminRepository
}

type adminRepo struct {
	db     *sqlx.DB
	config *config.Config
}

type approvalRow struct {
	ID             string `db:"id"`
	RequestType    string `db:"request_type"`
	ApplicantName  string `db:"applicant_name"`
	ApplicantEmail string `db:"applicant_email"`
	Status         string `db:"status"`
	Payload        string `db:"payload"`
	ReviewNote     string `db:"review_note"`
	ReviewedAt     string `db:"reviewed_at"`
	CreatedAt      string `db:"created_at"`
}

func NewAdminRepo(db *sqlx.DB, config *config.Config) AdminRepository {
	return &adminRepo{db: db, config: config}
}

func (r *adminRepo) LoginAdmin(email, password string) (*domain.Admin, error) {
	if email != r.config.AdminEmail || password != r.config.AdminPassword {
		return nil, errors.New("invalid admin credentials")
	}

	return &domain.Admin{
		Email:    email,
		Password: password,
	}, nil
}

func (r *adminRepo) GetPendingStudentKitchens() ([]domain.Student_kitchen, error) {
	var kitchens []domain.Student_kitchen
	query := `SELECT user_id::text as user_id, seller_name, student_id, email, password, phone_number, hall_name, status, create_at, update_at FROM student_kitchen WHERE status = 'pending'`
	err := r.db.Select(&kitchens, query)
	return kitchens, err
}

func (r *adminRepo) GetPendingHallKitchens() ([]domain.Hall_kitchen, error) {
	var kitchens []domain.Hall_kitchen
	query := `SELECT user_id::text as user_id, kitchen_name, manager_phone, email, password, phone_number, hall_name, subscription, status, create_at, update_at FROM hall_kitchen WHERE status = 'pending'`
	err := r.db.Select(&kitchens, query)
	return kitchens, err
}

func (r *adminRepo) GetPendingCampKitchens() ([]domain.Camp_kitchen, error) {
	var kitchens []domain.Camp_kitchen
	query := `SELECT user_id::text as user_id, kitchen_name, location, manager_phone, email, password, phone_number, trade_license, subscription, status, create_at, update_at FROM camp_kitchen WHERE status = 'pending'`
	err := r.db.Select(&kitchens, query)
	return kitchens, err
}

func (r *adminRepo) ListStudentKitchens() ([]domain.Student_kitchen, error) {
	var kitchens []domain.Student_kitchen
	err := r.db.Select(&kitchens, `SELECT user_id::text as user_id, seller_name, student_id, email, password, phone_number, hall_name, status, create_at, update_at FROM student_kitchen ORDER BY create_at DESC`)
	return kitchens, err
}

func (r *adminRepo) ListHallKitchens() ([]domain.Hall_kitchen, error) {
	var kitchens []domain.Hall_kitchen
	err := r.db.Select(&kitchens, `SELECT user_id::text as user_id, kitchen_name, manager_phone, email, password, phone_number, hall_name, subscription, status, create_at, update_at FROM hall_kitchen ORDER BY create_at DESC`)
	return kitchens, err
}

func (r *adminRepo) ListCampKitchens() ([]domain.Camp_kitchen, error) {
	var kitchens []domain.Camp_kitchen
	err := r.db.Select(&kitchens, `SELECT user_id::text as user_id, kitchen_name, location, manager_phone, email, password, phone_number, trade_license, subscription, status, create_at, update_at FROM camp_kitchen ORDER BY create_at DESC`)
	return kitchens, err
}

func (r *adminRepo) UpdateStudentKitchenStatus(id, status string) error {
	query := `UPDATE student_kitchen SET status = $1 WHERE user_id = $2`
	result, err := r.db.Exec(query, status, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return fmt.Errorf("student kitchen not found")
	}

	return notifyKitchenRegistrationDecision(r.db, "student_kitchen", id, status)
}

func (r *adminRepo) UpdateHallKitchenStatus(id, status string) error {
	query := `UPDATE hall_kitchen SET status = $1 WHERE user_id = $2`
	result, err := r.db.Exec(query, status, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return fmt.Errorf("hall kitchen not found")
	}

	return notifyKitchenRegistrationDecision(r.db, "hall_kitchen", id, status)
}

func (r *adminRepo) UpdateCampKitchenStatus(id, status string) error {
	query := `UPDATE camp_kitchen SET status = $1 WHERE user_id = $2`
	result, err := r.db.Exec(query, status, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return fmt.Errorf("campus kitchen not found")
	}

	return notifyKitchenRegistrationDecision(r.db, "camp_kitchen", id, status)
}

func (r *adminRepo) IsKitchenApproved(userID, kitchenType string) (bool, error) {
	var status string
	var query string
	switch kitchenType {
	case "student_kitchen":
		query = `SELECT status FROM student_kitchen WHERE user_id = $1`
	case "hall_kitchen":
		query = `SELECT status FROM hall_kitchen WHERE user_id = $1`
	case "camp_kitchen":
		query = `SELECT status FROM camp_kitchen WHERE user_id = $1`
	default:
		return false, fmt.Errorf("invalid kitchen type")
	}
	err := r.db.Get(&status, query, userID)
	if err != nil {
		return false, err
	}
	return status == "approved", nil
}

func (r *adminRepo) LogKitchenApproval(kitchenType, kitchenUserID, action, adminEmail string) error {
	query := `INSERT INTO kitchen_approval_requests (kitchen_type, kitchen_user_id, action, admin_email) VALUES ($1, $2, $3, $4)`
	_, err := r.db.Exec(query, kitchenType, kitchenUserID, action, adminEmail)
	return err
}

func (r *adminRepo) CreateApprovalRequest(requestType, applicantName, applicantEmail string, payload map[string]string) (*domain.ApprovalRequest, error) {
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	tx, err := r.db.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var id string
	var createdAt string
	err = tx.QueryRow(
		`INSERT INTO approval_requests (request_type, applicant_name, applicant_email, status, payload)
		 VALUES ($1, $2, $3, 'pending', $4::jsonb)
		 RETURNING id::text, created_at::text`,
		requestType,
		applicantName,
		applicantEmail,
		string(payloadBytes),
	).Scan(&id, &createdAt)
	if err != nil {
		return nil, err
	}

	request := &domain.ApprovalRequest{
		ID:             id,
		Type:           requestType,
		ApplicantName:  applicantName,
		ApplicantEmail: applicantEmail,
		Status:         "pending",
		SubmittedAt:    parseTimeOrNow(createdAt),
		Payload:        payload,
	}

	if err := notifyAdminApprovalRequestCreatedTx(tx, request.Type, request.ApplicantName, request.Payload); err != nil {
		return nil, err
	}

	if err := notifyApprovalRequestSubmittedToApplicantTx(tx, request.Type, request.ApplicantEmail, request.Payload); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return request, nil
}

func (r *adminRepo) ListApprovalRequests() ([]domain.ApprovalRequest, error) {
	var rows []approvalRow
	err := r.db.Select(&rows, `SELECT id::text as id, request_type, applicant_name, applicant_email, status, payload::text as payload, review_note, COALESCE(reviewed_at::text, '') as reviewed_at, created_at::text as created_at FROM approval_requests ORDER BY created_at DESC, id DESC`)
	if err != nil {
		return nil, err
	}

	return mapApprovalRows(rows)
}

func (r *adminRepo) FindApprovalRequests(requestType, applicantEmail string) ([]domain.ApprovalRequest, error) {
	var rows []approvalRow
	err := r.db.Select(&rows, `SELECT id::text as id, request_type, applicant_name, applicant_email, status, payload::text as payload, review_note, COALESCE(reviewed_at::text, '') as reviewed_at, created_at::text as created_at FROM approval_requests WHERE request_type = $1 AND applicant_email = $2 ORDER BY created_at DESC, id DESC`, requestType, applicantEmail)
	if err != nil {
		return nil, err
	}

	return mapApprovalRows(rows)
}

func (r *adminRepo) ReviewApprovalRequest(id, status, reviewNote string) (*domain.ApprovalRequest, error) {
	tx, err := r.db.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var row approvalRow
	err = tx.Get(&row, `UPDATE approval_requests SET status = $1, review_note = $2, reviewed_at = current_timestamp WHERE id::text = $3 RETURNING id::text as id, request_type, applicant_name, applicant_email, status, payload::text as payload, review_note, COALESCE(reviewed_at::text, '') as reviewed_at, created_at::text as created_at`, status, reviewNote, id)
	if err != nil {
		return nil, err
	}

	requests, err := mapApprovalRows([]approvalRow{row})
	if err != nil {
		return nil, err
	}

	request := &requests[0]

	if err := notifyApprovalRequestReviewedToApplicantTx(tx, *request); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return request, nil
}

func (r *adminRepo) UpdateFoodApprovalStatus(foodID, kitchenUserID, kitchenType, status string) error {
	result, err := r.db.Exec(
		`UPDATE foods
		 SET approval_status = $1,
		     visible = CASE WHEN $2 THEN false ELSE visible END,
		     update_at = current_timestamp
		 WHERE id::text = $3 AND user_id = $4 AND kitchen_type = $5`,
		status,
		status == "rejected",
		foodID,
		kitchenUserID,
		kitchenType,
	)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return fmt.Errorf("food approval target not found")
	}

	return nil
}

func (r *adminRepo) ActivateFreeDeliveryPartnerByEmail(email string) error {
	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var userID string
	if err := tx.Get(&userID, `SELECT user_id::text FROM student WHERE email = $1`, email); err != nil {
		return err
	}

	if err := activateFreeDeliveryPartnerTx(tx, userID); err != nil {
		return err
	}

	return tx.Commit()
}

func mapApprovalRows(rows []approvalRow) ([]domain.ApprovalRequest, error) {
	requests := make([]domain.ApprovalRequest, 0, len(rows))
	for _, row := range rows {
		payload := map[string]string{}
		if row.Payload != "" {
			if err := json.Unmarshal([]byte(row.Payload), &payload); err != nil {
				return nil, err
			}
		}

		request := domain.ApprovalRequest{
			ID:             row.ID,
			Type:           row.RequestType,
			ApplicantName:  row.ApplicantName,
			ApplicantEmail: row.ApplicantEmail,
			Status:         row.Status,
			SubmittedAt:    parseTimeOrNow(row.CreatedAt),
			ReviewNote:     row.ReviewNote,
			Payload:        payload,
		}
		if row.ReviewedAt != "" {
			reviewedAt := parseTimeOrNow(row.ReviewedAt)
			request.ReviewedAt = &reviewedAt
		}
		requests = append(requests, request)
	}

	return requests, nil
}
