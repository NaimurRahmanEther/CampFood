package food

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func saveUploadedImageIfProvided(r *http.Request, fieldName string) (string, error) {
	file, header, err := r.FormFile(fieldName)
	if err != nil {
		if errors.Is(err, http.ErrMissingFile) {
			return "", nil
		}
		return "", err
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
		return "", errors.New("image must be .jpg, .jpeg, .png, or .webp")
	}

	err = os.MkdirAll(filepath.Join("uploads", "foods"), 0755)
	if err != nil {
		return "", err
	}

	fileName := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	dstPath := filepath.Join("uploads", "foods", fileName)
	dstFile, err := os.Create(dstPath)
	if err != nil {
		return "", err
	}
	defer dstFile.Close()

	_, err = io.Copy(dstFile, file)
	if err != nil {
		return "", err
	}

	return "/uploads/foods/" + fileName, nil
}
