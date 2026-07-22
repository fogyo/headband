#!/bin/bash
set -e

# Если вы используете PostgreSQL, установите pg_isready (см. Dockerfile ниже)
# Ожидаем, пока база не станет доступной
if [ -n "$DATABASE_HOST" ] && [ -n "$DATABASE_PORT" ] && [ -n "$DATABASE_USER" ]; then
    echo "Waiting for database $DATABASE_HOST:$DATABASE_PORT..."
    until pg_isready -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER"; do
        >&2 echo "Database is unavailable - sleeping"
        sleep 2
    done
    >&2 echo "Database is up - continuing"
fi

# Переходим в папку, где лежат alembic.ini и модели
cd /app/backend

# Запускаем миграции
echo "Running Alembic migrations..."
alembic upgrade head

# Возвращаемся обратно (необязательно)
cd /app

# Запускаем основное приложение (передаём управление)
exec "$@"