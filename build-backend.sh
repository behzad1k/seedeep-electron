#!/bin/bash

echo "🔨 Building Python backend with bundled environment..."
echo "📍 Architecture: $(uname -m)"
echo "📍 OS: $(uname -s)"

# Detect Python
if command -v python3.9 &> /dev/null; then
    PYTHON_CMD="python3.9"
elif command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
else
    echo "❌ Python 3 not found"
    exit 1
fi

echo "📍 Using Python: $PYTHON_CMD"
$PYTHON_CMD --version

# Check Python architecture (important for M1/M2)
PYTHON_ARCH=$($PYTHON_CMD -c "import platform; print(platform.machine())")
echo "📍 Python architecture: $PYTHON_ARCH"

if [[ "$(uname -m)" == "arm64" ]] && [[ "$PYTHON_ARCH" != "arm64" ]]; then
    echo "⚠️  WARNING: Running on ARM64 (M1/M2) but Python is $PYTHON_ARCH"
    echo "⚠️  This may cause compatibility issues. Consider installing native ARM64 Python."
fi

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf build/backend

# Create build directory structure
mkdir -p build/backend

# Create virtual environment
echo "🔧 Creating virtual environment..."
$PYTHON_CMD -m venv build/backend/python-env

# Activate virtual environment
source build/backend/python-env/bin/activate

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install dependencies from backend directory
echo "📦 Installing dependencies (this may take a few minutes)..."
pip install -r backend/requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    deactivate
    exit 1
fi

# Copy application files from backend directory
echo "📁 Copying application files..."
cp -r backend/app build/backend/
cp backend/main.py build/backend/

# Copy alembic if exists
if [ -f "backend/alembic.ini" ]; then
    cp backend/alembic.ini build/backend/
    echo "✅ alembic.ini copied"
fi

if [ -d "backend/alembic" ]; then
    cp -r backend/alembic build/backend/
    echo "✅ alembic/ directory copied"
fi

# Copy .env file - create a production version
echo "📝 Creating production .env..."
cat > build/backend/.env << 'ENV_EOF'
DEBUG=false
HOST=127.0.0.1
PORT=8000
MODEL_FORMAT=onnx
DATABASE_URL=sqlite+aiosqlite:///./seedeep.db
CONFIDENCE_THRESHOLD=0.25
IOU_THRESHOLD=0.45
MAX_DETECTIONS=100
FORCE_CPU=false
ALLOWED_ORIGINS=*
LOG_LEVEL=INFO
SMTP_USE_TLS=true
SMTP_FROM_NAME=SeeDeep.AI Alerts
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=behzadkoohyani@gmail.com
SMTP_PASSWORD=vkoq iyvb wkjd gieg
SMTP_FROM_EMAIL=noreply@swgz.com
ENV_EOF

echo "✅ Production .env created"

# Copy model weights
echo "📦 Copying model weights..."
mkdir -p build/backend/app/models/weights

if [ -d "backend/app/models/weights" ]; then
    PT_COUNT=$(find backend/app/models/weights -name "*.pt" -type f | wc -l)

    if [ $PT_COUNT -gt 0 ]; then
        cp backend/app/models/weights/*.pt build/backend/app/models/weights/ 2>/dev/null
        echo "✅ Copied $PT_COUNT model weight files"
    else
        echo "⚠️ No .pt model files found"
    fi
else
    echo "⚠️ backend/app/models/weights/ directory not found"
fi

# Clean up Python environment for macOS code signing
echo "🧹 Cleaning Python environment for code signing..."

# Remove problematic binaries and keep only necessary ones
cd build/backend/python-env/bin

# Keep only python3 and essential scripts
# for file in *; do
#     if [[ "$file" != "python3" && "$file" != "python" && "$file" != "activate"* && "$file" != "pip"* ]]; then
#         rm -f "$file"
#     fi
# done

# Remove signature from python binary to avoid signing conflicts
if [ -f "python3" ]; then
    codesign --remove-signature python3 2>/dev/null || true
    echo "✅ Removed signature from python3"
fi
if [ -f "python" ]; then
    codesign --remove-signature python 2>/dev/null || true
    echo "✅ Removed signature from python"
fi

cd ../../../..

# Remove unnecessary files from site-packages
echo "🧹 Removing unnecessary files..."
# find build/backend/python-env/lib -name "*.pyc" -delete
# find build/backend/python-env/lib -name "*.pyo" -delete
# find build/backend/python-env/lib -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
# find build/backend/python-env/lib -name "*.dist-info" -type d -exec rm -rf {} + 2>/dev/null || true
# find build/backend/python-env/lib -name "tests" -type d -exec rm -rf {} + 2>/dev/null || true

# Create startup script (unchanged - stays the same)
echo "📝 Creating startup script..."
cat > build/backend/start-backend << 'SCRIPT_EOF'
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

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source "$DIR/python-env/bin/activate"

if [ $? -ne 0 ]; then
    echo "❌ ERROR: Failed to activate virtual environment"
    exit 1
fi

echo "✅ Virtual environment activated"

# Check Python
which python3
python3 --version
echo "🐍 Python architecture: $(python3 -c 'import platform; print(platform.machine())')"

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

# Start the server
echo "========================================="
echo "🎯 Starting FastAPI server..."
echo "========================================="

python3 main.py 2>&1

EXIT_CODE=$?

echo "========================================="
echo "⚠️ Backend exited with code: $EXIT_CODE"
echo "========================================="

exit $EXIT_CODE
SCRIPT_EOF

chmod +x build/backend/start-backend
echo "✅ Made start-backend executable"

# Verify the script was created correctly
if [ ! -f "build/backend/start-backend" ]; then
    echo "❌ ERROR: Failed to create start-backend script"
    exit 1
fi

echo "✅ Verified start-backend exists"

# Create logs directory
mkdir -p build/backend/logs

# Deactivate virtual environment
deactivate

BACKEND_SIZE=$(du -sh build/backend | cut -f1)

echo ""
echo "========================================="
echo "✅ Backend bundled successfully!"
echo "========================================="
echo "📦 Location: build/backend/"
echo "💾 Size: $BACKEND_SIZE"
echo "🏗️  Architecture: $(uname -m)"
echo "✅ Cleaned for macOS code signing"
echo "========================================="
echo ""
echo "🧪 To test the backend:"
echo "   cd build/backend"
echo "   ./start-backend"
echo "========================================="
