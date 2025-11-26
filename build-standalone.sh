#!/bin/bash

# SeeDeep Backend Builder with Standalone Python
# Downloads and bundles a completely independent Python runtime
# No system Python or dependencies required!

set -e

echo "🔨 Building SeeDeep Backend with Standalone Python"
echo "===================================================="
echo ""

# Configuration
PYTHON_VERSION="3.11.7"
BACKEND_DIR="build/backend"

# Detect architecture and OS
ARCH=$(uname -m)
OS=$(uname -s)

echo "📍 System Info:"
echo "   OS: $OS"
echo "   Architecture: $ARCH"
echo ""

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf build/backend
mkdir -p build/backend

# Step 1: Download standalone Python from python-build-standalone
echo "📥 Downloading standalone Python ${PYTHON_VERSION}..."

if [[ "$OS" == "Darwin" ]]; then
    if [[ "$ARCH" == "arm64" ]]; then
        # Apple Silicon (M1/M2/M3)
        PYTHON_RELEASE="cpython-3.11.7+20240107-aarch64-apple-darwin-install_only"
        PYTHON_URL="https://github.com/indygreg/python-build-standalone/releases/download/20240107/${PYTHON_RELEASE}.tar.gz"
    else
        # Intel Mac
        PYTHON_RELEASE="cpython-3.11.7+20240107-x86_64-apple-darwin-install_only"
        PYTHON_URL="https://github.com/indygreg/python-build-standalone/releases/download/20240107/${PYTHON_RELEASE}.tar.gz"
    fi
elif [[ "$OS" == "Linux" ]]; then
    if [[ "$ARCH" == "aarch64" ]]; then
        PYTHON_RELEASE="cpython-3.11.7+20240107-aarch64-unknown-linux-gnu-install_only"
        PYTHON_URL="https://github.com/indygreg/python-build-standalone/releases/download/20240107/${PYTHON_RELEASE}.tar.gz"
    else
        PYTHON_RELEASE="cpython-3.11.7+20240107-x86_64-unknown-linux-gnu-install_only"
        PYTHON_URL="https://github.com/indygreg/python-build-standalone/releases/download/20240107/${PYTHON_RELEASE}.tar.gz"
    fi
else
    echo "❌ Unsupported OS: $OS"
    exit 1
fi

echo "📦 Release: $PYTHON_RELEASE"
echo ""

# Download Python
PYTHON_ARCHIVE="/tmp/${PYTHON_RELEASE}.tar.gz"

if [ ! -f "$PYTHON_ARCHIVE" ]; then
    echo "⏬ Downloading (this may take a few minutes)..."
    curl -L "$PYTHON_URL" -o "$PYTHON_ARCHIVE"
    echo "✅ Downloaded"
else
    echo "✅ Using cached download"
fi

# Extract Python
echo "📦 Extracting standalone Python..."
mkdir -p "$BACKEND_DIR/python"
tar -xzf "$PYTHON_ARCHIVE" -C "$BACKEND_DIR/python" --strip-components=1

echo "✅ Python extracted to $BACKEND_DIR/python"
echo ""

# Verify Python works
PYTHON_BIN="$BACKEND_DIR/python/bin/python3"
if [ ! -f "$PYTHON_BIN" ]; then
    echo "❌ Python binary not found!"
    exit 1
fi

echo "🐍 Python version:"
"$PYTHON_BIN" --version
echo ""

# Step 2: Install dependencies
echo "📦 Installing Python dependencies..."

# Upgrade pip
"$PYTHON_BIN" -m pip install --upgrade pip --quiet

# Install dependencies
echo "   Installing requirements (this may take 5-10 minutes)..."
"$PYTHON_BIN" -m pip install -r requirements.txt

echo "✅ Dependencies installed"
echo ""

# Step 3: Copy application files
echo "📁 Copying application files..."
cp -r app "$BACKEND_DIR/"
cp main.py "$BACKEND_DIR/"

if [ -f "alembic.ini" ]; then
    cp alembic.ini "$BACKEND_DIR/"
    echo "   ✅ alembic.ini"
fi

