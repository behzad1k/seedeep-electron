#!/bin/bash

# Enable error reporting
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "========================================="
echo "🚀 Starting SeeDeep Backend"
echo "========================================="
echo "📂 Working directory: $DIR"
echo "📍 Architecture: $(uname -m)"
echo "📍 Shell: $SHELL"
echo "========================================="

# Check for virtual environment
if [ ! -d "$DIR/python-env" ]; then
    echo "❌ ERROR: python-env directory not found at $DIR/python-env"
    exit 1
fi

# Check for activate script
if [ ! -f "$DIR/python-env/bin/activate" ]; then
    echo "❌ ERROR: activate script not found"
    exit 1
fi

# CRITICAL FIX: Completely isolate the virtual environment from system Python
# Unset ALL Python-related environment variables
unset PYTHONPATH
unset PYTHONHOME
unset PYTHON_VERSION
unset PYTHON_CONFIG

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source "$DIR/python-env/bin/activate"

if [ $? -ne 0 ]; then
    echo "❌ ERROR: Failed to activate virtual environment"
    exit 1
fi

echo "✅ Virtual environment activated"

# Verify we're using the venv Python
ACTIVE_PYTHON=$(which python3)
echo "🐍 Active Python: $ACTIVE_PYTHON"

# Check it's the venv python
if [[ "$ACTIVE_PYTHON" != "$DIR/python-env/bin/python3" ]]; then
    echo "⚠️  WARNING: Not using venv Python!"
    echo "   Expected: $DIR/python-env/bin/python3"
    echo "   Got: $ACTIVE_PYTHON"
fi

python3 --version
echo "🐍 Python architecture: $(python3 -c 'import platform; print(platform.machine())')"

# CRITICAL FIX: Force Python to use only the venv's site-packages
export PYTHONNOUSERSITE=1  # Ignore user site-packages
export PYTHONDONTWRITEBYTECODE=1  # Don't write .pyc files

# Change to backend directory
cd "$DIR"

if [ $? -ne 0 ]; then
    echo "❌ ERROR: Failed to change to directory $DIR"
    exit 1
fi

# Check for main.py
if [ ! -f "$DIR/main.py" ]; then
    echo "❌ ERROR: main.py not found at $DIR/main.py"
    ls -la "$DIR"
    exit 1
fi

echo "✅ Found main.py"

# Check for required directories
if [ ! -d "$DIR/app" ]; then
    echo "⚠️  WARNING: app directory not found"
fi

# Verify torchvision is installed in venv
echo ""
echo "🔍 Verifying packages in virtual environment..."
python3 -c "import torchvision; print(f'✅ torchvision {torchvision.__version__}')" 2>&1 || {
    echo "❌ ERROR: torchvision not properly installed in venv"
    echo ""
    echo "This might be a metadata issue. Trying to fix..."
    pip install --force-reinstall --no-deps torchvision
}

# Start the server
echo ""
echo "========================================="
echo "🎯 Starting FastAPI server..."
echo "========================================="

# Use the venv's python3 explicitly
"$DIR/python-env/bin/python3" main.py 2>&1

EXIT_CODE=$?

echo "========================================="
echo "⚠️ Backend exited with code: $EXIT_CODE"
echo "========================================="

exit $EXIT_CODE
