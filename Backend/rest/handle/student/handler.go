package student

import (
	"backend/config"
	"backend/middlewares"
)

type Handler struct {
	Service     Service
	cnf         *config.Config
	middlewares *middlewares.Middlewares
}

func NewHandler(service Service, cnf *config.Config, middlewares *middlewares.Middlewares) *Handler {
	return &Handler{
		Service:     service,
		cnf:         cnf,
		middlewares: middlewares,
	}
}
