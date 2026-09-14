package product

import (
	"backend/middlewares"
)

type Handler struct {
	middlewares *middlewares.Middlewares
	service     Service
}

func NewHandler(middlewares *middlewares.Middlewares, service Service) *Handler {
	return &Handler{
		middlewares: middlewares,
		service:     service,
	}
}
