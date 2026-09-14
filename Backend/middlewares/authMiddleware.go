package middlewares

import (
	"backend/utils"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

func (m *Middlewares) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if header == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		headerParts := strings.Fields(header)

		if len(headerParts) != 2 || !strings.EqualFold(headerParts[0], "Bearer") {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		token := headerParts[1]
		tokenParts := strings.Split(token, ".")
		if len(tokenParts) != 3 {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		tokenHeaderB64 := tokenParts[0]
		tokenPayloadB64 := tokenParts[1]
		tokenSignatureB64 := tokenParts[2]

		message := tokenHeaderB64 + "." + tokenPayloadB64

		byteSecret := []byte(m.cnf.JwtSecret)
		byteMessage := []byte(message)

		signature := hmac.New(sha256.New, byteSecret)
		signature.Write(byteMessage)
		signatureBytes := signature.Sum(nil)
		providedSignatureBytes, err := utils.Base64Decode(tokenSignatureB64)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		if !hmac.Equal(signatureBytes, providedSignatureBytes) {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		payloadBytes, err := utils.Base64Decode(tokenPayloadB64)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var payload utils.Payload
		err = json.Unmarshal(payloadBytes, &payload)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		if payload.ExpiresAt <= 0 || payload.ExpiresAt <= time.Now().UTC().Unix() {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Set payload in context
		ctx := context.WithValue(r.Context(), "user", payload)
		r = r.WithContext(ctx)

		next.ServeHTTP(w, r)
	})
}
