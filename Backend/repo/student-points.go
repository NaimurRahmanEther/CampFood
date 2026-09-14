package repo

import (
	"backend/domain"
	"backend/studentpoints"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
)

const (
	registrationBonusPoints = 60
	freePartnerBonus        = 120
	pointExpiryDays         = 15
	monthlyRewardPoints     = 200
	monthlySpendThreshold   = 10000
	dailyPointSpendLimit    = 500

	registrationBonusNote = "Student registration bonus"
	freePartnerBonusNote  = "Free delivery partner activation bonus"
	pointExpiryNote       = "Points expired after 15 days"
	monthlySpendRewardKey = "customer-monthly-spend"
	monthlyDeliveryKey    = "free-delivery-monthly-consistency"
	monthlyRewardTimezone = "Asia/Dhaka"
)

var monthlyRewardLocation = time.FixedZone(monthlyRewardTimezone, 6*60*60)

type StudentPointsRepository interface {
	studentpoints.StudentPointsRepository
}

type studentPointsRepo struct {
	db *sqlx.DB
}

type pointStateRow struct {
	Points                int  `db:"points"`
	TotalEarned           int  `db:"total_earned"`
	TotalTransferred      int  `db:"total_transferred"`
	IsFreeDeliveryPartner bool `db:"is_free_delivery_partner"`
}

type pointTransactionRow struct {
	ID              string        `db:"id"`
	Type            string        `db:"transaction_type"`
	Amount          int           `db:"amount"`
	Note            string        `db:"note"`
	CreatedAt       string        `db:"created_at"`
	ExpiresAt       string        `db:"expires_at"`
	RemainingAmount sql.NullInt64 `db:"remaining_amount"`
}

type pointLedgerRow struct {
	ID              int           `db:"id"`
	Type            string        `db:"transaction_type"`
	Amount          int           `db:"amount"`
	CreatedAt       string        `db:"created_at"`
	ExpiresAt       string        `db:"expires_at"`
	RemainingAmount sql.NullInt64 `db:"remaining_amount"`
}

type pointBalanceLot struct {
	ID        int
	Remaining int
	ExpiresAt time.Time
}

type pointTransferRequestRow struct {
	ID                string `db:"id"`
	Amount            int    `db:"amount"`
	Status            string `db:"status"`
	SenderUserID      string `db:"sender_user_id"`
	SenderName        string `db:"sender_name"`
	SenderStudentID   string `db:"sender_student_id"`
	ReceiverUserID    string `db:"receiver_user_id"`
	ReceiverName      string `db:"receiver_name"`
	ReceiverStudentID string `db:"receiver_student_id"`
	CreatedAt         string `db:"created_at"`
	RespondedAt       string `db:"responded_at"`
}

func NewStudentPointsRepo(db *sqlx.DB) StudentPointsRepository {
	return &studentPointsRepo{db: db}
}

