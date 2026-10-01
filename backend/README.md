# HFL Logistics — Laravel + MySQL Backend

Phase 10 starts the production backend foundation. The React/Vite frontend remains intact.

## Stack
- Laravel 12
- PHP 8.2+
- MySQL 8+
- Laravel Sanctum
- Eloquent ORM
- REST API `/api/v1`

## Setup
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
# create MySQL database: hfl_logistics
php artisan migrate
php artisan db:seed
php artisan serve
```

Default development admin from the seeder:
- email: `admin@hfl-logistics.com`
- password: `change-me`

Change this immediately outside local development.

## API
Authentication:
- POST `/api/v1/auth/login`
- POST `/api/v1/auth/logout`
- GET `/api/v1/auth/me`

Core:
- customers, packages, shipments, pricing, warehouses
- tracking
- quotations, invoices, payments
- income, expenses
- CRM leads
- dashboard and reports

## Finance invariant
A confirmed payment is processed in one database transaction: payment creation → invoice paid/outstanding update → income creation. `idempotency_key` prevents duplicate payment processing.

## Important
The container used to prepare this package does not have Composer installed, so dependency installation and a full `php artisan` boot/migration test could not be run here. PHP syntax validation was performed on the generated PHP sources. Run `composer install` and `php artisan migrate` on your Mac before connecting the frontend.
