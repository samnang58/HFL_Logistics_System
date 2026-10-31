FROM php:8.4-cli

RUN apt-get update && apt-get install -y \
    git unzip libicu-dev libpng-dev libjpeg62-turbo-dev \
    libfreetype6-dev libzip-dev libxml2-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
       gd intl zip pdo_mysql bcmath \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .

RUN composer install --no-dev --optimize-autoloader \
    --no-interaction --no-progress

CMD ["sh", "-c", "exec php artisan serve --host=0.0.0.0 --port=${PORT:-8080}"]
