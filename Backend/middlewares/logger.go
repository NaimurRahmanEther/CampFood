package middlewares

import (
	"log"
	"net/http"
	"time"
)

func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		log.Printf(r.Method, r.URL.Path, time.Since(start))
		next.ServeHTTP(w, r)
	})
}
