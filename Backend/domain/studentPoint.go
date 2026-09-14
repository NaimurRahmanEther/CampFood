package domain

import "time"

type StudentPointTransaction struct {
	ID              string     `json:"id"`
	Type            string     `json:"type"`
	Amount          int        `json:"amount"`
	Note            string     `json:"note"`
	CreatedAt       time.Time  `json:"createdAt"`
	ExpiresAt       *time.Time `json:"expiresAt,omitempty"`
	RemainingAmount int        `json:"remainingAmount"`
}

type StudentPointTransferRequest struct {
	ID                string     `json:"id"`
	Amount            int        `json:"amount"`
	Status            string     `json:"status"`
	SenderName        string     `json:"senderName"`
	SenderStudentID   string     `json:"senderStudentId"`
	ReceiverName      string     `json:"receiverName"`
	ReceiverStudentID string     `json:"receiverStudentId"`
	CreatedAt         time.Time  `json:"createdAt"`
	RespondedAt       *time.Time `json:"respondedAt,omitempty"`
}

type StudentMonthlyRewardState struct {
	Timezone                       string `json:"timezone"`
	RewardPoints                   int    `json:"rewardPoints"`
	SpendThreshold                 int    `json:"spendThreshold"`
	CurrentMonth                   string `json:"currentMonth"`
	PreviousMonth                  string `json:"previousMonth"`
	CurrentMonthSpend              int    `json:"currentMonthSpend"`
	CurrentMonthSpendRemaining     int    `json:"currentMonthSpendRemaining"`
	PreviousMonthSpend             int    `json:"previousMonthSpend"`
	PreviousMonthSpendQualified    bool   `json:"previousMonthSpendQualified"`
	PreviousMonthSpendRewarded     bool   `json:"previousMonthSpendRewarded"`
	DeliveryRewardEligible         bool   `json:"deliveryRewardEligible"`
	CurrentMonthDeliveryDays       int    `json:"currentMonthDeliveryDays"`
	CurrentMonthTotalDays          int    `json:"currentMonthTotalDays"`
	PreviousMonthDeliveryDays      int    `json:"previousMonthDeliveryDays"`
	PreviousMonthTotalDays         int    `json:"previousMonthTotalDays"`
	PreviousMonthDeliveryQualified bool   `json:"previousMonthDeliveryQualified"`
	PreviousMonthDeliveryRewarded  bool   `json:"previousMonthDeliveryRewarded"`
}

type StudentPointState struct {
	Points                   int                           `json:"points"`
	TotalEarned              int                           `json:"totalEarned"`
	TotalTransferred         int                           `json:"totalTransferred"`
	IsFreeDeliveryPartner    bool                          `json:"isFreeDeliveryPartner"`
	RegistrationBonusPoints  int                           `json:"registrationBonusPoints"`
	FreeDeliveryBonusPoints  int                           `json:"freeDeliveryBonusPoints"`
	PointsExpireInDays       int                           `json:"pointsExpireInDays"`
	ExpiringPoints           int                           `json:"expiringPoints"`
	NextExpiryAt             *time.Time                    `json:"nextExpiryAt,omitempty"`
	MonthlyReward            StudentMonthlyRewardState     `json:"monthlyReward"`
	Transactions             []StudentPointTransaction     `json:"transactions"`
	PendingIncomingTransfers []StudentPointTransferRequest `json:"pendingIncomingTransfers"`
	PendingOutgoingTransfers []StudentPointTransferRequest `json:"pendingOutgoingTransfers"`
}
