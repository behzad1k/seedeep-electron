#!/bin/bash

# Quick Python Architecture Checker for M1/M2 Macs
# Run this to verify you have the right Python before building

echo "🔍 Python Architecture Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check system architecture
SYSTEM_ARCH=$(uname -m)
echo "🖥️  Your Mac Architecture: $SYSTEM_ARCH"

if [[ "$SYSTEM_ARCH" != "arm64" ]]; then
    echo "ℹ️  You're not on Apple Silicon (M1/M2/M3)"
    echo "   This guide is mainly for Apple Silicon Macs"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐍 Checking Python Installations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Function to check a Python command
check_python() {
    local python_cmd=$1
    local name=$2
    
    if command -v "$python_cmd" &> /dev/null; then
        echo "✅ Found: $name"
        echo "   Path: $(which $python_cmd)"
        
        # Get version
        local version=$($python_cmd --version 2>&1)
        echo "   Version: $version"
        
        # Get architecture
        local arch=$($python_cmd -c "import platform; print(platform.machine())" 2>&1)
        echo "   Architecture: $arch"
        
        # Check if architecture matches system
        if [[ "$SYSTEM_ARCH" == "arm64" ]]; then
            if [[ "$arch" == "arm64" ]]; then
                echo "   ✅ COMPATIBLE with your M1/M2 Mac!"
            else
                echo "   ⚠️  NOT ARM64 - will cause issues on M1/M2!"
            fi
        fi
        
        echo ""
        return 0
    else
        echo "❌ Not found: $name ($python_cmd)"
        echo ""
        return 1
    fi
}

# Check various Python installations
check_python "python3" "python3 (system or default)"
check_python "python3.11" "python3.11"
check_python "python3.10" "python3.10"
check_python "python3.9" "python3.9"
check_python "/opt/homebrew/bin/python3.11" "Homebrew Python 3.11 (ARM64)"
check_python "/opt/homebrew/bin/python3" "Homebrew Python 3 (ARM64)"
check_python "/usr/local/bin/python3" "Local Python 3"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Recommendations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [[ "$SYSTEM_ARCH" == "arm64" ]]; then
    # Check if we have ARM64 Python
    if command -v python3 &> /dev/null; then
        PYTHON_ARCH=$(python3 -c "import platform; print(platform.machine())" 2>&1)
        
        if [[ "$PYTHON_ARCH" == "arm64" ]]; then
            echo "✅ Your default python3 is ARM64 - GOOD!"
            echo ""
            echo "You can proceed with building:"
            echo "  npm run build:backend"
        else
            echo "⚠️  Your default python3 is $PYTHON_ARCH - NOT IDEAL"
            echo ""
            echo "Install ARM64 Python:"
            echo "  arch -arm64 brew install python@3.11"
            echo ""
            echo "Then update build-backend.sh to use:"
            echo "  PYTHON_CMD=\"/opt/homebrew/bin/python3.11\""
        fi
    else
        echo "❌ No python3 found!"
        echo ""
        echo "Install Python via Homebrew:"
        echo "  arch -arm64 brew install python@3.11"
    fi
else
    echo "ℹ️  You're on Intel Mac ($SYSTEM_ARCH)"
    echo "   Just use your default Python"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "For M1/M2 Macs, you MUST use ARM64 Python!"
echo ""
echo "To install ARM64 Python if you don't have it:"
echo "  1. Install Homebrew (if not installed):"
echo "     /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
echo ""
echo "  2. Install ARM64 Python:"
echo "     arch -arm64 brew install python@3.11"
echo ""
echo "  3. Verify it's ARM64:"
echo "     /opt/homebrew/bin/python3.11 -c 'import platform; print(platform.machine())'"
echo "     (should output: arm64)"
echo ""
echo "Then rebuild SeeDeep with the correct Python!"
echo ""
