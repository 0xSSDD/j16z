#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.test.yml"

if [[ -f "$ROOT_DIR/.env.test" ]]; then
  set -a
  source "$ROOT_DIR/.env.test"
  set +a
fi

TEST_DATABASE_URL="${TEST_DATABASE_URL:-postgresql://postgres:postgres@localhost:5433/j16z_test}"
TEST_REDIS_URL="${TEST_REDIS_URL:-redis://localhost:6380}"

cleanup() {
  docker compose -f "$COMPOSE_FILE" down --remove-orphans
}

trap cleanup EXIT INT TERM

echo '[e2e] Starting Postgres + Redis test services...'
docker compose -f "$COMPOSE_FILE" up -d --wait postgres redis

echo '[e2e] Running Drizzle migrations against test database...'
SUPABASE_DB_URL_SERVICE_ROLE="$TEST_DATABASE_URL" \
  DATABASE_URL="$TEST_DATABASE_URL" \
  pnpm --filter @j16z/api db:migrate

echo '[e2e] Running API backend tests with Docker test DB...'
TEST_DATABASE_URL="$TEST_DATABASE_URL" \
  DATABASE_URL="$TEST_DATABASE_URL" \
  SUPABASE_DB_URL_SERVICE_ROLE="$TEST_DATABASE_URL" \
  TEST_REDIS_URL="$TEST_REDIS_URL" \
  pnpm --filter @j16z/api exec vitest run --config vitest.config.ts

echo '[e2e] Running LangExtract worker tests with Docker test DB...'
(
  cd "$ROOT_DIR/apps/langextract"
  TEST_DATABASE_URL="$TEST_DATABASE_URL" \
    DATABASE_URL="$TEST_DATABASE_URL" \
    REDIS_URL="$TEST_REDIS_URL" \
    python3 -m pytest tests/test_worker.py
)

echo '[e2e] Test harness completed successfully.'
