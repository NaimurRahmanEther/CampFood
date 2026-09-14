-- +migrate Up

create table if not exists products(
     id serial primary key,
     user_id varchar(255) not null,
     title varchar(255) not null,
     description text,
     price varchar(50) not null,
     image_url varchar(500),
     create_at timestamp with time zone default current_timestamp,
     update_at timestamp with time zone default current_timestamp
);
