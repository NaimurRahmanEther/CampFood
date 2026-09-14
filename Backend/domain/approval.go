package domain

import "time"

type ApprovalRequest struct {
	ID             string            `json:"id"`
	Type           string            `json:"type"`
	ApplicantName  string            `json:"applicantName"`
	ApplicantEmail string            `json:"applicantEmail"`
	Status         string            `json:"status"`
	SubmittedAt    time.Time         `json:"submittedAt"`
	ReviewedAt     *time.Time        `json:"reviewedAt,omitempty"`
	ReviewNote     string            `json:"reviewNote,omitempty"`
	Payload        map[string]string `json:"payload"`
}
