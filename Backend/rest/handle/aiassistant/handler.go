package aiassistant

import (
	"backend/middlewares"
)

type Handler struct {
	service     Service
	middlewares *middlewares.Middlewares
}

func NewHandler(service Service, middlewares *middlewares.Middlewares) *Handler {
	return &Handler{
		service:     service,
		middlewares: middlewares,
	}
}
