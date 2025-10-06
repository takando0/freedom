#!/bin/bash

# ==============================================
# Freedom Broker Game - Mac Setup & Run Script
# ==============================================

set -e  # Exit on error

echo "========================================"
echo "Freedom Broker Game - Setup & Run"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="$HOME/Freedomgame"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for Node.js
echo -e "${YELLOW}Checking Node.js installation...${NC}"
if ! command_exists node; then
    echo -e "${RED}Node.js is not installed!${NC}"
    echo "Please install Node.js from: https://nodejs.org/"
    echo "Or use Homebrew: brew install node"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js found: $NODE_VERSION${NC}"

# Check for npm
if ! command_exists npm; then
    echo -e "${RED}npm is not installed!${NC}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✓ npm found: $NPM_VERSION${NC}"
echo ""

# Check for Git
echo -e "${YELLOW}Checking Git installation...${NC}"
if ! command_exists git; then
    echo -e "${RED}Git is not installed!${NC}"
    echo "Please install Xcode Command Line Tools: xcode-select --install"
    exit 1
fi

GIT_VERSION=$(git --version)
echo -e "${GREEN}✓ Git found: $GIT_VERSION${NC}"
echo ""

# Clone or update repository
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}Project directory exists. Updating...${NC}"
    cd "$PROJECT_DIR"
    
    # Check if it's a git repository
    if [ -d ".git" ]; then
        echo "Pulling latest changes from GitHub..."
        git pull origin main || {
            echo -e "${RED}Failed to pull changes. Please check your git configuration.${NC}"
            echo "You can manually update with: cd $PROJECT_DIR && git pull"
        }
    else
        echo -e "${RED}Directory exists but is not a git repository.${NC}"
        echo "Please remove or rename: $PROJECT_DIR"
        exit 1
    fi
else
    echo -e "${YELLOW}Cloning repository...${NC}"
    git clone https://github.com/takando0/freedom.git "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

echo -e "${GREEN}✓ Repository ready${NC}"
echo ""

# Install server dependencies
echo -e "${YELLOW}Installing server dependencies...${NC}"
cd "$PROJECT_DIR/server"
npm install
echo -e "${GREEN}✓ Server dependencies installed${NC}"
echo ""

# Install client dependencies
echo -e "${YELLOW}Installing client dependencies...${NC}"
cd "$PROJECT_DIR/client"
npm install
echo -e "${GREEN}✓ Client dependencies installed${NC}"
echo ""

# Get local IP address
echo -e "${YELLOW}Getting network information...${NC}"
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
if [ -z "$IP" ]; then
    IP="localhost"
fi
echo -e "${GREEN}✓ Local IP: $IP${NC}"
echo ""

# Kill existing processes on ports 3001 and 5173
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
pkill -f "node src/index.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1
echo -e "${GREEN}✓ Ports cleared${NC}"
echo ""

# Start server in background
echo -e "${YELLOW}Starting server on port 3001...${NC}"
cd "$PROJECT_DIR/server"
PORT=3001 node src/index.js > /tmp/freedom-server.log 2>&1 &
SERVER_PID=$!
sleep 2

# Check if server started
if ps -p $SERVER_PID > /dev/null; then
    echo -e "${GREEN}✓ Server started (PID: $SERVER_PID)${NC}"
else
    echo -e "${RED}✗ Server failed to start. Check /tmp/freedom-server.log${NC}"
    exit 1
fi
echo ""

# Start client in background
echo -e "${YELLOW}Starting client on port 5173...${NC}"
cd "$PROJECT_DIR/client"
npm run dev -- --host > /tmp/freedom-client.log 2>&1 &
CLIENT_PID=$!
sleep 3

# Check if client started
if ps -p $CLIENT_PID > /dev/null; then
    echo -e "${GREEN}✓ Client started (PID: $CLIENT_PID)${NC}"
else
    echo -e "${RED}✗ Client failed to start. Check /tmp/freedom-client.log${NC}"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi
echo ""

# Display access URLs
echo "========================================"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo "========================================"
echo ""
echo "Access the application:"
echo ""
echo "  LED Screen:     http://$IP:5173/led"
echo "  Tablets:        http://$IP:5173/tablet"
echo "  Admin Panel:    http://$IP:5173/admin"
echo ""
echo "  Local (this computer):"
echo "    LED:          http://localhost:5173/led"
echo "    Tablet:       http://localhost:5173/tablet"
echo "    Admin:        http://localhost:5173/admin"
echo ""
echo "Server logs:      /tmp/freedom-server.log"
echo "Client logs:      /tmp/freedom-client.log"
echo ""
echo "To stop the application:"
echo "  kill $SERVER_PID $CLIENT_PID"
echo "  Or run: pkill -f 'node src/index.js' && pkill -f vite"
echo ""
echo "Press Ctrl+C to stop monitoring (app will continue running)"
echo ""

# Monitor logs
echo -e "${YELLOW}Monitoring logs (Ctrl+C to stop)...${NC}"
echo ""
tail -f /tmp/freedom-server.log /tmp/freedom-client.log



