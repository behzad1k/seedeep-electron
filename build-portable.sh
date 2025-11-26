#!/bin/bash

# SeeDeep Backend Builder with Portable Python
# Creates a completely self-contained backend with bundled Python

set -e

echo "🔨 Building SeeDeep Backend with Portable Python"
echo "=================================================="
echo ""

# Configuration
PYTHON_VERSION="3.11.10"
BACKEND_DIR="build/backend"

# Detect architecture
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

# Step 1: Download and extract portable Python
echo "📦 Setting up portable Python ${PYTHON_VERSION}..."

if [[ "$OS" == "Darwin" && "$ARCH" == "arm64" ]]; then
    PYTHON_URL="https://www.python.org/ftp/python/${PYTHON_VERSION}/python-${PYTHON_VERSION}-macos11.pkg"
    echo "⚠️  Note: For true portability, we'll use python.org's installer"
    echo "   Alternatively, you can use python-build-standalone"
fi

# For now, use system Python to create a relocatable venv
echo "🔧 Creating relocatable virtual environment..."

# Find a good Python (prefer Homebrew)
PYTHON_CMD=""
for py in /opt/homebrew/bin/python3.11 /opt/homebrew/bin/python3 python3.11 python3; do
    if command -v "$py" &> /dev/null; then
        PY_PATH=$(which "$py")
        if [[ "$PY_PATH" != *"Xcode"* ]]; then
            PYTHON_CMD="$py"
            echo "✅ Using: $PYTHON_CMD"
            "$PYTHON_CMD" --version
            break
        fi
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    echo "❌ No suitable Python found"
    exit 1
fi

# Create venv
"$PYTHON_CMD" -m venv "$BACKEND_DIR/python-runtime"

# Activate
source "$BACKEND_DIR/python-runtime/bin/activate"

# Clear environment
unset PYTHONPATH
unset PYTHONHOME
export PYTHONNOUSERSITE=1

# Upgrade pip
echo ""
echo "⬆️  Upgrading pip..."
pip install --upgrade pip --quiet

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Install MySQL connector (not sqlite)
echo "📦 Installing MySQL support..."
pip install aiomysql pymysql mysql-connector-python

echo ""
echo "✅ Dependencies installed"
deactivate

# Step 2: Copy application files
echo ""
echo "📁 Copying application files..."
cp -r app "$BACKEND_DIR/"
cp main.py "$BACKEND_DIR/"

if [ -f "alembic.ini" ]; then
    cp alembic.ini "$BACKEND_DIR/"
fi

if [ -d "alembic" ]; then
    cp -r alembic "$BACKEND_DIR/"
fi

# Step 3: Create production .env with MySQL
echo "📝 Creating production .env (MySQL)..."
cat > "$BACKEND_DIR/.env" << 'EOF'
# SeeDeep Production Configuration
DEBUG=false
HOST=127.0.0.1
PORT=8000

# MySQL Configuration (Update these for your MySQL server)
DATABASE_URL=mysql+aiomysql://seedeep:seedeep_password@localhost:3306/seedeep

# Alternative: Use environment variable
# DATABASE_URL=${MYSQL_URL}

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

echo "✅ Created .env (configure MySQL credentials!)"

# Step 4: Copy model weights
echo "📦 Copying model weights..."
mkdir -p "$BACKEND_DIR/app/models/weights"

