package domain

type Product struct {
	ID          int    `db:"id" json:"id"`
	UserID      string `db:"user_id" json:"user_id"`
	Title       string `db:"title" json:"title"`
	Description string `db:"description" json:"description"`
	Price       string `db:"price" json:"price"`
	ImageUrl    string `db:"image_url" json:"imageUrl"`
}
