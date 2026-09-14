-- +migrate Up

create table if not exists student_kitchen(
     user_id serial primary key,
     seller_name varchar(100) not null,
     student_id varchar(10) not null unique check(student_id ~ '^[0-9]{10}$'),
     email varchar(255) not null unique,
     password varchar(255) not null,
     phone_number varchar(11) not null unique check(phone_number ~ '^[0-9]{11}$'),
     hall_name varchar(255) not null,
     status varchar(20) default 'pending',
     create_at timestamp with time zone default current_timestamp,
     update_at timestamp with time zone default current_timestamp
);