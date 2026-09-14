package utils

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"time"
)

type Header struct {
	Alg string `json:"alg"`
	Typ string `json:"typ"`
}

type Payload struct {
	UserID      string `json:"user_id"`
	Type        string `json:"type"` // "admin", "student", "student_kitchen", "hall_kitchen", "camp_kitchen"
	FullName    string `json:"full_name"`
	StudentId   string `json:"student_id"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phone_number"`
	HallName    string `json:"hall_name"`
	Department  string `json:"department"`
	ExpiresAt   int64  `json:"exp"`
}

const jwtDefaultValidity = 7 * 24 * time.Hour

func CreateJwt(secret string, payload Payload) (string, error) {
	if payload.ExpiresAt <= 0 {
		payload.ExpiresAt = time.Now().UTC().Add(jwtDefaultValidity).Unix()
	}

	header := Header{
		Alg: "HS256",
		Typ: "JWT",
	}
	headerBytes, err := json.Marshal(header)
	if err != nil {
		return "", err
	}
	headerB64 := Base64Encode(headerBytes)
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	payloadB64 := Base64Encode(payloadBytes)
	message := headerB64 + "." + payloadB64

	byteSecret := []byte(secret)
	byteMessage := []byte(message)
	signature := hmac.New(sha256.New, byteSecret)
	signature.Write(byteMessage)
	signatureBytes := signature.Sum(nil)
	signatureB64 := Base64Encode(signatureBytes)

	return message + "." + signatureB64, nil
}

func Base64Encode(data []byte) string {
	return base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString(data)
}

func Base64Decode(data string) ([]byte, error) {
	return base64.URLEncoding.WithPadding(base64.NoPadding).DecodeString(data)
}
