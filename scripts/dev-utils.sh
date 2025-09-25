#!/bin/bash

# Development utility scripts for Next.js project

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check for running Next.js processes
check_processes() {
    echo -e "${YELLOW}Checking for running Next.js processes...${NC}"

    # Check for next dev processes
    NEXT_PROCS=$(ps aux | grep -E "(next|npm run dev)" | grep -v grep | wc -l)

    if [ "$NEXT_PROCS" -gt 0 ]; then
        echo -e "${RED}Found $NEXT_PROCS running Next.js processes:${NC}"
        ps aux | grep -E "(next|npm run dev)" | grep -v grep
        return 1
    else
        echo -e "${GREEN}No conflicting processes found.${NC}"
        return 0
    fi
}

# Function to clean up all Next.js processes
cleanup_processes() {
    echo -e "${YELLOW}Cleaning up Next.js processes...${NC}"

    # Kill next dev processes
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true

    # Wait a moment for processes to die
    sleep 2

    # Check if any are still running
    if check_processes; then
        echo -e "${GREEN}All processes cleaned up successfully.${NC}"
    else
        echo -e "${RED}Some processes may still be running. You may need to kill them manually.${NC}"
    fi
}

# Function to clean build cache
clean_cache() {
    echo -e "${YELLOW}Cleaning build cache...${NC}"

    # Remove Next.js build cache
    if [ -d ".next" ]; then
        rm -rf .next
        echo -e "${GREEN}Removed .next directory${NC}"
    fi

    # Remove node_modules cache
    if [ -d "node_modules/.cache" ]; then
        rm -rf node_modules/.cache
        echo -e "${GREEN}Removed node_modules/.cache${NC}"
    fi

    # Remove TypeScript build info
    if [ -f "tsconfig.tsbuildinfo" ]; then
        rm -f tsconfig.tsbuildinfo
        echo -e "${GREEN}Removed tsconfig.tsbuildinfo${NC}"
    fi

    echo -e "${GREEN}Cache cleaning complete.${NC}"
}

# Function to check port availability
check_port() {
    local port=${1:-3000}
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}Port $port is in use by process: $(lsof -Pi :$port -sTCP:LISTEN -t)${NC}"
        return 1
    else
        echo -e "${GREEN}Port $port is available.${NC}"
        return 0
    fi
}

# Function to perform health check
health_check() {
    echo -e "${YELLOW}Performing development environment health check...${NC}"

    # Check processes
    check_processes
    PROC_STATUS=$?

    # Check ports
    check_port 3000
    PORT_STATUS=$?

    # Check for corrupt cache indicators
    if [ -f ".next/routes-manifest.json" ]; then
        echo -e "${GREEN}routes-manifest.json exists${NC}"
    else
        if [ -d ".next" ]; then
            echo -e "${RED}Warning: .next exists but routes-manifest.json is missing (potential corruption)${NC}"
        fi
    fi

    # Overall health
    if [ $PROC_STATUS -eq 0 ] && [ $PORT_STATUS -eq 0 ]; then
        echo -e "${GREEN}✅ Environment appears healthy${NC}"
        return 0
    else
        echo -e "${RED}⚠️  Issues detected. Consider running cleanup or restart commands.${NC}"
        return 1
    fi
}

# Main script logic
case "$1" in
    "check")
        health_check
        ;;
    "cleanup")
        cleanup_processes
        clean_cache
        ;;
    "processes")
        check_processes
        ;;
    "cache")
        clean_cache
        ;;
    "port")
        check_port ${2:-3000}
        ;;
    *)
        echo "Usage: $0 {check|cleanup|processes|cache|port [PORT_NUMBER]}"
        echo ""
        echo "Commands:"
        echo "  check     - Perform full health check"
        echo "  cleanup   - Clean up processes and cache"
        echo "  processes - Check for running Next.js processes"
        echo "  cache     - Clean build cache only"
        echo "  port      - Check if port is available (default: 3000)"
        exit 1
        ;;
esac