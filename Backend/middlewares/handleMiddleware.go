package middlewares

import "net/http"

type Middleware func(http.Handler) http.Handler

type Manager struct {
	middlewares []Middleware
}

func NewManager() *Manager {
	return &Manager{
		middlewares: make([]Middleware, 0),
	}
}

func (m *Manager) Use(middleware ...Middleware) {
	m.middlewares = append(m.middlewares, middleware...)
}

func (m *Manager) Apply(handler http.Handler) http.Handler {
	for i := len(m.middlewares) - 1; i >= 0; i-- {
		handler = m.middlewares[i](handler)
	}
	return handler
}
