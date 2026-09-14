package student

import (
	"backend/domain"
	"backend/rest/handle/student"
)

type Service interface {
	student.Service
}

type StudentRepository interface {
	RegisterStudent(student domain.Student) (*domain.Student, error)
	LoginStudent(studentId, email, password string) (*domain.Student, error)
	UpdateStudentProfile(userID, fullName string) (*domain.Student, error)
}
