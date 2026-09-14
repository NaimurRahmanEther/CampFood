package aiassistant

import (
	assistantsvc "backend/aiassistant"
	"backend/utils"
)

type Service interface {
	Chat(user utils.Payload, message string, history []assistantsvc.ChatMessage) (*assistantsvc.ChatResponse, error)
}
