@echo off
echo ========================================
echo Building Python Backend for Windows
echo ========================================

REM Detect Python
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set PYTHON_CMD=python
) else (
    where python3 >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        set PYTHON_CMD=python3
    ) else (
        echo ERROR: Python not found
        exit /b 1
    )
)

echo Using Python: %PYTHON_CMD%
%PYTHON_CMD% --version

REM Clean previous build
echo Cleaning previous build...
if exist build\backend rmdir /s /q build\backend
mkdir build\backend

REM Create virtual environment
echo Creating virtual environment...
%PYTHON_CMD% -m venv build\backend\python-env

REM Activate virtual environment
call build\backend\python-env\Scripts\activate.bat

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip

REM Install dependencies
echo Installing dependencies...
pip install -r backend\requirements.txt

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install dependencies
    deactivate
    exit /b 1
)

REM Copy application files
echo Copying application files...
xcopy /E /I /Y backend\app build\backend\app
copy /Y backend\main.py build\backend\

REM Copy alembic if exists
if exist backend\alembic.ini (
    copy /Y backend\alembic.ini build\backend\
    echo alembic.ini copied
)

if exist backend\alembic (
    xcopy /E /I /Y backend\alembic build\backend\alembic
    echo alembic\ directory copied
)

REM Create production .env
echo Creating production .env...
(
echo DEBUG=false
echo HOST=127.0.0.1
echo PORT=8000
echo DATABASE_URL=sqlite+aiosqlite:///./seedeep.db
echo CONFIDENCE_THRESHOLD=0.25
echo IOU_THRESHOLD=0.45
echo MAX_DETECTIONS=100
echo FORCE_CPU=false
echo ALLOWED_ORIGINS=*
echo LOG_LEVEL=INFO
) > build\backend\.env

echo Production .env created

REM Copy model weights
echo Copying model weights...
mkdir build\backend\app\models\weights 2>nul

if exist backend\app\models\weights (
    for %%f in (backend\app\models\weights\*.pt) do (
        copy /Y "%%f" build\backend\app\models\weights\
    )
    echo Model weights copied
) else (
    echo WARNING: backend\app\models\weights\ directory not found
)

REM Create startup script
echo Creating startup script...
(
echo @echo off
echo setlocal
echo.
echo echo =========================================
echo echo Starting SeeDeep Backend
echo echo =========================================
echo.
echo set SCRIPT_DIR=%%~dp0
echo set PYTHON_BIN=%%SCRIPT_DIR%%python-env\Scripts\python.exe
echo.
echo if not exist "%%PYTHON_BIN%%" ^(
echo     echo ERROR: Python runtime not found!
echo     pause
echo     exit /b 1
echo ^)
echo.
echo if not exist "%%SCRIPT_DIR%%main.py" ^(
echo     echo ERROR: main.py not found!
echo     pause
echo     exit /b 1
echo ^)
echo.
echo set PYTHONNOUSERSITE=1
echo set PYTHONDONTWRITEBYTECODE=1
echo.
echo cd /d "%%SCRIPT_DIR%%"
echo.
echo echo Python: %%PYTHON_BIN%%
echo echo Working directory: %%SCRIPT_DIR%%
echo echo.
echo echo =========================================
echo echo Starting Server
echo echo =========================================
echo echo.
echo.
echo "%%PYTHON_BIN%%" "%%SCRIPT_DIR%%main.py"
) > build\backend\start-backend.bat

echo Startup script created

REM Create logs directory
mkdir build\backend\logs 2>nul

REM Deactivate virtual environment
deactivate

echo.
echo =========================================
echo Backend bundled successfully!
echo =========================================
echo Location: build\backend\
echo =========================================
echo.
echo To test the backend:
echo    cd build\backend
echo    start-backend.bat
echo =========================================
