package studentkitchen

import (
	"backend/domain"
	"backend/rest/handle/studentkitchen"
)

type Service interface {
	studentkitchen.Service
}

type StudentKitchenRepository interface {
	RegisterStudentKitchen(studentKitchen domain.Student_kitchen) (*domain.Student_kitchen, error)
	LoginStudentKitchen(email, password string) (*domain.Student_kitchen, error)
	GetStudentKitchenByStudentID(studentID string) (*domain.Student_kitchen, error)
}
