package campkitchen

import "backend/config"

type Handler struct {
	Service Service
	cnf     *config.Config
}

func NewHandler(service Service, cnf *config.Config) *Handler {
	return &Handler{
		Service: service,
		cnf:     cnf,
	}
}
