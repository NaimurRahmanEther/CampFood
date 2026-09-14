create table users(
id serial primary key,
username varchar(100) not null,
email varchar(255) not null unique,
password varchar(255) not null,
is_shop_owner boolean not null default false,
create_at timestamp with time zone default current_timestamp,
update_at timestamp with time zone default current_timestamp
);