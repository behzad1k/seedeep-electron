#!/bin/bash

echo "🔨 Building Python backend with bundled environment..."

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

# Install dependencies
echo "📦 Installing dependencies (this may take a few minutes)..."
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    deactivate
    exit 1
fi

# Copy application files
echo "📁 Copying application files..."
cp -r app build/backend/
cp main.py build/backend/

# Copy alembic if exists
if [ -f "alembic.ini" ]; then
    cp alembic.ini build/backend/
    echo "✅ alembic.ini copied"
fi

if [ -d "alembic" ]; then
    cp -r alembic build/backend/
    echo "✅ alembic/ directory copied"
fi

# Copy .env file - create a production version
echo "📝 Creating production .env..."
cat > build/backend/.env << 'ENV_EOF'
DEBUG=false
HOST=127.0.0.1
PORT=8000
DATABASE_URL=sqlite+aiosqlite:///./seedeep.db
CONFIDENCE_THRESHOLD=0.25
IOU_THRESHOLD=0.45
MAX_DETECTIONS=100
FORCE_CPU=false
ALLOWED_ORIGINS=*
LOG_LEVEL=INFO
ENV_EOF

echo "✅ Production .env created"

# Copy model weights
echo "📦 Copying model weights..."
mkdir -p build/backend/app/models/weights

if [ -d "app/models/weights" ]; then
    PT_COUNT=$(find app/models/weights -name "*.pt" -type f | wc -l)

    if [ $PT_COUNT -gt 0 ]; then
        cp app/models/weights/*.pt build/backend/app/models/weights/ 2>/dev/null
        echo "✅ Copied $PT_COUNT model weight files"
    else
        echo "⚠️ No .pt model files found"
    fi
else
    echo "⚠️ app/models/weights/ directory not found"
fi

# Clean up Python environment for macOS code signing
echo "🧹 Cleaning Python environment for code signing..."

# Remove problematic binaries and keep only necessary ones
cd build/backend/python-env/bin

# Keep only python3 and essential scripts
for file in *; do
    if [[ "$file" != "python3" && "$file" != "python" && "$file" != "activate"* && "$file" != "pip"* ]]; then
        rm -f "$file"
    fi
done

# Remove signature from python binary to avoid signing conflicts
if [ -f "python3" ]; then
    codesign --remove-signature python3 2>/dev/null || true
fi
if [ -f "python" ]; then
    codesign --remove-signature python 2>/dev/null || true
fi

cd ../../../..

# Remove unnecessary files from site-packages
echo "🧹 Removing unnecessary files..."
find build/backend/python-env/lib -name "*.pyc" -delete
find build/backend/python-env/lib -name "*.pyo" -delete
find build/backend/python-env/lib -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find build/backend/python-env/lib -name "*.dist-info" -type d -exec rm -rf {} + 2>/dev/null || true
find build/backend/python-env/lib -name "tests" -type d -exec rm -rf {} + 2>/dev/null || true

# Create startup script for macOS
echo "📝 Creating startup script..."
cat > build/backend/start-backend << 'SCRIPT_EOF'
#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🚀 Starting SeeDeep Backend..."
echo "📂 Working directory: $DIR"

# Activate virtual environment
if [ -f "$DIR/python-env/bin/activate" ]; then
    source "$DIR/python-env/bin/activate"
    echo "✅ Virtual environment activated"
else
    echo "❌ Virtual environment not found"
    exit 1
fi

cd "$DIR"

if [ ! -f "$DIR/main.py" ]; then
    echo "❌ main.py not found"
    exit 1
fi

echo "🎯 Starting FastAPI server..."
python3 main.py

EXIT_CODE=$?
echo "⚠️ Backend exited with code: $EXIT_CODE"
exit $EXIT_CODE
SCRIPT_EOF

chmod +x build/backend/start-backend

# Create logs directory
mkdir -p build/backend/logs

# Deactivate virtual environment
deactivate

BACKEND_SIZE=$(du -sh build/backend | cut -f1)

echo ""
echo "✅ Backend bundled successfully!"
echo "📦 Location: build/backend/"
echo "💾 Size: $BACKEND_SIZE"
echo ""
echo "✅ Cleaned for macOS code signing"