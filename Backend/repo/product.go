package repo

import (
	"backend/domain"

	"backend/products"

	"github.com/jmoiron/sqlx"
)

type ProductRepository interface {
	products.ProductRepository
}

type productRepo struct {
	db *sqlx.DB
}

func NewProductRepo(db *sqlx.DB) ProductRepository {
	repo := &productRepo{
		db: db,
	}

	return repo
}

func (r *productRepo) Store(p domain.Product) (*domain.Product, error) {
	query := `INSERT INTO products (user_id, title, description, price, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING id`
	var id int
	err := r.db.QueryRow(query, p.UserID, p.Title, p.Description, p.Price, p.ImageUrl).Scan(&id)
	if err != nil {
		return nil, err
	}
	p.ID = id
	return &p, nil
}

func (r *productRepo) List() ([]*domain.Product, error) {
	var product []*domain.Product
	query := `SELECT id, user_id, title, description, price, image_url FROM products`
	err := r.db.Select(&product, query)
	return product, err
}
func (r *productRepo) GetByID(id int) (*domain.Product, error) {
	query := `SELECT id, user_id, title, description, price, image_url FROM products WHERE id = $1`
	var product domain.Product
	err := r.db.Get(&product, query, id)
	if err != nil {
		return nil, err
	}
	return &product, nil
}

func (r *productRepo) Update(product domain.Product) (*domain.Product, error) {
	query := `UPDATE products SET title = $1, description = $2, price = $3, image_url = $4 WHERE id = $5`
	row := r.db.QueryRow(query, product.Title, product.Description, product.Price, product.ImageUrl, product.ID)
	err := row.Err()
	if err != nil {
		return nil, err
	}
	return &product, nil
}

func (r *productRepo) Delete(id int) error {
	query := `DELETE FROM products WHERE id = $1`
	_, err := r.db.Exec(query, id)
	if err != nil {
		return err
	}
	return nil
}
