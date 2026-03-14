#!/bin/bash

# Backend development orchestration script
# Starts Docker infra, waits for health, runs migrations, then starts API + worker

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
API_DIR="$REPO_ROOT/apps/api"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Cleanup function for graceful shutdown
cleanup() {
  echo -e "${YELLOW}Shutting down...${NC}"
  # Kill all child processes
  jobs -p | xargs -r kill 2>/dev/null || true
  wait
  echo -e "${GREEN}Backend stopped.${NC}"
}

trap cleanup SIGINT SIGTERM EXIT

# Step 1: Start Docker Compose
echo -e "${BLUE}[1/5] Starting Docker services...${NC}"
cd "$REPO_ROOT"
docker compose -f docker-compose.test.yml up -d

# Step 2: Wait for Postgres to be healthy
echo -e "${BLUE}[2/5] Waiting for Postgres to be healthy...${NC}"
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if docker exec j16z-test-postgres pg_isready -U postgres -d j16z_test >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Postgres is healthy${NC}"
    break
  fi
  attempt=$((attempt + 1))
  if [ $attempt -eq $max_attempts ]; then
    echo -e "${YELLOW}✗ Postgres health check timed out after ${max_attempts}s${NC}"
    exit 1
  fi
  sleep 1
done

# Step 3: Wait for Redis to be healthy
echo -e "${BLUE}[3/5] Waiting for Redis to be healthy...${NC}"
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if docker exec j16z-test-redis redis-cli ping >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is healthy${NC}"
    break
  fi
  attempt=$((attempt + 1))
  if [ $attempt -eq $max_attempts ]; then
    echo -e "${YELLOW}✗ Redis health check timed out after ${max_attempts}s${NC}"
    exit 1
  fi
  sleep 1
done

# Step 4: Run database migrations
echo -e "${BLUE}[4/5] Running database migrations...${NC}"
cd "$REPO_ROOT"
pnpm --filter @j16z/api run db:migrate
echo -e "${GREEN}✓ Migrations complete${NC}"

# Step 5: Start API server and worker in parallel
echo -e "${BLUE}[5/5] Starting API server and worker...${NC}"
cd "$API_DIR"

# Start API server in background
echo -e "${GREEN}Starting API server on port 3001...${NC}"
pnpm run dev &
API_PID=$!

# Start worker in background
echo -e "${GREEN}Starting BullMQ worker...${NC}"
pnpm run worker &
WORKER_PID=$!

echo -e "${GREEN}✓ Backend stack is running${NC}"
echo -e "${YELLOW}API Server PID: $API_PID${NC}"
echo -e "${YELLOW}Worker PID: $WORKER_PID${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"

# Wait for both processes
wait $API_PID $WORKER_PID