if [ -d "alembic" ]; then
    cp -r alembic "$BACKEND_DIR/"
    echo "   ✅ alembic/"
fi

# Step 4: Create production .env
echo "📝 Creating production .env..."
cat > "$BACKEND_DIR/.env" << 'EOF'
# SeeDeep Production Configuration
DEBUG=false
HOST=127.0.0.1
PORT=8000

# SQLite Database (stored in user's home directory)
DATABASE_URL=sqlite+aiosqlite:///./seedeep.db

# Detection Settings
CONFIDENCE_THRESHOLD=0.25
IOU_THRESHOLD=0.45
MAX_DETECTIONS=100
FORCE_CPU=false

# CORS
ALLOWED_ORIGINS=*

# Logging
LOG_LEVEL=INFO
EOF

echo "✅ .env created"

# Step 5: Copy model weights
echo "📦 Copying model weights..."
mkdir -p "$BACKEND_DIR/app/models/weights"

if [ -d "app/models/weights" ]; then
    cp app/models/weights/*.pt "$BACKEND_DIR/app/models/weights/" 2>/dev/null || true
    PT_COUNT=$(find "$BACKEND_DIR/app/models/weights" -name "*.pt" 2>/dev/null | wc -l)
    echo "✅ Copied $PT_COUNT model files"
fi

echo ""

# Step 6: Clean up Python for distribution
echo "🧹 Optimizing Python runtime for distribution..."

# Remove test files
find "$BACKEND_DIR/python/lib" -name "test" -type d -exec rm -rf {} + 2>/dev/null || true
find "$BACKEND_DIR/python/lib" -name "tests" -type d -exec rm -rf {} + 2>/dev/null || true

# Remove __pycache__ and .pyc files
find "$BACKEND_DIR/python/lib" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find "$BACKEND_DIR/python/lib" -name "*.pyc" -delete 2>/dev/null || true
find "$BACKEND_DIR/python/lib" -name "*.pyo" -delete 2>/dev/null || true

# Remove dist-info (keep metadata but remove unnecessary files)
find "$BACKEND_DIR/python/lib" -name "*.dist-info" -type d -exec sh -c 'find "$1" -type f ! -name "METADATA" -delete' _ {} \; 2>/dev/null || true

# Remove documentation
rm -rf "$BACKEND_DIR/python/share/doc" 2>/dev/null || true
rm -rf "$BACKEND_DIR/python/share/man" 2>/dev/null || true

# Remove include files (not needed for runtime)
rm -rf "$BACKEND_DIR/python/include" 2>/dev/null || true

echo "✅ Python runtime optimized"
echo ""

# Step 7: Create standalone startup script
echo "📝 Creating startup script..."
cat > "$BACKEND_DIR/start.sh" << 'STARTUP_EOF'
#!/bin/bash
set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "========================================="
echo "🚀 SeeDeep Backend"
echo "========================================="

# Check for bundled Python
PYTHON_BIN="$SCRIPT_DIR/python/bin/python3"

if [ ! -f "$PYTHON_BIN" ]; then
    echo "❌ ERROR: Python runtime not found!"
    echo "   Expected: $PYTHON_BIN"
    exit 1
fi

# Verify main.py exists
if [ ! -f "$SCRIPT_DIR/main.py" ]; then
    echo "❌ ERROR: main.py not found!"
    exit 1
fi

# Set up clean environment
export PYTHONNOUSERSITE=1
export PYTHONDONTWRITEBYTECODE=1
unset PYTHONPATH
unset PYTHONHOME

# Change to backend directory
cd "$SCRIPT_DIR"

# Show version
echo "🐍 Python: $("$PYTHON_BIN" --version)"
echo "📂 Working directory: $SCRIPT_DIR"
echo ""

# Check for database
if [ ! -f "$SCRIPT_DIR/seedeep.db" ]; then
    echo "📊 First run - initializing database..."
fi

echo "========================================="
echo "🎯 Starting Server"
echo "========================================="
echo ""

# Start FastAPI server
exec "$PYTHON_BIN" "$SCRIPT_DIR/main.py" 2>&1
STARTUP_EOF

chmod +x "$BACKEND_DIR/start.sh"
echo "✅ start.sh created"

# Step 8: Create Windows startup script
cat > "$BACKEND_DIR/start.bat" << 'BAT_EOF'
@echo off
setlocal

echo =========================================
echo Starting SeeDeep Backend
echo =========================================

set SCRIPT_DIR=%~dp0
set PYTHON_BIN=%SCRIPT_DIR%python\python.exe

if not exist "%PYTHON_BIN%" (
    echo ERROR: Python runtime not found!
    pause
    exit /b 1
)

if not exist "%SCRIPT_DIR%main.py" (
    echo ERROR: main.py not found!
    pause
    exit /b 1
)

set PYTHONNOUSERSITE=1
set PYTHONDONTWRITEBYTECODE=1

cd /d "%SCRIPT_DIR%"

echo Python: %PYTHON_BIN%
echo Working directory: %SCRIPT_DIR%
echo.
echo =========================================
echo Starting Server
echo =========================================
echo.

"%PYTHON_BIN%" "%SCRIPT_DIR%main.py"
BAT_EOF

echo "✅ start.bat created"
echo ""

# Step 9: Create README
cat > "$BACKEND_DIR/README.md" << 'README_EOF'
# SeeDeep Backend - Standalone Edition

This is a completely self-contained backend with bundled Python runtime.

## No Installation Required!

Everything needed is included:
- ✅ Standalone Python 3.11.7
- ✅ All dependencies (PyTorch, FastAPI, etc.)
- ✅ SQLite database (no setup needed)
- ✅ Model weights

## Running the Backend

### macOS/Linux:
```bash
./start.sh
```

### Windows:
```
start.bat
```

The server will start on http://127.0.0.1:8000

## Files

- `python/` - Bundled Python runtime (standalone)
- `app/` - Backend application code
- `main.py` - FastAPI entry point
- `start.sh` - Startup script (macOS/Linux)
- `start.bat` - Startup script (Windows)
- `.env` - Configuration
- `seedeep.db` - SQLite database (created on first run)

## Configuration

Edit `.env` to change settings:
- `PORT=8000` - Server port
- `HOST=127.0.0.1` - Server host
- `DATABASE_URL` - Database location
- `LOG_LEVEL` - Logging level

## Database

SQLite database is automatically created on first run.
Location: `./seedeep.db`

## Portability

This entire folder is portable! Copy it anywhere and run.
No Python installation or dependencies needed on the target system.

## Size

~800MB (includes Python runtime and all ML dependencies)
README_EOF

echo "✅ README.md created"
echo ""

# Calculate final size
BACKEND_SIZE=$(du -sh "$BACKEND_DIR" | cut -f1)

echo "========================================="
echo "✅ Build Complete!"
echo "========================================="
echo ""
echo "📦 Location: $BACKEND_DIR"
echo "💾 Size: $BACKEND_SIZE"
echo "🏗️  Architecture: $ARCH"
echo "🐍 Python: Standalone 3.11.7 (included)"
echo "💾 Database: SQLite (included)"
echo ""
echo "📝 What's included:"
echo "   ✅ Standalone Python runtime (no system Python needed)"
echo "   ✅ All dependencies (PyTorch, FastAPI, etc.)"
echo "   ✅ SQLite database (auto-created on first run)"
echo "   ✅ Model weights"
echo "   ✅ Startup scripts for macOS/Linux/Windows"
echo ""
echo "🧪 Test the backend:"
echo "   cd $BACKEND_DIR"
echo "   ./start.sh"
echo ""
echo "🎯 Next steps:"
echo "   1. Test backend: cd $BACKEND_DIR && ./start.sh"
echo "   2. Build Electron app: npm run build:frontend && npm run electron:build:mac:unsigned"
echo "   3. The entire $BACKEND_DIR/ folder will be bundled into your app"
echo ""
echo "📦 Distribution:"
echo "   The $BACKEND_DIR/ folder is completely portable!"
echo "   Users need ZERO dependencies - just run start.sh"
echo "========================================="
