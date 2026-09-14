package student

import "backend/domain"

type Service interface {
	RegisterStudent(student domain.Student) (*domain.Student, error)
	LoginStudent(studentId, email, password string) (*domain.Student, error)
	UpdateStudentProfile(userID, fullName string) (*domain.Student, error)
}
