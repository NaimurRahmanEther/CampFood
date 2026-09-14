-- +migrate Up

create table if not exists camp_kitchen(
     user_id serial primary key,
     kitchen_name varchar(100) not null,
     location varchar(255) not null,
     manager_phone varchar(11) not null unique check(manager_phone ~ '^[0-9]{11}$'),
     email varchar(255) not null unique,
     password varchar(255) not null,
     phone_number varchar(11) not null unique check(phone_number ~ '^[0-9]{11}$'),
     trade_license varchar(100) not null unique,
     subscription integer default 0,
     status varchar(20) default 'pending',
     create_at timestamp with time zone default current_timestamp,
     update_at timestamp with time zone default current_timestamp
);
