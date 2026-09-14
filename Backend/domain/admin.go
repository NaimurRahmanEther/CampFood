package domain

type Admin struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type KitchenApprovalRequest struct {
	ID     string `json:"id"`
	Type   string `json:"type"`
	Status string `json:"status"`
}

type KitchenApproveLog struct {
	KitchenType    string `json:"kitchen_type"`
	KitchenUserID  string `json:"kitchen_user_id"`
	Action         string `json:"action"`
	AdminEmail     string `json:"admin_email"`
	ApprovalStatus string `json:"approval_status"`
}