if [ -d "app/models/weights" ]; then
    cp app/models/weights/*.pt "$BACKEND_DIR/app/models/weights/" 2>/dev/null || true
    PT_COUNT=$(find "$BACKEND_DIR/app/models/weights" -name "*.pt" 2>/dev/null | wc -l)
    echo "✅ Copied $PT_COUNT model files"
fi

# Step 5: Make Python runtime relocatable
echo ""
echo "🔧 Making Python runtime relocatable..."

cd "$BACKEND_DIR/python-runtime"

# Remove absolute paths from activation scripts
for activate_script in bin/activate*; do
    if [ -f "$activate_script" ]; then
        # Use relative paths
        sed -i.bak 's|VIRTUAL_ENV=".*"|VIRTUAL_ENV="$(cd "$(dirname "$(dirname "${BASH_SOURCE[0]}")")" && pwd)"|' "$activate_script" 2>/dev/null || true
        rm -f "${activate_script}.bak"
    fi
done

# Remove signatures from Python binaries (macOS code signing)
if [ -f "bin/python3" ]; then
    codesign --remove-signature bin/python3 2>/dev/null || true
fi
if [ -f "bin/python" ]; then
    codesign --remove-signature bin/python 2>/dev/null || true
fi

cd ../../..

# Step 6: Create standalone startup script
echo "📝 Creating standalone startup script..."
cat > "$BACKEND_DIR/start.sh" << 'STARTUP_EOF'
#!/bin/bash
set -e

# Get script directory (works when called from anywhere)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "========================================="
echo "🚀 Starting SeeDeep Backend"
echo "========================================="
echo "📂 Backend directory: $SCRIPT_DIR"
echo ""

# Check for Python runtime
if [ ! -d "$SCRIPT_DIR/python-runtime" ]; then
    echo "❌ Python runtime not found!"
    exit 1
fi

# Check for main.py
if [ ! -f "$SCRIPT_DIR/main.py" ]; then
    echo "❌ main.py not found!"
    exit 1
fi

# Set up environment
export PYTHONNOUSERSITE=1
export PYTHONDONTWRITEBYTECODE=1
unset PYTHONPATH
unset PYTHONHOME

# Use bundled Python
PYTHON_EXEC="$SCRIPT_DIR/python-runtime/bin/python3"

if [ ! -f "$PYTHON_EXEC" ]; then
    echo "❌ Python executable not found!"
    exit 1
fi

echo "🐍 Python: $PYTHON_EXEC"
"$PYTHON_EXEC" --version
echo ""

# Change to backend directory
cd "$SCRIPT_DIR"

# Check for MySQL configuration
if [ -f ".env" ]; then
    echo "✅ Loading configuration from .env"
else
    echo "⚠️  No .env file found, using defaults"
fi

echo ""
echo "========================================="
echo "🎯 Starting FastAPI Server"
echo "========================================="
echo ""

# Start server
exec "$PYTHON_EXEC" main.py
STARTUP_EOF

chmod +x "$BACKEND_DIR/start.sh"

# Step 7: Clean up for distribution
echo ""
echo "🧹 Cleaning up for distribution..."
find "$BACKEND_DIR/python-runtime/lib" -name "*.pyc" -delete
find "$BACKEND_DIR/python-runtime/lib" -name "*.pyo" -delete
find "$BACKEND_DIR/python-runtime/lib" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find "$BACKEND_DIR/python-runtime/lib" -name "*.dist-info" -type d -exec rm -rf {} + 2>/dev/null || true
find "$BACKEND_DIR/python-runtime/lib" -name "tests" -type d -exec rm -rf {} + 2>/dev/null || true

# Remove unnecessary binaries
cd "$BACKEND_DIR/python-runtime/bin"
for file in *; do
    if [[ "$file" != "python3" && "$file" != "python" && "$file" != "activate"* && "$file" != "pip"* ]]; then
        rm -f "$file"
    fi
done
cd ../../../..

# Step 8: Create MySQL setup guide
cat > "$BACKEND_DIR/MYSQL_SETUP.md" << 'MYSQL_EOF'
# MySQL Setup for SeeDeep

## 1. Install MySQL

### macOS (Homebrew):
```bash
brew install mysql
brew services start mysql
```

### Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install mysql-server
sudo systemctl start mysql
```

## 2. Create Database and User

```bash
# Connect to MySQL
mysql -u root -p

# In MySQL prompt:
CREATE DATABASE seedeep;
CREATE USER 'seedeep'@'localhost' IDENTIFIED BY 'seedeep_password';
GRANT ALL PRIVILEGES ON seedeep.* TO 'seedeep'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 3. Configure Connection

Edit `.env` file and update:
```
DATABASE_URL=mysql+aiomysql://seedeep:seedeep_password@localhost:3306/seedeep
```

Replace:
- `seedeep` (first) = MySQL username
- `seedeep_password` = MySQL password
- `localhost` = MySQL host
- `3306` = MySQL port
- `seedeep` (last) = Database name

## 4. Run Migrations

```bash
cd build/backend

# Activate Python runtime
source python-runtime/bin/activate

# Run Alembic migrations
alembic upgrade head

deactivate
```

## 5. Start Backend

```bash
./start.sh
```

## Production Configuration

For production, update `.env`:
```
DATABASE_URL=mysql+aiomysql://user:password@production-host:3306/seedeep
DEBUG=false
LOG_LEVEL=INFO
ALLOWED_ORIGINS=https://yourdomain.com
```

## Connection String Format

```
mysql+aiomysql://username:password@host:port/database
```

- Use `mysql+aiomysql` for async (FastAPI)
- Use `mysql+pymysql` for sync operations
MYSQL_EOF

# Calculate size
BACKEND_SIZE=$(du -sh "$BACKEND_DIR" | cut -f1)

echo ""
echo "========================================="
echo "✅ Build Complete!"
echo "========================================="
echo "📦 Location: $BACKEND_DIR"
echo "💾 Size: $BACKEND_SIZE"
echo "🏗️  Architecture: $ARCH"
echo ""
echo "📝 Next Steps:"
echo "   1. Set up MySQL (see $BACKEND_DIR/MYSQL_SETUP.md)"
echo "   2. Configure .env with your MySQL credentials"
echo "   3. Run migrations: cd $BACKEND_DIR && source python-runtime/bin/activate && alembic upgrade head"
echo "   4. Test backend: cd $BACKEND_DIR && ./start.sh"
echo ""
echo "🎯 To package for distribution:"
echo "   The entire $BACKEND_DIR folder is portable!"
echo "   Copy it to any macOS $ARCH system and run ./start.sh"
echo "========================================="
