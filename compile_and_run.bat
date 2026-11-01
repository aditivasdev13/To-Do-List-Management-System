@echo off
cd /d "%~dp0"
echo ==========================================================
echo        To-Do List Management System (C++ Runner)
echo ==========================================================
echo.

where g++ >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] C++ Compiler (g++) was not found on your system PATH.
    echo.
    echo  To compile and run C++ files on Windows, you can:
    echo    1. Install MinGW-w64 via Windows Package Manager:
    echo         winget install -e --id MSYS2.MSYS2
    echo    2. OR use the modern Web Edition right away:
    echo         Double click "open_webpage.bat" or open "index.html"
    echo.
    pause
    exit /b 1
)

echo [*] Compiling todo.cpp with g++...
g++ -std=c++11 -o todo.exe todo.cpp

if %errorlevel% equ 0 (
    echo [+] Compilation succeeded! Launching todo.exe...
    echo.
    todo.exe
) else (
    echo [-] Compilation failed. Please check errors above.
    pause
)
