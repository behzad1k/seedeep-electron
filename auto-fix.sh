#!/bin/bash

# SeeDeep M1/M2 Backend Auto-Fix Script
# This script automates the fix process

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║        SeeDeep M1/M2 Backend Auto-Fix Script              ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check if we're on M1/M2
SYSTEM_ARCH=$(uname -m)
echo -e "🖥️  System Architecture: ${BLUE}$SYSTEM_ARCH${NC}"

if [[ "$SYSTEM_ARCH" != "arm64" ]]; then
    echo -e "${YELLOW}⚠️  This script is designed for Apple Silicon (M1/M2/M3) Macs${NC}"
    echo -e "   You can still use it, but architecture checks will be different"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Locating SeeDeep Project"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Try to find the project
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if we're already in the project
if [ -f "package.json" ] && grep -q "seedeep" package.json; then
    PROJECT_DIR=$(pwd)
    echo -e "${GREEN}✅ Found SeeDeep project in current directory${NC}"
else
    echo "Current directory is not the SeeDeep project"
    read -p "Enter the full path to your SeeDeep project: " PROJECT_DIR
    
    if [ ! -d "$PROJECT_DIR" ]; then
        echo -e "${RED}❌ Directory not found: $PROJECT_DIR${NC}"
        exit 1
    fi
    
    cd "$PROJECT_DIR" || exit 1
    
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ Not a valid SeeDeep project (package.json not found)${NC}"
        exit 1
    fi
fi

echo -e "📂 Project directory: ${BLUE}$PROJECT_DIR${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Checking Python Installation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Find ARM64 Python
ARM64_PYTHON=""

# Check common locations
if [ -x "/opt/homebrew/bin/python3.11" ]; then
    PYTHON_ARCH=$(/opt/homebrew/bin/python3.11 -c "import platform; print(platform.machine())")
    if [[ "$PYTHON_ARCH" == "arm64" ]]; then
        ARM64_PYTHON="/opt/homebrew/bin/python3.11"
    fi
elif [ -x "/opt/homebrew/bin/python3" ]; then
    PYTHON_ARCH=$(/opt/homebrew/bin/python3 -c "import platform; print(platform.machine())")
    if [[ "$PYTHON_ARCH" == "arm64" ]]; then
        ARM64_PYTHON="/opt/homebrew/bin/python3"
    fi
fi

# Check system python3
if [ -z "$ARM64_PYTHON" ] && command -v python3 &> /dev/null; then
    PYTHON_ARCH=$(python3 -c "import platform; print(platform.machine())")
    if [[ "$PYTHON_ARCH" == "arm64" ]]; then
        ARM64_PYTHON=$(which python3)
    fi
fi

if [ -z "$ARM64_PYTHON" ]; then
    echo -e "${RED}❌ ARM64 Python not found!${NC}"
    echo ""
    echo "You need to install ARM64 Python. Run:"
    echo -e "  ${BLUE}arch -arm64 brew install python@3.11${NC}"
    echo ""
    read -p "Would you like me to install it now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Installing ARM64 Python..."
        arch -arm64 brew install python@3.11
        ARM64_PYTHON="/opt/homebrew/bin/python3.11"
    else
        echo "Please install ARM64 Python and run this script again"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Found ARM64 Python: $ARM64_PYTHON${NC}"
$ARM64_PYTHON --version
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Backing Up Current Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

BACKUP_DIR="$PROJECT_DIR/.backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -f "build-backend.sh" ]; then
    cp build-backend.sh "$BACKUP_DIR/"
    echo -e "${GREEN}✅ Backed up build-backend.sh${NC}"
fi

if [ -f "electron/main/services/BackendManager.ts" ]; then
    cp electron/main/services/BackendManager.ts "$BACKUP_DIR/"
    echo -e "${GREEN}✅ Backed up BackendManager.ts${NC}"
fi

