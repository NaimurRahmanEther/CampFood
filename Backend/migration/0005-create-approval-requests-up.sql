-- +migrate Up

create table if not exists kitchen_approval_requests(
    id serial primary key,
    kitchen_type varchar(50) not null,
    kitchen_user_id varchar(255) not null,
    action varchar(20) not null,
    admin_email varchar(255) not null,
    comment text,
    created_at timestamp with time zone default current_timestamp
);
