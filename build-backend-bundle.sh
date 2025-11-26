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

# Clean previous build
rm -rf build/backend

# Create build directory structure
mkdir -p build/backend

# Create virtual environment
echo "🔧 Creating virtual environment..."
$PYTHON_CMD -m venv build/backend/python-env

# Activate virtual environment
source build/backend/python-env/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Copy application files
echo "📁 Copying application files..."
cp -r app build/backend/
cp main.py build/backend/
cp alembic.ini build/backend/ 2>/dev/null || true
cp -r alembic build/backend/ 2>/dev/null || true

# Copy .env file if it exists
if [ -f ".env" ]; then
    cp .env build/backend/
    echo "✅ .env file copied"
fi

# Copy model weights
echo "📦 Copying model weights..."
mkdir -p build/backend/app/models/weights
if [ -d "app/models/weights" ]; then
    cp -r app/models/weights/* build/backend/app/models/weights/ 2>/dev/null || true
    echo "✅ Model weights copied"
fi

# Create startup script for macOS
cat > build/backend/start-backend << 'EOF'
#!/bin/bash
# Get the directory where this script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Activate virtual environment
source "$DIR/python-env/bin/activate"

# Change to backend directory
cd "$DIR"

# Start the backend
exec python main.py
EOF

chmod +x build/backend/start-backend

# Deactivate virtual environment
deactivate

echo "✅ Backend bundled successfully at build/backend/"
echo "📦 Bundle includes:"
echo "   - Python virtual environment"
echo "   - All dependencies"
echo "   - Application code"
echo "   - Model weights"
echo "   - Startup script: start-backend"