func (r *studentPointsRepo) GetState(userID string) (*domain.StudentPointState, error) {
	tx, err := r.db.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if err := ensureStudentPointStateTx(tx, userID); err != nil {
		return nil, err
	}

	if err := reconcileStudentPointStateTx(tx, userID); err != nil {
		return nil, err
	}

	state, err := finalizeStudentPointStateTx(tx, userID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return state, nil
}

func (r *studentPointsRepo) Transfer(senderUserID, receiverStudentID string, amount int) (*domain.StudentPointState, error) {
	if amount <= 0 {
		return nil, fmt.Errorf("enter a valid transfer amount")
	}

	tx, err := r.db.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if err := ensureStudentPointStateTx(tx, senderUserID); err != nil {
		return nil, err
	}
	if err := reconcileStudentPointStateTx(tx, senderUserID); err != nil {
		return nil, err
	}

	receiverUserID, err := resolveStudentUserIDByStudentIDTx(tx, receiverStudentID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("receiver student ID not found")
		}
		return nil, err
	}

	if err := ensureStudentPointStateTx(tx, receiverUserID); err != nil {
		return nil, err
	}
	if err := reconcileStudentPointStateTx(tx, receiverUserID); err != nil {
		return nil, err
	}

	var current pointStateRow
	if err := tx.Get(&current, `SELECT points, total_earned, total_transferred, is_free_delivery_partner FROM student_points WHERE student_user_id = $1`, senderUserID); err != nil {
		return nil, err
	}

	if !current.IsFreeDeliveryPartner {
		return nil, fmt.Errorf("point transfer is only available for free delivery student partners")
	}

	if senderUserID == receiverUserID {
		return nil, fmt.Errorf("you cannot send points to your own student ID")
	}

	if amount > current.Points {
		return nil, fmt.Errorf("not enough points available for this transfer request")
	}

	if _, err := tx.Exec(
		`INSERT INTO student_point_transfer_requests (sender_user_id, receiver_user_id, amount, status)
		 VALUES ($1, $2, $3, 'pending')`,
		senderUserID,
		receiverUserID,
		amount,
	); err != nil {
		return nil, err
	}

	state, err := finalizeStudentPointStateTx(tx, senderUserID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return state, nil
}

func (r *studentPointsRepo) AcceptTransfer(receiverUserID, requestID string) (*domain.StudentPointState, error) {
	tx, err := r.db.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	request, err := loadPointTransferRequestTx(tx, requestID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("transfer request not found")
		}
		return nil, err
	}

	if request.ReceiverUserID != receiverUserID {
		return nil, fmt.Errorf("this transfer request is not assigned to you")
	}

	if request.Status != "pending" {
		return nil, fmt.Errorf("this transfer request is already %s", request.Status)
	}

	if err := ensureStudentPointStateTx(tx, request.SenderUserID); err != nil {
		return nil, err
	}
	if err := reconcileStudentPointStateTx(tx, request.SenderUserID); err != nil {
		return nil, err
	}

	if err := ensureStudentPointStateTx(tx, receiverUserID); err != nil {
		return nil, err
	}
	if err := reconcileStudentPointStateTx(tx, receiverUserID); err != nil {
		return nil, err
	}

	var senderState pointStateRow
	if err := tx.Get(&senderState, `SELECT points, total_earned, total_transferred, is_free_delivery_partner FROM student_points WHERE student_user_id = $1`, request.SenderUserID); err != nil {
		return nil, err
	}

	if !senderState.IsFreeDeliveryPartner {
		return nil, fmt.Errorf("the sender can no longer transfer points")
	}

	if request.Amount > senderState.Points {
		return nil, fmt.Errorf("the sender does not have enough available points anymore")
	}

	if err := consumeStudentPointsTx(tx, request.SenderUserID, request.Amount); err != nil {
		return nil, err
	}

	if _, err := tx.Exec(
		`UPDATE student_points
		 SET total_transferred = total_transferred + $1, updated_at = current_timestamp
		 WHERE student_user_id = $2`,
		request.Amount,
		request.SenderUserID,
	); err != nil {
		return nil, err
	}

	if _, err := tx.Exec(
		`INSERT INTO student_point_transactions (student_user_id, transaction_type, amount, note)
		 VALUES ($1, 'transfer-out', $2, $3)`,
		request.SenderUserID,
		request.Amount,
		fmt.Sprintf("Transferred to %s after acceptance", request.ReceiverStudentID),
	); err != nil {
		return nil, err
	}

	if err := awardStudentBonusTx(tx, receiverUserID, request.Amount, fmt.Sprintf("Points received from %s", request.SenderStudentID), time.Now().UTC()); err != nil {
		return nil, err
	}

	if _, err := tx.Exec(
		`UPDATE student_point_transfer_requests
		 SET status = 'accepted', responded_at = current_timestamp
		 WHERE id = $1`,
		requestID,
	); err != nil {
		return nil, err
	}

	state, err := finalizeStudentPointStateTx(tx, receiverUserID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return state, nil
}

func (r *studentPointsRepo) RejectTransfer(receiverUserID, requestID string) (*domain.StudentPointState, error) {
	tx, err := r.db.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	request, err := loadPointTransferRequestTx(tx, requestID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("transfer request not found")
		}
		return nil, err
	}

	if request.ReceiverUserID != receiverUserID {
		return nil, fmt.Errorf("this transfer request is not assigned to you")
	}

	if request.Status != "pending" {
		return nil, fmt.Errorf("this transfer request is already %s", request.Status)
	}

	if _, err := tx.Exec(
		`UPDATE student_point_transfer_requests
		 SET status = 'rejected', responded_at = current_timestamp
		 WHERE id = $1`,
		requestID,
	); err != nil {
		return nil, err
	}

	state, err := finalizeStudentPointStateTx(tx, receiverUserID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return state, nil
}

func (r *studentPointsRepo) Redeem(userID string, amount int, note string) (*domain.StudentPointState, error) {
	if amount <= 0 {
		return nil, fmt.Errorf("enter a valid point amount to redeem")
	}

	tx, err := r.db.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if err := ensureStudentPointStateTx(tx, userID); err != nil {
		return nil, err
	}
	if err := reconcileStudentPointStateTx(tx, userID); err != nil {
		return nil, err
	}

	var current pointStateRow
	if err := tx.Get(&current, `SELECT points, total_earned, total_transferred, is_free_delivery_partner FROM student_points WHERE student_user_id = $1 FOR UPDATE`, userID); err != nil {
		return nil, err
	}

	if amount > current.Points {
		return nil, fmt.Errorf("not enough points available for this order")
	}

	if err := enforceDailyPointSpendLimitTx(tx, userID, amount); err != nil {
		return nil, err
	}

	if note == "" {
		note = "Food order paid with points"
	}

	if err := consumeStudentPointsTx(tx, userID, amount); err != nil {
		return nil, err
	}

	if _, err := tx.Exec(`INSERT INTO student_point_transactions (student_user_id, transaction_type, amount, note) VALUES ($1, 'redeem', $2, $3)`, userID, amount, note); err != nil {
		return nil, err
	}

	state, err := finalizeStudentPointStateTx(tx, userID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return state, nil
}

func (r *studentPointsRepo) AddBonus(userID string, amount int, note string) (*domain.StudentPointState, error) {
	if amount <= 0 {
		return r.GetState(userID)
	}

	tx, err := r.db.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if err := ensureStudentPointStateTx(tx, userID); err != nil {
		return nil, err
	}
	if err := reconcileStudentPointStateTx(tx, userID); err != nil {
		return nil, err
	}

	if err := awardStudentBonusTx(tx, userID, amount, note, time.Now().UTC()); err != nil {
		return nil, err
	}

	state, err := finalizeStudentPointStateTx(tx, userID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return state, nil
}

func (r *studentPointsRepo) ActivateFreeDeliveryPartnerByEmail(email string) error {
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

func ensureStudentPointStateTx(tx *sqlx.Tx, userID string) error {
	var exists bool
	if err := tx.Get(&exists, `SELECT EXISTS(SELECT 1 FROM student_points WHERE student_user_id = $1)`, userID); err != nil {
		return err
	}

	if !exists {
		if _, err := tx.Exec(
			`INSERT INTO student_points (student_user_id, points, total_earned, total_transferred, is_free_delivery_partner, updated_at)
			 VALUES ($1, 0, 0, 0, false, current_timestamp)`,
			userID,
		); err != nil {
			return err
		}

		return awardStudentBonusTx(tx, userID, registrationBonusPoints, registrationBonusNote, time.Now().UTC())
	}

	var transactionCount int
	if err := tx.Get(&transactionCount, `SELECT COUNT(*) FROM student_point_transactions WHERE student_user_id = $1`, userID); err != nil {
		return err
	}

	if transactionCount > 0 {
		return nil
	}

	var current pointStateRow
	if err := tx.Get(&current, `SELECT points, total_earned, total_transferred, is_free_delivery_partner FROM student_points WHERE student_user_id = $1`, userID); err != nil {
		return err
	}

	if _, err := tx.Exec(
		`UPDATE student_points
		 SET points = 0, total_earned = 0, total_transferred = 0, updated_at = current_timestamp
		 WHERE student_user_id = $1`,
		userID,
	); err != nil {
		return err
	}

	now := time.Now().UTC()
	if err := awardStudentBonusTx(tx, userID, registrationBonusPoints, registrationBonusNote, now); err != nil {
		return err
	}

	if current.IsFreeDeliveryPartner {
		if err := awardStudentBonusTx(tx, userID, freePartnerBonus, freePartnerBonusNote, now); err != nil {
			return err
		}
	}

	return nil
}

func reconcileStudentPointStateTx(tx *sqlx.Tx, userID string) error {
	available, expired, err := syncStudentPointBalancesTx(tx, userID)
	if err != nil {
		return err
	}

	if expired > 0 {
		if _, err := tx.Exec(
			`INSERT INTO student_point_transactions (student_user_id, transaction_type, amount, note)
			 VALUES ($1, 'expire', $2, $3)`,
			userID,
			expired,
			pointExpiryNote,
		); err != nil {
			return err
		}

		available, _, err = syncStudentPointBalancesTx(tx, userID)
		if err != nil {
			return err
		}
	}

	_, err = tx.Exec(
		`UPDATE student_points SET points = $1, updated_at = current_timestamp WHERE student_user_id = $2`,
		available,
		userID,
	)
	return err
}

func syncStudentPointBalancesTx(tx *sqlx.Tx, userID string) (int, int, error) {
	var rows []pointLedgerRow
	if err := tx.Select(
		&rows,
		`SELECT id, transaction_type, amount, created_at::text as created_at, COALESCE(expires_at::text, '') as expires_at, remaining_amount
		 FROM student_point_transactions
		 WHERE student_user_id = $1
		 ORDER BY created_at ASC, id ASC
		 FOR UPDATE`,
		userID,
	); err != nil {
		return 0, 0, err
	}

	now := time.Now().UTC()
	lots := make([]pointBalanceLot, 0, len(rows))

	for _, row := range rows {
		if row.Type == "bonus" || row.Type == "refund" {
			createdAt := parseTimeOrNow(row.CreatedAt)
			expiresAt := createdAt.AddDate(0, 0, pointExpiryDays)
			if row.ExpiresAt != "" {
				expiresAt = parseTimeOrNow(row.ExpiresAt)
			}

			lots = append(lots, pointBalanceLot{
				ID:        row.ID,
				Remaining: row.Amount,
				ExpiresAt: expiresAt,
			})
			continue
		}

		if !isStudentPointDebit(row.Type) {
			continue
		}

		remainingDebit := row.Amount
		for index := range lots {
			if remainingDebit == 0 {
				break
			}
			if lots[index].Remaining == 0 {
				continue
			}

			consumed := minInt(remainingDebit, lots[index].Remaining)
			lots[index].Remaining -= consumed
			remainingDebit -= consumed
		}
	}

	lotByID := make(map[int]pointBalanceLot, len(lots))
	for _, lot := range lots {
		lotByID[lot.ID] = lot
	}

	available := 0
	expired := 0

	for _, row := range rows {
		if row.Type != "bonus" && row.Type != "refund" {
			continue
		}

		lot := lotByID[row.ID]
		if _, err := tx.Exec(
			`UPDATE student_point_transactions
			 SET remaining_amount = $1, expires_at = $2
			 WHERE id = $3`,
			lot.Remaining,
			lot.ExpiresAt.UTC(),
			row.ID,
		); err != nil {
			return 0, 0, err
		}

		if lot.Remaining == 0 {
			continue
		}

		if lot.ExpiresAt.After(now) {
			available += lot.Remaining
			continue
		}

		expired += lot.Remaining
	}

	return available, expired, nil
}

func consumeStudentPointsTx(tx *sqlx.Tx, userID string, amount int) error {
	if amount <= 0 {
		return nil
	}

	type bonusRow struct {
		ID              int `db:"id"`
		RemainingAmount int `db:"remaining_amount"`
	}

	var rows []bonusRow
	if err := tx.Select(
		&rows,
		`SELECT id, remaining_amount
		 FROM student_point_transactions
		 WHERE student_user_id = $1
		   AND transaction_type IN ('bonus', 'refund')
		   AND remaining_amount > 0
		   AND expires_at > current_timestamp
		 ORDER BY expires_at ASC, created_at ASC, id ASC
		 FOR UPDATE`,
		userID,
	); err != nil {
		return err
	}

	remaining := amount
	for _, row := range rows {
		if remaining == 0 {
			break
		}

		consumed := minInt(remaining, row.RemainingAmount)
		if _, err := tx.Exec(`UPDATE student_point_transactions SET remaining_amount = remaining_amount - $1 WHERE id = $2`, consumed, row.ID); err != nil {
			return err
		}
		remaining -= consumed
	}

	if remaining > 0 {
		return fmt.Errorf("not enough points available right now")
	}

	_, err := tx.Exec(
		`UPDATE student_points SET points = points - $1, updated_at = current_timestamp WHERE student_user_id = $2`,
		amount,
		userID,
	)
	return err
}

func enforceDailyPointSpendLimitTx(tx *sqlx.Tx, userID string, amount int) error {
	if amount <= 0 {
		return nil
	}

	dayStart, dayEnd := startOfDayRangeInLocation(time.Now(), monthlyRewardLocation)

	var spentToday int
	if err := tx.Get(
		&spentToday,
		`SELECT COALESCE(SUM(amount), 0)
		 FROM student_point_transactions
		 WHERE student_user_id = $1
		   AND transaction_type = 'redeem'
		   AND created_at >= $2
		   AND created_at < $3`,
		userID,
		dayStart.UTC(),
		dayEnd.UTC(),
	); err != nil {
		return err
	}

	if spentToday+amount <= dailyPointSpendLimit {
		return nil
	}

	remainingToday := maxInt(0, dailyPointSpendLimit-spentToday)
	if remainingToday == 0 {
		return fmt.Errorf("daily points spending limit reached. you can spend up to %d points per day", dailyPointSpendLimit)
	}

	return fmt.Errorf(
		"daily points spending limit is %d. you can spend %d more points today",
		dailyPointSpendLimit,
		remainingToday,
	)
}

func refundStudentPointsTx(tx *sqlx.Tx, userID string, amount int, note string) error {
	if amount <= 0 {
		return nil
	}

	if strings.TrimSpace(note) == "" {
		note = "Points refunded"
	}

	refundedAt := time.Now().UTC()
	expiresAt := refundedAt.AddDate(0, 0, pointExpiryDays)

	if _, err := tx.Exec(
		`UPDATE student_points
		 SET points = points + $1, updated_at = current_timestamp
		 WHERE student_user_id = $2`,
		amount,
		userID,
	); err != nil {
		return err
	}

	_, err := tx.Exec(
		`INSERT INTO student_point_transactions (
			student_user_id,
			transaction_type,
			amount,
			note,
			expires_at,
			remaining_amount,
			created_at
		) VALUES ($1, 'refund', $2, $3, $4, $2, $5)`,
		userID,
		amount,
		note,
		expiresAt.UTC(),
		refundedAt.UTC(),
	)
	return err
}

func awardStudentBonusTx(tx *sqlx.Tx, userID string, amount int, note string, awardedAt time.Time) error {
	if amount <= 0 {
		return nil
	}

	if note == "" {
		note = "Bonus points"
	}

	if awardedAt.IsZero() {
		awardedAt = time.Now().UTC()
	}

	expiresAt := awardedAt.AddDate(0, 0, pointExpiryDays)

	if _, err := tx.Exec(
		`UPDATE student_points
		 SET points = points + $1, total_earned = total_earned + $1, updated_at = current_timestamp
		 WHERE student_user_id = $2`,
		amount,
		userID,
	); err != nil {
		return err
	}

	_, err := tx.Exec(
		`INSERT INTO student_point_transactions (
			student_user_id,
			transaction_type,
			amount,
			note,
			expires_at,
			remaining_amount,
			created_at
		) VALUES ($1, 'bonus', $2, $3, $4, $2, $5)`,
		userID,
		amount,
		note,
		expiresAt.UTC(),
		awardedAt.UTC(),
	)
	return err
}

func activateFreeDeliveryPartnerTx(tx *sqlx.Tx, userID string) error {
	if err := ensureStudentPointStateTx(tx, userID); err != nil {
		return err
	}
	if err := reconcileStudentPointStateTx(tx, userID); err != nil {
		return err
	}

	var isActive bool
	if err := tx.Get(&isActive, `SELECT is_free_delivery_partner FROM student_points WHERE student_user_id = $1`, userID); err != nil {
		return err
	}
	if isActive {
		return nil
	}

	if _, err := tx.Exec(
		`UPDATE student_points SET is_free_delivery_partner = true, updated_at = current_timestamp WHERE student_user_id = $1`,
		userID,
	); err != nil {
		return err
	}

	return awardStudentBonusTx(tx, userID, freePartnerBonus, freePartnerBonusNote, time.Now().UTC())
}

func resolveStudentUserIDByStudentIDTx(tx *sqlx.Tx, studentID string) (string, error) {
	var userID string
	err := tx.Get(&userID, `SELECT user_id::text FROM student WHERE student_id = $1`, studentID)
	return userID, err
}

func loadPointTransferRequestTx(tx *sqlx.Tx, requestID string) (*pointTransferRequestRow, error) {
	var row pointTransferRequestRow
	err := tx.Get(
		&row,
		`SELECT
			r.id::text as id,
			r.amount,
			r.status,
			r.sender_user_id,
			sender.full_name as sender_name,
			sender.student_id as sender_student_id,
			r.receiver_user_id,
			receiver.full_name as receiver_name,
			receiver.student_id as receiver_student_id,
			r.created_at::text as created_at,
			COALESCE(r.responded_at::text, '') as responded_at
		 FROM student_point_transfer_requests r
		 JOIN student sender ON sender.user_id::text = r.sender_user_id
		 JOIN student receiver ON receiver.user_id::text = r.receiver_user_id
		 WHERE r.id::text = $1
		 FOR UPDATE`,
		requestID,
	)
	if err != nil {
		return nil, err
	}

	return &row, nil
}

func listPendingTransferRequestsTx(tx *sqlx.Tx, userID string, incoming bool) ([]domain.StudentPointTransferRequest, error) {
	query := `SELECT
		r.id::text as id,
		r.amount,
		r.status,
		r.sender_user_id,
		sender.full_name as sender_name,
		sender.student_id as sender_student_id,
		r.receiver_user_id,
		receiver.full_name as receiver_name,
		receiver.student_id as receiver_student_id,
		r.created_at::text as created_at,
		COALESCE(r.responded_at::text, '') as responded_at
	 FROM student_point_transfer_requests r
	 JOIN student sender ON sender.user_id::text = r.sender_user_id
	 JOIN student receiver ON receiver.user_id::text = r.receiver_user_id
	 WHERE %s = $1
	   AND r.status = 'pending'
	 ORDER BY r.created_at DESC, r.id DESC`

	targetColumn := "r.sender_user_id"
	if incoming {
		targetColumn = "r.receiver_user_id"
	}

	var rows []pointTransferRequestRow
	if err := tx.Select(&rows, fmt.Sprintf(query, targetColumn), userID); err != nil {
		return nil, err
	}

	requests := make([]domain.StudentPointTransferRequest, 0, len(rows))
	for _, row := range rows {
		request := domain.StudentPointTransferRequest{
			ID:                row.ID,
			Amount:            row.Amount,
			Status:            row.Status,
			SenderName:        row.SenderName,
			SenderStudentID:   row.SenderStudentID,
			ReceiverName:      row.ReceiverName,
			ReceiverStudentID: row.ReceiverStudentID,
			CreatedAt:         parseTimeOrNow(row.CreatedAt),
		}
		if row.RespondedAt != "" {
			respondedAt := parseTimeOrNow(row.RespondedAt)
			request.RespondedAt = &respondedAt
		}
		requests = append(requests, request)
	}

	return requests, nil
}

func loadStudentPointStateTx(tx *sqlx.Tx, userID string) (*domain.StudentPointState, error) {
	var summary pointStateRow
	if err := tx.Get(&summary, `SELECT points, total_earned, total_transferred, is_free_delivery_partner FROM student_points WHERE student_user_id = $1`, userID); err != nil {
		return nil, err
	}

	monthlyRewardState, err := buildMonthlyRewardStateTx(tx, userID, summary.IsFreeDeliveryPartner)
	if err != nil {
		return nil, err
	}

	type expirySummaryRow struct {
		ExpiringPoints int    `db:"expiring_points"`
		NextExpiryAt   string `db:"next_expiry_at"`
	}

	var expirySummary expirySummaryRow
	if err := tx.Get(
		&expirySummary,
		`SELECT
			COALESCE(SUM(remaining_amount), 0) as expiring_points,
			COALESCE(MIN(expires_at)::text, '') as next_expiry_at
		 FROM student_point_transactions
		 WHERE student_user_id = $1
		   AND transaction_type = 'bonus'
		   AND remaining_amount > 0
		   AND expires_at > current_timestamp`,
		userID,
	); err != nil {
		return nil, err
	}

	var rows []pointTransactionRow
	if err := tx.Select(
		&rows,
		`SELECT
			id::text as id,
			transaction_type,
			amount,
			note,
			created_at::text as created_at,
			COALESCE(expires_at::text, '') as expires_at,
			remaining_amount
		 FROM student_point_transactions
		 WHERE student_user_id = $1
		 ORDER BY created_at DESC, id DESC`,
		userID,
	); err != nil {
		return nil, err
	}

	transactions := make([]domain.StudentPointTransaction, 0, len(rows))
	for _, row := range rows {
		transaction := domain.StudentPointTransaction{
			ID:              row.ID,
			Type:            row.Type,
			Amount:          row.Amount,
			Note:            row.Note,
			CreatedAt:       parseTimeOrNow(row.CreatedAt),
			RemainingAmount: nullIntToInt(row.RemainingAmount),
		}
		if row.ExpiresAt != "" {
			expiresAt := parseTimeOrNow(row.ExpiresAt)
			transaction.ExpiresAt = &expiresAt
		}
		transactions = append(transactions, transaction)
	}

	var nextExpiryAt *time.Time
	if expirySummary.NextExpiryAt != "" {
		parsed := parseTimeOrNow(expirySummary.NextExpiryAt)
		nextExpiryAt = &parsed
	}

	pendingIncomingTransfers, err := listPendingTransferRequestsTx(tx, userID, true)
	if err != nil {
		return nil, err
	}

	pendingOutgoingTransfers, err := listPendingTransferRequestsTx(tx, userID, false)
	if err != nil {
		return nil, err
	}

	return &domain.StudentPointState{
		Points:                   summary.Points,
		TotalEarned:              summary.TotalEarned,
		TotalTransferred:         summary.TotalTransferred,
		IsFreeDeliveryPartner:    summary.IsFreeDeliveryPartner,
		RegistrationBonusPoints:  registrationBonusPoints,
		FreeDeliveryBonusPoints:  freePartnerBonus,
		PointsExpireInDays:       pointExpiryDays,
		ExpiringPoints:           expirySummary.ExpiringPoints,
		NextExpiryAt:             nextExpiryAt,
		MonthlyReward:            monthlyRewardState,
		Transactions:             transactions,
		PendingIncomingTransfers: pendingIncomingTransfers,
		PendingOutgoingTransfers: pendingOutgoingTransfers,
	}, nil
}

func finalizeStudentPointStateTx(tx *sqlx.Tx, userID string) (*domain.StudentPointState, error) {
	if err := processMonthlyRewardsTx(tx, userID); err != nil {
		return nil, err
	}

	return loadStudentPointStateTx(tx, userID)
}

func processMonthlyRewardsTx(tx *sqlx.Tx, userID string) error {
	nowDhaka := time.Now().In(monthlyRewardLocation)
	currentMonthStart := startOfMonth(nowDhaka)
	previousMonthStart := currentMonthStart.AddDate(0, -1, 0)
	previousMonthEnd := currentMonthStart

	previousMonthSpend, err := loadDeliveredCashSpendTx(tx, userID, previousMonthStart, previousMonthEnd)
	if err != nil {
		return err
	}

	if previousMonthSpend >= monthlySpendThreshold {
		note := fmt.Sprintf(
			"Monthly reward for %s spending (%d BDT delivered orders)",
			monthLabel(previousMonthStart),
			previousMonthSpend,
		)
		if err := grantMonthlyRewardTx(tx, userID, monthlySpendRewardKey, previousMonthStart, note); err != nil {
			return err
		}
	}

	var isFreeDeliveryPartner bool
	if err := tx.Get(&isFreeDeliveryPartner, `SELECT is_free_delivery_partner FROM student_points WHERE student_user_id = $1`, userID); err != nil {
		return err
	}
	if !isFreeDeliveryPartner {
		return nil
	}

	deliveredDays, err := loadDeliveredDayCountTx(tx, userID, previousMonthStart, previousMonthEnd)
	if err != nil {
		return err
	}

	requiredDays := daysInMonth(previousMonthStart)
	if requiredDays == 0 || deliveredDays < requiredDays {
		return nil
	}

	note := fmt.Sprintf(
		"Monthly reward for %s delivery consistency (%d/%d days)",
		monthLabel(previousMonthStart),
		deliveredDays,
		requiredDays,
	)
	return grantMonthlyRewardTx(tx, userID, monthlyDeliveryKey, previousMonthStart, note)
}

func grantMonthlyRewardTx(
	tx *sqlx.Tx,
	userID string,
	rewardType string,
	rewardMonth time.Time,
	note string,
) error {
	var grantID int
	err := tx.Get(
		&grantID,
		`INSERT INTO student_monthly_reward_grants (
			student_user_id,
			reward_type,
			reward_month,
			reward_points,
			note
		) VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (student_user_id, reward_type, reward_month) DO NOTHING
		RETURNING id`,
		userID,
		rewardType,
		rewardMonth.Format("2006-01-02"),
		monthlyRewardPoints,
		note,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil
		}
		return err
	}

	if grantID <= 0 {
		return nil
	}

	if err := awardStudentBonusTx(tx, userID, monthlyRewardPoints, note, time.Now().UTC()); err != nil {
		return err
	}

	return notifyMonthlyRewardTx(tx, userID, monthlyRewardPoints, note)
}

func buildMonthlyRewardStateTx(
	tx *sqlx.Tx,
	userID string,
	deliveryRewardEligible bool,
) (domain.StudentMonthlyRewardState, error) {
	nowDhaka := time.Now().In(monthlyRewardLocation)
	currentMonthStart := startOfMonth(nowDhaka)
	nextMonthStart := currentMonthStart.AddDate(0, 1, 0)
	previousMonthStart := currentMonthStart.AddDate(0, -1, 0)
	previousMonthEnd := currentMonthStart

	currentMonthSpend, err := loadDeliveredCashSpendTx(tx, userID, currentMonthStart, nextMonthStart)
	if err != nil {
		return domain.StudentMonthlyRewardState{}, err
	}

	previousMonthSpend, err := loadDeliveredCashSpendTx(tx, userID, previousMonthStart, previousMonthEnd)
	if err != nil {
		return domain.StudentMonthlyRewardState{}, err
	}

	previousSpendRewarded, err := hasMonthlyRewardGrantTx(tx, userID, monthlySpendRewardKey, previousMonthStart)
	if err != nil {
		return domain.StudentMonthlyRewardState{}, err
	}

	currentMonthDeliveryDays := 0
	previousMonthDeliveryDays := 0
	previousDeliveryRewarded := false

	if deliveryRewardEligible {
		currentMonthDeliveryDays, err = loadDeliveredDayCountTx(tx, userID, currentMonthStart, nextMonthStart)
		if err != nil {
			return domain.StudentMonthlyRewardState{}, err
		}

		previousMonthDeliveryDays, err = loadDeliveredDayCountTx(tx, userID, previousMonthStart, previousMonthEnd)
		if err != nil {
			return domain.StudentMonthlyRewardState{}, err
		}

		previousDeliveryRewarded, err = hasMonthlyRewardGrantTx(tx, userID, monthlyDeliveryKey, previousMonthStart)
		if err != nil {
			return domain.StudentMonthlyRewardState{}, err
		}
	}

	currentMonthTotalDays := daysInMonth(currentMonthStart)
	previousMonthTotalDays := daysInMonth(previousMonthStart)

	return domain.StudentMonthlyRewardState{
		Timezone:                       monthlyRewardTimezone,
		RewardPoints:                   monthlyRewardPoints,
		SpendThreshold:                 monthlySpendThreshold,
		CurrentMonth:                   monthKey(currentMonthStart),
		PreviousMonth:                  monthKey(previousMonthStart),
		CurrentMonthSpend:              currentMonthSpend,
		CurrentMonthSpendRemaining:     maxInt(0, monthlySpendThreshold-currentMonthSpend),
		PreviousMonthSpend:             previousMonthSpend,
		PreviousMonthSpendQualified:    previousMonthSpend >= monthlySpendThreshold,
		PreviousMonthSpendRewarded:     previousSpendRewarded,
		DeliveryRewardEligible:         deliveryRewardEligible,
		CurrentMonthDeliveryDays:       currentMonthDeliveryDays,
		CurrentMonthTotalDays:          currentMonthTotalDays,
		PreviousMonthDeliveryDays:      previousMonthDeliveryDays,
		PreviousMonthTotalDays:         previousMonthTotalDays,
		PreviousMonthDeliveryQualified: deliveryRewardEligible && previousMonthTotalDays > 0 && previousMonthDeliveryDays >= previousMonthTotalDays,
		PreviousMonthDeliveryRewarded:  previousDeliveryRewarded,
	}, nil
}

func loadDeliveredCashSpendTx(tx *sqlx.Tx, userID string, start time.Time, end time.Time) (int, error) {
	var amount int
	if err := tx.Get(
		&amount,
		`SELECT COALESCE(SUM(cash_payable), 0)
		 FROM delivery_orders
		 WHERE student_user_id = $1
		   AND status = 'delivered'
		   AND delivered_at >= $2
		   AND delivered_at < $3`,
		userID,
		start.UTC(),
		end.UTC(),
	); err != nil {
		return 0, err
	}

	return amount, nil
}

func loadDeliveredDayCountTx(tx *sqlx.Tx, userID string, start time.Time, end time.Time) (int, error) {
	var dayCount int
	query := fmt.Sprintf(
		`SELECT COALESCE(COUNT(DISTINCT ((delivered_at AT TIME ZONE '%s')::date)), 0)
		 FROM delivery_orders
		 WHERE assigned_to_user_id = $1
		   AND status = 'delivered'
		   AND delivered_at >= $2
		   AND delivered_at < $3`,
		monthlyRewardTimezone,
	)

	if err := tx.Get(
		&dayCount,
		query,
		userID,
		start.UTC(),
		end.UTC(),
	); err != nil {
		return 0, err
	}

	return dayCount, nil
}

func hasMonthlyRewardGrantTx(tx *sqlx.Tx, userID string, rewardType string, monthStart time.Time) (bool, error) {
	var granted bool
	if err := tx.Get(
		&granted,
		`SELECT EXISTS (
			SELECT 1
			FROM student_monthly_reward_grants
			WHERE student_user_id = $1
			  AND reward_type = $2
			  AND reward_month = $3::date
		)`,
		userID,
		rewardType,
		monthStart.Format("2006-01-02"),
	); err != nil {
		return false, err
	}

	return granted, nil
}

func startOfMonth(value time.Time) time.Time {
	loc := value.Location()
	return time.Date(value.Year(), value.Month(), 1, 0, 0, 0, 0, loc)
}

func startOfDayRangeInLocation(now time.Time, location *time.Location) (time.Time, time.Time) {
	localNow := now.In(location)
	dayStart := time.Date(localNow.Year(), localNow.Month(), localNow.Day(), 0, 0, 0, 0, location)
	return dayStart, dayStart.AddDate(0, 0, 1)
}

func monthKey(monthStart time.Time) string {
	return monthStart.Format("2006-01")
}

func monthLabel(monthStart time.Time) string {
	return monthStart.Format("January 2006")
}

func daysInMonth(monthStart time.Time) int {
	return monthStart.AddDate(0, 1, -1).Day()
}

func parseTimeOrNow(value string) time.Time {
	if parsed, err := time.Parse(time.RFC3339Nano, value); err == nil {
		return parsed
	}

	if parsed, err := time.Parse("2006-01-02 15:04:05.999999-07", value); err == nil {
		return parsed
	}

	return time.Now().UTC()
}

func isStudentPointDebit(kind string) bool {
	return kind == "transfer-out" || kind == "redeem" || kind == "expire"
}

func nullIntToInt(value sql.NullInt64) int {
	if !value.Valid {
		return 0
	}

	return int(value.Int64)
}

func minInt(left, right int) int {
	if left < right {
		return left
	}

	return right
}

func maxInt(left, right int) int {
	if left > right {
		return left
	}

	return right
}
