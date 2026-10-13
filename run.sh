#!/usr/bin/env bash

# ==============================================================================
# AutoStat - Unified Runner Script
# Concurrently runs:
#   1. Backend API (FastAPI :8000)
#   2. Frontend Web Server (Next.js :3000)
#   3. Electron Desktop App Window
#
# Flags:
#   ./run.sh          -> Launches Backend + Frontend + Electron App (Default)
#   ./run.sh --web    -> Launches Backend + Frontend in Browser mode (No Electron)
#   ./run.sh --docker -> Launches entire stack in Docker Compose
# ==============================================================================

set -e

# Color definitions
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo -e "${BLUE}======================================================${NC}"
echo -e "${CYAN}        AutoStat Statistics Platform Runner          ${NC}"
echo -e "${BLUE}======================================================${NC}"

# Check for Docker mode
if [[ "$1" == "--docker" ]]; then
  echo -e "${YELLOW}Starting complete cluster via Docker Compose...${NC}"
  docker compose -f docker/docker-compose.yml up --build
  exit 0
fi

LAUNCH_ELECTRON=true
if [[ "$1" == "--web" || "$1" == "--browser" ]]; then
  LAUNCH_ELECTRON=false
fi

# Check Python environment
if ! command -v python3 &> /dev/null; then
  echo -e "${RED}Error: python3 is not installed or not in PATH.${NC}"
  exit 1
fi

# Check Node environment
if ! command -v npm &> /dev/null; then
  echo -e "${RED}Error: npm is not installed or not in PATH.${NC}"
  exit 1
fi

# PIDs storage for graceful shutdown
API_PID=""
FRONTEND_PID=""
ELECTRON_PID=""

cleanup() {
  echo -e "\n${YELLOW}Shutting down AutoStat services...${NC}"
  if [ -n "$ELECTRON_PID" ] && kill -0 "$ELECTRON_PID" 2>/dev/null; then
    kill "$ELECTRON_PID" 2>/dev/null || true
  fi
  if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo -e "Stopping Next.js frontend (PID: $FRONTEND_PID)..."
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  if [ -n "$API_PID" ] && kill -0 "$API_PID" 2>/dev/null; then
    echo -e "Stopping FastAPI backend (PID: $API_PID)..."
    kill "$API_PID" 2>/dev/null || true
  fi
  echo -e "${GREEN}All services stopped cleanly.${NC}"
  exit 0
}

# Trap SIGINT (Ctrl+C), SIGTERM, and EXIT
trap cleanup SIGINT SIGTERM EXIT

# 1. Start Backend (FastAPI Gateway)
echo -e "\n${GREEN}[1/3] Starting Backend API (FastAPI on :8000)...${NC}"
export PYTHONPATH="$ROOT_DIR"
python3 -m uvicorn services.api.app.main:app --host 127.0.0.1 --port 8000 --reload > /dev/null 2>&1 &
API_PID=$!

# Brief wait to ensure backend starts
sleep 1

# 2. Start Frontend (Next.js)
echo -e "\n${GREEN}[2/3] Starting Frontend (Next.js on :3000)...${NC}"
cd "$ROOT_DIR/frontend"
npm run dev -- -p 3000 > /dev/null 2>&1 &
FRONTEND_PID=$!
cd "$ROOT_DIR"

# Wait for Next.js to become ready
echo -e "Waiting for Next.js server to be ready..."
for i in {1..30}; do
  if curl -s http://127.0.0.1:3000 > /dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

echo -e "\n${BLUE}======================================================${NC}"
echo -e "${GREEN}✓ All AutoStat services are active!${NC}"
echo -e "  • ${CYAN}API Server (Backend):${NC}  ${GREEN}http://localhost:8000${NC}"
echo -e "  • ${CYAN}Interactive API Docs:${NC}  ${GREEN}http://localhost:8000/docs${NC}"
echo -e "  • ${CYAN}Web UI (Frontend):${NC}    ${GREEN}http://localhost:3000${NC}"
echo -e "${BLUE}======================================================${NC}"

# 3. Start Electron Desktop App
if [ "$LAUNCH_ELECTRON" = true ]; then
  echo -e "\n${GREEN}[3/3] Launching Electron Desktop Application...${NC}"
  cd "$ROOT_DIR/frontend"
  NODE_ENV=development ELECTRON_START_URL=http://localhost:3000 npx electron . &
  ELECTRON_PID=$!
  cd "$ROOT_DIR"
  echo -e "${YELLOW}Closing the Electron window or pressing [Ctrl+C] will stop all services.${NC}\n"
  # Wait for Electron to close
  wait "$ELECTRON_PID" 2>/dev/null || true
else
  echo -e "\n${YELLOW}Running in browser mode. Press [Ctrl+C] to stop all services.${NC}\n"
  wait "$API_PID" "$FRONTEND_PID" 2>/dev/null || true
fi
