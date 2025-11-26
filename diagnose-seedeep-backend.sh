#!/bin/bash

# SeeDeep Backend Diagnostic Script
# Run this to diagnose why the backend isn't starting on your M1/M2 Mac

set +e  # Don't exit on errors, we want to see all issues

echo "╔════════════════════════════════════════════════════════════╗"
echo "║        SeeDeep Backend Diagnostic Tool                    ║"
echo "║        For M1/M2 Mac Troubleshooting                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

print_info() {
    echo -e "ℹ️  INFO: $1"
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. SYSTEM INFORMATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Architecture: $(uname -m)"
echo "   macOS Version: $(sw_vers -productVersion)"
echo "   Chip: $(sysctl -n machdep.cpu.brand_string)"
echo ""

if [[ "$(uname -m)" != "arm64" ]]; then
    print_warning "Not running on Apple Silicon (M1/M2/M3)"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. APPLICATION LOCATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

APP_PATH="/Applications/SeeDeep.app"
BACKEND_PATH="$APP_PATH/Contents/Resources/backend"

if [ -d "$APP_PATH" ]; then
    print_status 0 "SeeDeep.app found at $APP_PATH"
else
    print_status 1 "SeeDeep.app not found at $APP_PATH"
    echo ""
    echo "Please install SeeDeep first, or specify the path:"
    read -p "Enter path to SeeDeep.app: " APP_PATH
    BACKEND_PATH="$APP_PATH/Contents/Resources/backend"
fi

echo ""

if [ ! -d "$BACKEND_PATH" ]; then
    print_status 1 "Backend directory not found at $BACKEND_PATH"
    echo ""
    echo "❌ CRITICAL: Backend files are missing from the app bundle!"
    echo ""
    echo "This means the app was not built correctly. You need to:"
    echo "1. Rebuild the backend: npm run build:backend"
    echo "2. Rebuild the app: npm run electron:build:mac:unsigned"
    exit 1
fi

print_status 0 "Backend directory found"

cd "$BACKEND_PATH" || exit 1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. BACKEND FILE STRUCTURE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for essential files
check_file() {
    if [ -f "$1" ]; then
        print_status 0 "$1 exists"
        return 0
    else
        print_status 1 "$1 is missing"
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        print_status 0 "$1/ directory exists"
        return 0
    else
        print_status 1 "$1/ directory is missing"
        return 1
    fi
}

check_file "start-backend"
check_file "main.py"
check_file ".env"
check_dir "app"
check_dir "python-env"
check_dir "python-env/bin"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. STARTUP SCRIPT CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "start-backend" ]; then
    PERMS=$(stat -f "%OLp" start-backend)
    if [ -x "start-backend" ]; then
        print_status 0 "start-backend is executable (permissions: $PERMS)"
    else
        print_status 1 "start-backend is NOT executable (permissions: $PERMS)"
        echo ""
        print_info "Attempting to fix permissions..."
        chmod +x start-backend
        if [ $? -eq 0 ]; then
            print_status 0 "Fixed: Made start-backend executable"
        else
            print_status 1 "Could not fix permissions"
        fi
    fi
    
    echo ""
    print_info "First 10 lines of start-backend:"
    head -10 start-backend | sed 's/^/     /'
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. PYTHON ENVIRONMENT CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PYTHON_BIN="python-env/bin/python3"

