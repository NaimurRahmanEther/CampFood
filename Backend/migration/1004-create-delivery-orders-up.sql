-- +migrate Up

CREATE TABLE IF NOT EXISTS delivery_orders (
    id serial PRIMARY KEY,
    student_user_id varchar(255) NOT NULL,
    student_name varchar(255) NOT NULL,
    student_email varchar(255) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'pending',
    route_mode varchar(20) NOT NULL DEFAULT 'free-first',
    total_items integer NOT NULL DEFAULT 0,
    cash_subtotal integer NOT NULL DEFAULT 0,
    service_charge integer NOT NULL DEFAULT 0,
    cash_payable integer NOT NULL DEFAULT 0,
    points_payable integer NOT NULL DEFAULT 0,
    assigned_to_user_id varchar(255) NOT NULL DEFAULT '',
    assigned_to_name varchar(255) NOT NULL DEFAULT '',
    assigned_plan varchar(20) NOT NULL DEFAULT '',
    assigned_at timestamp with time zone,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT current_timestamp
);

CREATE TABLE IF NOT EXISTS delivery_order_items (
    id serial PRIMARY KEY,
    order_id integer NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
    food_id integer NOT NULL,
    food_name varchar(255) NOT NULL,
    provider_name varchar(255) NOT NULL,
    provider_type varchar(50) NOT NULL,
    quantity integer NOT NULL,
    payment_mode varchar(20) NOT NULL,
    subtotal integer NOT NULL,
    service_charge integer NOT NULL DEFAULT 0,
    points_required integer NOT NULL DEFAULT 0,
    payable_cash integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS delivery_order_incidents (
    id serial PRIMARY KEY,
    order_id integer NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
    incident_type varchar(50) NOT NULL,
    message text NOT NULL,
    actor_name varchar(255) NOT NULL,
    actor_role varchar(50) NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT current_timestamp
);
