#!/bin/sh
set -e

echo "Running database migrations..."
npx drizzle-kit migrate 2>&1 || {
  echo "Warning: Migration failed, starting app anyway"
}

echo "Starting application..."
exec node build/index.js