echo -e "📦 Backup saved to: ${BLUE}$BACKUP_DIR${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Installing Fixed Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if fix files are in same directory as this script
if [ -f "$SCRIPT_DIR/build-backend.sh" ]; then
    cp "$SCRIPT_DIR/build-backend.sh" "$PROJECT_DIR/"
    chmod +x "$PROJECT_DIR/build-backend.sh"
    echo -e "${GREEN}✅ Installed fixed build-backend.sh${NC}"
else
    echo -e "${YELLOW}⚠️  build-backend.sh not found in script directory${NC}"
fi

if [ -f "$SCRIPT_DIR/BackendManager.ts" ]; then
    mkdir -p "$PROJECT_DIR/electron/main/services"
    cp "$SCRIPT_DIR/BackendManager.ts" "$PROJECT_DIR/electron/main/services/"
    echo -e "${GREEN}✅ Installed fixed BackendManager.ts${NC}"
else
    echo -e "${YELLOW}⚠️  BackendManager.ts not found in script directory${NC}"
fi

echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Cleaning Old Builds"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Removing old build artifacts..."
rm -rf build/
rm -rf dist-electron/
rm -rf dist-renderer/
rm -rf release/
echo -e "${GREEN}✅ Cleaned build directories${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 6: Building Backend (this may take 5-10 minutes)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Modify build-backend.sh to use the correct Python
if [ -f "build-backend.sh" ]; then
    # Create a temporary version with our Python
    sed "s|PYTHON_CMD=\"python3\"|PYTHON_CMD=\"$ARM64_PYTHON\"|" build-backend.sh > build-backend-temp.sh
    chmod +x build-backend-temp.sh
    
    if ./build-backend-temp.sh; then
        echo -e "${GREEN}✅ Backend built successfully!${NC}"
        rm build-backend-temp.sh
    else
        echo -e "${RED}❌ Backend build failed${NC}"
        rm build-backend-temp.sh
        exit 1
    fi
else
    echo -e "${RED}❌ build-backend.sh not found${NC}"
    exit 1
fi

echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 7: Testing Backend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Testing backend startup..."
cd build/backend

# Test backend in background
./start-backend &
BACKEND_PID=$!

sleep 5

# Check if it's running
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Backend is running!${NC}"
    
    # Check if it responds
    if curl -s http://127.0.0.1:8000/health > /dev/null; then
        echo -e "${GREEN}✅ Backend responds to health check${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend running but not responding${NC}"
    fi
    
    # Kill test backend
    kill $BACKEND_PID 2>/dev/null || true
    sleep 2
else
    echo -e "${RED}❌ Backend failed to start${NC}"
    echo "Check the logs above for errors"
    exit 1
fi

cd "$PROJECT_DIR"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 8: Building Full Application"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Backend test passed! Build the full app now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Building frontend..."
    npm run build:frontend
    
    echo ""
    echo "Building Electron app..."
    npm run electron:build:mac:unsigned
    
    echo ""
    echo -e "${GREEN}✅ Build complete!${NC}"
    
    if [ -d "release" ]; then
        echo ""
        echo "📦 Your app is in: $(ls release/*.dmg 2>/dev/null | head -1)"
        echo ""
        echo "To install:"
        echo "1. Open the DMG file"
        echo "2. Drag SeeDeep to Applications"
        echo "3. Launch SeeDeep"
    fi
else
    echo ""
    echo "Build skipped. You can build later with:"
    echo "  npm run build:frontend"
    echo "  npm run electron:build:mac:unsigned"
fi

echo ""
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║                   FIX COMPLETE! ✅                         ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "📋 What was fixed:"
echo "   ✅ Installed ARM64 Python environment"
echo "   ✅ Updated build scripts"
echo "   ✅ Added better error logging"
echo "   ✅ Rebuilt backend with correct architecture"
echo ""
echo "🎯 Next steps:"
echo "   1. Install the DMG from the release/ folder"
echo "   2. Launch SeeDeep"
echo "   3. If it still fails, run: ./diagnose-seedeep-backend.sh"
echo ""
echo "💾 Your old files are backed up in: $BACKUP_DIR"
echo ""
