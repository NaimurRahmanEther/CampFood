package middlewares

import (
	"fmt"
	"net/http"
)

func Huddai(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("Ami ekta middleware")
		next.ServeHTTP(w, r)
	})
}