if [ -f "$PYTHON_BIN" ]; then
    print_status 0 "Python binary exists"
    
    # Check architecture
    PYTHON_ARCH=$(file "$PYTHON_BIN" | grep -o 'arm64\|x86_64')
    SYSTEM_ARCH=$(uname -m)
    
    echo "   System Architecture: $SYSTEM_ARCH"
    echo "   Python Architecture: $PYTHON_ARCH"
    
    if [[ "$SYSTEM_ARCH" == "arm64" && "$PYTHON_ARCH" == "x86_64" ]]; then
        print_status 1 "ARCHITECTURE MISMATCH! (This is likely the problem)"
        echo ""
        echo "   🔧 SOLUTION: You need to rebuild the backend with ARM64 Python"
        echo ""
        echo "   Steps to fix:"
        echo "   1. Make sure you have ARM64 Python installed:"
        echo "      arch -arm64 brew install python@3.11"
        echo ""
        echo "   2. Verify it's ARM64:"
        echo "      /opt/homebrew/bin/python3.11 -c 'import platform; print(platform.machine())'"
        echo "      (should output: arm64)"
        echo ""
        echo "   3. Rebuild the backend:"
        echo "      cd /path/to/seedeep/project"
        echo "      rm -rf build/"
        echo "      ./build-backend.sh"
        echo ""
        echo "   4. Rebuild the app:"
        echo "      npm run build:frontend"
        echo "      npm run electron:build:mac:unsigned"
        echo ""
    elif [[ "$SYSTEM_ARCH" == "$PYTHON_ARCH" ]]; then
        print_status 0 "Architecture matches! ($PYTHON_ARCH)"
    fi
    
    # Check if executable
    PYTHON_PERMS=$(stat -f "%OLp" "$PYTHON_BIN")
    if [ -x "$PYTHON_BIN" ]; then
        print_status 0 "Python is executable (permissions: $PYTHON_PERMS)"
    else
        print_status 1 "Python is NOT executable (permissions: $PYTHON_PERMS)"
        echo ""
        print_info "Attempting to fix permissions..."
        chmod +x "$PYTHON_BIN"
        if [ $? -eq 0 ]; then
            print_status 0 "Fixed: Made Python executable"
        else
            print_status 1 "Could not fix permissions"
        fi
    fi
    
    # Try to run Python
    echo ""
    print_info "Testing Python execution..."
    "./$PYTHON_BIN" --version 2>&1
    if [ $? -eq 0 ]; then
        print_status 0 "Python runs successfully"
        
        # Check Python arch from inside Python
        ACTUAL_ARCH=$("./$PYTHON_BIN" -c "import platform; print(platform.machine())" 2>&1)
        echo "   Python reports architecture: $ACTUAL_ARCH"
    else
        print_status 1 "Python failed to run"
        echo ""
        print_info "Error output:"
        "./$PYTHON_BIN" --version 2>&1 | sed 's/^/     /'
    fi
else
    print_status 1 "Python binary not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. PYTHON DEPENDENCIES CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "$PYTHON_BIN" ] && [ -x "$PYTHON_BIN" ]; then
    # Activate venv and check packages
    source python-env/bin/activate 2>/dev/null
    
    if [ $? -eq 0 ]; then
        print_status 0 "Virtual environment activated"
        
        # Check for key packages
        echo ""
        print_info "Checking key dependencies..."
        
        for pkg in fastapi uvicorn torch opencv-python sqlalchemy; do
            python3 -c "import $pkg" 2>/dev/null
            if [ $? -eq 0 ]; then
                VERSION=$(python3 -c "import $pkg; print(getattr($pkg, '__version__', 'unknown'))" 2>/dev/null)
                echo "   ✅ $pkg ($VERSION)"
            else
                echo "   ❌ $pkg - NOT INSTALLED"
            fi
        done
        
        deactivate 2>/dev/null
    else
        print_status 1 "Could not activate virtual environment"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. PORT CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PORT=8000
PORT_IN_USE=$(lsof -ti:$PORT 2>/dev/null)

if [ -z "$PORT_IN_USE" ]; then
    print_status 0 "Port $PORT is available"
else
    print_status 1 "Port $PORT is already in use by process: $PORT_IN_USE"
    echo ""
    print_info "To free the port, run:"
    echo "   kill -9 $PORT_IN_USE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8. MANUAL BACKEND START TEST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
print_info "Attempting to start backend manually..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Try to run the backend
timeout 10 ./start-backend 2>&1 || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    DIAGNOSIS COMPLETE                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 SUMMARY:"
echo ""

if [[ "$(uname -m)" == "arm64" && "$PYTHON_ARCH" == "x86_64" ]]; then
    echo "🔴 CRITICAL ISSUE FOUND: Architecture Mismatch"
    echo ""
    echo "Your Mac is ARM64 (Apple Silicon M1/M2/M3) but the Python"
    echo "environment was built with x86_64 (Intel) Python."
    echo ""
    echo "👉 SOLUTION: Rebuild with ARM64 Python"
    echo ""
    echo "See the detailed instructions in DEBUGGING_M1_M2_MACS.md"
else
    echo "Check the output above for any ❌ FAIL messages"
    echo ""
    echo "Common issues:"
    echo "- Missing files in the backend directory"
    echo "- Python not executable"
    echo "- Port 8000 already in use"
    echo "- Missing dependencies"
fi

echo ""
echo "Need help? Check:"
echo "  - Console.app logs (search for 'SeeDeep' or 'Backend')"
echo "  - DEBUGGING_M1_M2_MACS.md for detailed solutions"
echo "  - Run this script again after rebuilding"
echo ""
